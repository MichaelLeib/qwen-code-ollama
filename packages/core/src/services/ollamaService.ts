/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getEffectiveOllamaSettings, OllamaSettings } from '../config/ollamaSettings.js';

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaGenerateRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  keep_alive?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
    seed?: number;
    num_ctx?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  message?: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbedResponse {
  embedding: number[];
}

export class OllamaService {
  private settings: OllamaSettings;
  private maxRetries: number;

  constructor(maxRetries: number = 3) {
    this.settings = getEffectiveOllamaSettings();
    this.maxRetries = maxRetries;
  }

  // Allow runtime settings updates
  updateSettings(newSettings?: Partial<OllamaSettings>) {
    if (newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    } else {
      this.settings = getEffectiveOllamaSettings();
    }
  }

  getSettings(): OllamaSettings {
    return { ...this.settings };
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<boolean> {
    try {
      const endpoint = this.settings.endpoint.replace(/\/$/, '');
      const response = await this.fetchWithRetry(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for connection test
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getAvailableModels(): Promise<OllamaModel[]> {
    const endpoint = this.settings.endpoint.replace(/\/$/, '');
    const response = await this.fetchWithRetry(`${endpoint}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  /**
   * Generate response using chat endpoint
   */
  async generateResponse(
    request: OllamaGenerateRequest,
  ): Promise<OllamaGenerateResponse> {
    try {
      // Apply settings to request
      const enrichedRequest = this.applySettingsToRequest(request);
      this.validateRequest(enrichedRequest);
      
      const endpoint = this.settings.endpoint.replace(/\/$/, '');
      const response = await this.fetchWithRetry(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...enrichedRequest, stream: false }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(this.parseOllamaError(response.status, errorText));
      }

      const data = await response.json();
      this.validateResponse(data);
      return data;
    } catch (error) {
      throw this.enhanceError(error as Error, 'generateResponse');
    }
  }

  /**
   * Validate request format before sending
   */
  private validateRequest(request: OllamaGenerateRequest): void {
    if (!request.model || typeof request.model !== 'string') {
      throw new Error('Invalid request: model name is required and must be a string');
    }

    if (!request.messages || !Array.isArray(request.messages)) {
      throw new Error('Invalid request: messages must be an array');
    }

    if (request.messages.length === 0) {
      throw new Error('Invalid request: messages array cannot be empty');
    }

    // Validate each message
    for (let i = 0; i < request.messages.length; i++) {
      const msg = request.messages[i];
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error(`Invalid request: message ${i} has invalid role "${msg.role}"`);
      }
      if (typeof msg.content !== 'string') {
        throw new Error(`Invalid request: message ${i} content must be a string`);
      }
    }
  }

  /**
   * Validate response format from Ollama
   */
  private validateResponse(data: Record<string, unknown>): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response: not a JSON object');
    }

    if (!('done' in data)) {
      throw new Error('Invalid response: missing "done" field');
    }

    if (data.message && typeof data.message !== 'object') {
      throw new Error('Invalid response: message field is not an object');
    }

    if (data.message && typeof data.message === 'object') {
      const message = data.message as Record<string, unknown>;
      if (message.role && !['user', 'assistant', 'system'].includes(message.role as string)) {
        throw new Error(`Invalid response: invalid message role "${message.role}"`);
      }
    }
  }

  /**
   * Apply settings to request
   */
  private applySettingsToRequest(request: OllamaGenerateRequest): OllamaGenerateRequest {
    const enrichedRequest: OllamaGenerateRequest = {
      ...request,
      model: request.model || this.settings.model,
      options: {
        ...request.options,
        num_ctx: request.options?.num_ctx || this.settings.contextSize,
        temperature: request.options?.temperature ?? this.settings.temperature,
        top_p: request.options?.top_p ?? this.settings.topP,
      },
      keep_alive: request.keep_alive || this.settings.keepAlive,
    };

    // Add system prompt if configured and not already present
    if (this.settings.systemPrompt && 
        (!request.messages || !request.messages.some(m => m.role === 'system'))) {
      enrichedRequest.messages = [
        { role: 'system', content: this.settings.systemPrompt },
        ...(request.messages || [])
      ];
    }

    return enrichedRequest;
  }

  /**
   * Parse Ollama API errors into user-friendly messages
   */
  private parseOllamaError(status: number, errorText: string): string {
    switch (status) {
      case 400:
        if (errorText.includes('model')) {
          return `Model error: ${errorText}. Check if the model exists with 'ollama list'`;
        }
        return `Bad request: ${errorText}`;
      case 404:
        if (errorText.includes('model') || errorText.includes('not found')) {
          return `Model not found. Install it with: ollama pull <model-name>`;
        }
        return `Not found: ${errorText}`;
      case 500:
        return `Ollama server error: ${errorText}. Try restarting Ollama service`;
      case 503:
        return `Ollama service unavailable: ${errorText}. Check if Ollama is running`;
      default:
        return `Ollama API error (${status}): ${errorText}`;
    }
  }

  /**
   * Enhance errors with context and troubleshooting info
   */
  private enhanceError(error: Error, operation: string): Error {
    const contextualMessage = `${operation} failed: ${error.message}`;
    
    // Add troubleshooting hints based on error type
    if (error.message.includes('ECONNREFUSED')) {
      return new Error(`${contextualMessage}\n\nTroubleshooting:\n• Start Ollama: ollama serve\n• Check endpoint: ${this.settings.endpoint}`);
    }
    
    if (error.message.includes('timeout')) {
      return new Error(`${contextualMessage}\n\nTroubleshooting:\n• Increase timeout\n• Check network connection\n• Verify Ollama is responding`);
    }
    
    if (error.message.includes('model')) {
      return new Error(`${contextualMessage}\n\nTroubleshooting:\n• List models: ollama list\n• Pull model: ollama pull <model-name>`);
    }
    
    return new Error(contextualMessage);
  }

  /**
   * Generate streaming response using chat endpoint
   */
  async *generateResponseStream(
    request: OllamaGenerateRequest,
  ): AsyncGenerator<OllamaGenerateResponse> {
    // Apply settings to request
    const enrichedRequest = this.applySettingsToRequest(request);
    this.validateRequest(enrichedRequest);
    
    const endpoint = this.settings.endpoint.replace(/\/$/, '');
    const response = await this.fetchWithRetry(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...enrichedRequest, stream: this.settings.streamResponse }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        totalBytes += chunk.length;
        chunkCount++;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            try {
              const data = this.validateAndParseStreamChunk(trimmedLine, chunkCount);
              if (data) {
                yield data;
              }
            } catch (e) {
              console.error(`Failed to parse streaming chunk ${chunkCount}:`, e, 'Line:', trimmedLine);
              // Continue processing other chunks instead of failing completely
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const data = this.validateAndParseStreamChunk(buffer.trim(), chunkCount);
          if (data) {
            yield data;
          }
        } catch (e) {
          console.error('Failed to parse final streaming chunk:', e, 'Buffer:', buffer);
        }
      }

      // Log streaming statistics in debug mode
      if (process.env.DEBUG_OLLAMA) {
        console.log(`Ollama stream completed: ${chunkCount} chunks, ${totalBytes} bytes`);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Validate and parse individual stream chunk
   */
  private validateAndParseStreamChunk(line: string, chunkIndex: number): OllamaGenerateResponse | null {
    try {
      const data = JSON.parse(line);
      
      // Validate chunk structure
      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid chunk: not an object');
      }

      // Ensure required fields exist
      if (!('done' in data)) {
        throw new Error('Invalid chunk: missing "done" field');
      }

      // Validate message structure if present
      if (data.message && typeof data.message !== 'object') {
        throw new Error('Invalid chunk: message is not an object');
      }

      // Add chunk metadata for debugging
      if (process.env.DEBUG_OLLAMA) {
        (data as Record<string, unknown>)._chunkIndex = chunkIndex;
        (data as Record<string, unknown>)._timestamp = Date.now();
      }

      return data as OllamaGenerateResponse;
    } catch (e) {
      // Enhance error with context
      const error = e as Error;
      throw new Error(`Chunk ${chunkIndex} parse error: ${error.message}`);
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(
    model: string,
    prompt: string,
  ): Promise<number[]> {
    const endpoint = this.settings.endpoint.replace(/\/$/, '');
    const response = await this.fetchWithRetry(`${endpoint}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data: OllamaEmbedResponse = await response.json();
    return data.embedding;
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.settings.timeout);

        const response = await fetch(url, {
          ...options,
          signal: options.signal || controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on abort
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }

  /**
   * Convert messages from Gemini format to Ollama format
   */
  static convertGeminiToOllamaMessages(
    messages: Array<{ role: string; parts: Array<{ text: string }> }>,
  ): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : msg.role as 'user' | 'system',
      content: msg.parts.map((part) => part.text).join(''),
    }));
  }

  /**
   * Convert Ollama response to Gemini format
   */
  static convertOllamaToGeminiResponse(
    ollamaResponse: OllamaGenerateResponse,
  ): { role: string; parts: Array<{ text: string }> } {
    return {
      role: 'model',
      parts: [{ text: ollamaResponse.message?.content || '' }],
    };
  }
}