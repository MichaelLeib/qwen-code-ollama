/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  FinishReason,
  Part,
  Content,
} from '@google/genai';
import { ContentGenerator } from './contentGenerator.js';
import { Config } from '../config/config.js';
import { OllamaService, OllamaMessage } from '../services/ollamaService.js';
import { logApiResponse } from '../telemetry/loggers.js';
import { ApiResponseEvent } from '../telemetry/types.js';

export class OllamaContentGenerator implements ContentGenerator {
  private ollamaService: OllamaService;
  private model: string;
  private config: Config;

  constructor(endpoint: string, model: string, config: Config) {
    this.model = model;
    this.config = config;
    
    // Create service with default max retries
    const maxRetries = 3;
    this.ollamaService = new OllamaService(maxRetries);
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const startTime = Date.now();
    
    try {
      // Convert Gemini format to Ollama format  
      const contents = this.normalizeContents(request.contents);
      const messages = this.convertToOllamaMessages(contents);
      
      // Add system prompt if provided
      if (request.config?.systemInstruction) {
        const systemText = typeof request.config.systemInstruction === 'string' 
          ? request.config.systemInstruction
          : this.extractTextFromContent(request.config.systemInstruction as Content);
        messages.unshift({
          role: 'system',
          content: systemText,
        });
      }

      // Prepare options from config params
      const options: Record<string, unknown> = {};
      // Get parameters from config (only direct config properties available)
      if (request.config?.temperature !== undefined) options.temperature = request.config.temperature;
      if (request.config?.topP !== undefined) options.top_p = request.config.topP;
      if (request.config?.topK !== undefined) options.top_k = request.config.topK;
      if (request.config?.maxOutputTokens !== undefined) options.num_predict = request.config.maxOutputTokens;
      if (request.config?.stopSequences) options.stop = request.config.stopSequences;

      // Handle tools if provided
      let toolInstructions = '';
      if (request.config?.tools && request.config.tools.length > 0) {
        toolInstructions = this.generateToolInstructions(request.config.tools as Array<Record<string, unknown>>);
        if (toolInstructions) {
          // Add tool instructions as a system message
          messages.unshift({
            role: 'system',
            content: toolInstructions,
          });
        }
      }

      // Make the API call
      const response = await this.ollamaService.generateResponse({
        model: this.model,
        messages,
        stream: false,
        options,
      });

      // Validate response integrity
      this.validateGenerationResponse(response as unknown as Record<string, unknown>);

      // Convert response back to Gemini format
      const generateContentResponse = new GenerateContentResponse();
      
      // Parse potential function calls from response
      const processedResponse = this.processFunctionCallResponse(response.message?.content || '');
      
      generateContentResponse.candidates = [{
        content: {
          role: 'model' as const,
          parts: processedResponse.parts,
        },
        finishReason: this.mapFinishReason(response.done),
        index: 0,
        safetyRatings: [],
      }];

      generateContentResponse.modelVersion = this.model;
      generateContentResponse.promptFeedback = { safetyRatings: [] };
      generateContentResponse.usageMetadata = {
        promptTokenCount: response.prompt_eval_count || 0,
        candidatesTokenCount: response.eval_count || 0,
        totalTokenCount: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      };

      // Log API response
      const responseTime = Date.now() - startTime;
      const event = new ApiResponseEvent(
        this.model,
        responseTime,
        `ollama-${Date.now()}`,
        'ollama' as const, // AuthType
        generateContentResponse.usageMetadata,
      );
      logApiResponse(this.config, event);

      return generateContentResponse;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const generator = this.createStreamGenerator(request);
    return generator;
  }

  private async *createStreamGenerator(
    request: GenerateContentParameters,
  ): AsyncGenerator<GenerateContentResponse> {
    const startTime = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // Convert to Ollama format
      const contents = this.normalizeContents(request.contents);
      const messages = this.convertToOllamaMessages(contents);
      
      // Add system prompt if provided
      if (request.config?.systemInstruction) {
        const systemText = typeof request.config.systemInstruction === 'string' 
          ? request.config.systemInstruction
          : this.extractTextFromContent(request.config.systemInstruction as Content);
        messages.unshift({
          role: 'system',
          content: systemText,
        });
      }

      // Prepare options
      const options: Record<string, unknown> = {};
      // Get parameters from config (only direct config properties available)
      if (request.config?.temperature !== undefined) options.temperature = request.config.temperature;
      if (request.config?.topP !== undefined) options.top_p = request.config.topP;
      if (request.config?.topK !== undefined) options.top_k = request.config.topK;
      if (request.config?.maxOutputTokens !== undefined) options.num_predict = request.config.maxOutputTokens;

      // Stream the response
      const stream = this.ollamaService.generateResponseStream({
        model: this.model,
        messages,
        stream: true,
        options,
      });

      for await (const chunk of stream) {
        // Process chunk content for streaming response

        // Update token counts if available
        if (chunk.prompt_eval_count) {
          promptTokens = chunk.prompt_eval_count;
        }
        if (chunk.eval_count) {
          completionTokens = chunk.eval_count;
        }

        // Validate streaming chunk
        this.validateStreamingChunk(chunk as unknown as Record<string, unknown>);

        // Yield intermediate response
        const streamResponse = new GenerateContentResponse();
        
        streamResponse.candidates = [{
          content: {
            role: 'model' as const,
            parts: [{ text: chunk.message?.content || '' }],
          },
          finishReason: chunk.done ? this.mapFinishReason(chunk.done) : undefined,
          index: 0,
          safetyRatings: [],
        }];

        streamResponse.modelVersion = this.model;
        streamResponse.promptFeedback = { safetyRatings: [] };
        if (chunk.done) {
          streamResponse.usageMetadata = {
            promptTokenCount: promptTokens,
            candidatesTokenCount: completionTokens,
            totalTokenCount: promptTokens + completionTokens,
          };
        }

        yield streamResponse;

        // Log final response
        if (chunk.done) {
          const responseTime = Date.now() - startTime;
          const event = new ApiResponseEvent(
            this.model,
            responseTime,
            `ollama-stream-${Date.now()}`,
            'ollama' as const, // AuthType
            streamResponse.usageMetadata,
          );
          logApiResponse(this.config, event);
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw new Error(`Failed to stream content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // Ollama doesn't have a dedicated token counting endpoint
    // We'll estimate based on character count (rough approximation)
    const contents = this.normalizeContents(request.contents);
    const text = this.extractAllText(contents);
    const estimatedTokens = Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters

    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    try {
      // Extract text from content
      const contents = this.normalizeContents(request.contents);
      const text = this.extractAllText(contents);
      
      // Generate embedding
      const embedding = await this.ollamaService.generateEmbedding(
        this.model,
        text,
      );

      return {
        embeddings: [{
          values: embedding,
        }],
      };
    } catch (error) {
      console.error('Ollama embedding error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertToOllamaMessages(contents: Content[]): OllamaMessage[] {
    const messages: OllamaMessage[] = [];
    
    for (const content of contents) {
      const role = this.mapGeminiRoleToOllama((content.role as string) || 'user');
      const processedContent = this.processContentParts(content);
      
      // Split content if it contains both text and function calls
      if (processedContent.textContent && processedContent.functionCalls.length > 0) {
        // Add text message first
        if (processedContent.textContent.trim()) {
          messages.push({
            role,
            content: processedContent.textContent.trim(),
          });
        }
        
        // Add function calls as separate messages with context
        for (const funcCall of processedContent.functionCalls) {
          messages.push({
            role,
            content: `Function call: ${funcCall.name}(${JSON.stringify(funcCall.args)})`,
          });
        }
      } else if (processedContent.functionResponses.length > 0) {
        // Handle function responses
        for (const funcResponse of processedContent.functionResponses) {
          messages.push({
            role,
            content: `Function response: ${JSON.stringify(funcResponse.response)}`,
          });
        }
      } else {
        // Regular text content
        messages.push({
          role,
          content: processedContent.textContent || '',
        });
      }
    }
    
    return messages;
  }

  private mapGeminiRoleToOllama(role: string): 'user' | 'assistant' | 'system' {
    switch (role) {
      case 'model': return 'assistant';
      case 'system': return 'system';
      case 'user': 
      default: return 'user';
    }
  }

  private processContentParts(content: Content): {
    textContent: string;
    functionCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }>;
    functionResponses: Array<{ response: unknown; name?: string }>;
  } {
    const result = {
      textContent: '',
      functionCalls: [] as Array<{ name: string; args: Record<string, unknown>; id?: string }>,
      functionResponses: [] as Array<{ response: unknown; name?: string }>,
    };

    if (!content.parts) return result;

    const textParts: string[] = [];

    for (const part of content.parts) {
      if ('text' in part && part.text) {
        textParts.push(part.text);
      } else if ('functionCall' in part && part.functionCall) {
        result.functionCalls.push({
          name: part.functionCall.name || 'unknown_function',
          args: part.functionCall.args || {},
          id: part.functionCall.id,
        });
      } else if ('functionResponse' in part && part.functionResponse) {
        result.functionResponses.push({
          response: part.functionResponse.response,
          name: part.functionResponse.name,
        });
      } else if ('inlineData' in part && part.inlineData) {
        // Handle inline data (base64 encoded content like images)
        textParts.push(`[Inline data: ${part.inlineData.mimeType}]`);
      } else if ('fileData' in part && part.fileData) {
        // Handle file references
        textParts.push(`[File: ${part.fileData.fileUri}]`);
      }
    }

    result.textContent = textParts.join(' ').trim();
    return result;
  }

  private normalizeContents(contents: unknown): Content[] {
    if (Array.isArray(contents)) {
      // Check if it's an array of Content objects or PartUnion
      if (contents.length > 0 && typeof contents[0] === 'object' && 'role' in contents[0]) {
        return contents as Content[];
      } else {
        // It's an array of parts, wrap in a single user content
        return [{
          role: 'user',
          parts: contents,
        }];
      }
    } else if (typeof contents === 'string') {
      return [{
        role: 'user',
        parts: [{ text: contents }],
      }];
    } else {
      // Single content object
      return [contents as Content];
    }
  }

  private extractTextFromContent(content: Content): string {
    if (!content.parts) return '';
    return content.parts
      .map((part) => {
        if ('text' in part) {
          return part.text;
        } else if ('functionCall' in part && part.functionCall) {
          return `Function call: ${part.functionCall.name}(${JSON.stringify(part.functionCall.args)})`;
        } else if ('functionResponse' in part && part.functionResponse) {
          return `Function response: ${JSON.stringify(part.functionResponse.response)}`;
        }
        return '';
      })
      .join('');
  }

  private extractAllText(contents: Content[]): string {
    return contents.map((content) => this.extractTextFromContent(content)).join(' ');
  }

  private mapFinishReason(done: boolean): FinishReason {
    // Ollama doesn't provide detailed finish reasons
    // We'll default to STOP when done
    return done ? FinishReason.STOP : FinishReason.OTHER;
  }

  /**
   * Generate tool instructions for Ollama to simulate function calling
   */
  private generateToolInstructions(tools: Array<Record<string, unknown>>): string {
    if (!tools || tools.length === 0) return '';

    const instructions = [
      'You have access to the following functions. When you need to call a function, respond with a structured function call in this exact format:',
      '',
      'FUNCTION_CALL:',
      '{"name": "function_name", "arguments": {"param1": "value1", "param2": "value2"}}',
      '',
      'Available functions:',
    ];

    for (const tool of tools) {
      if (tool.functionDeclarations && Array.isArray(tool.functionDeclarations)) {
        for (const func of tool.functionDeclarations as Array<Record<string, unknown>>) {
          instructions.push(`• ${func.name as string}: ${(func.description as string) || 'No description'}`);
          if (func.parameters && typeof func.parameters === 'object' && func.parameters !== null) {
            const parameters = func.parameters as Record<string, unknown>;
            if (parameters.properties && typeof parameters.properties === 'object') {
              const params = Object.keys(parameters.properties as Record<string, unknown>);
              instructions.push(`  Parameters: ${params.join(', ')}`);
            }
          }
        }
      }
    }

    instructions.push('');
    instructions.push('Always use the exact FUNCTION_CALL format above when calling functions.');
    
    return instructions.join('\n');
  }

  /**
   * Validate streaming chunk from Ollama API
   */
  private validateStreamingChunk(chunk: Record<string, unknown>): void {
    if (!chunk || typeof chunk !== 'object') {
      throw new Error('Invalid streaming chunk: Not an object');
    }

    if (!('done' in chunk)) {
      throw new Error('Invalid streaming chunk: Missing "done" field');
    }

    if (chunk.message) {
      if (typeof chunk.message !== 'object') {
        throw new Error('Invalid streaming chunk: Message is not an object');
      }

      const message = chunk.message as Record<string, unknown>;
      if (message.role && !['user', 'assistant', 'system'].includes(message.role as string)) {
        throw new Error(`Invalid streaming chunk: Invalid message role "${message.role}"`);
      }

      if (message.content !== undefined && typeof message.content !== 'string') {
        throw new Error('Invalid streaming chunk: Message content must be a string');
      }

      // Check for corrupted chunks (common streaming issues)
      if (message.content && typeof message.content === 'string' && message.content.includes('\0')) {
        throw new Error('Invalid streaming chunk: Contains null bytes (corrupted)');
      }
    }
  }

  /**
   * Validate generation response from Ollama API
   */
  private validateGenerationResponse(response: Record<string, unknown>): void {
    // Basic structure validation
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response: Response is not an object');
    }

    if (!('done' in response)) {
      throw new Error('Invalid response: Missing "done" field');
    }

    // Validate message structure
    if (response.message) {
      if (typeof response.message !== 'object') {
        throw new Error('Invalid response: Message is not an object');
      }

      const message = response.message as Record<string, unknown>;
      if (!message.role || typeof message.role !== 'string') {
        throw new Error('Invalid response: Message missing or invalid role');
      }

      if (!['user', 'assistant', 'system'].includes(message.role)) {
        throw new Error(`Invalid response: Invalid message role "${message.role}"`);
      }

      if (message.content !== undefined && typeof message.content !== 'string') {
        throw new Error('Invalid response: Message content must be a string');
      }
    }

    // Validate metrics if present
    if (response.prompt_eval_count !== undefined && 
        (typeof response.prompt_eval_count !== 'number' || response.prompt_eval_count < 0)) {
      throw new Error('Invalid response: prompt_eval_count must be a non-negative number');
    }

    if (response.eval_count !== undefined && 
        (typeof response.eval_count !== 'number' || response.eval_count < 0)) {
      throw new Error('Invalid response: eval_count must be a non-negative number');
    }

    // Validate durations if present
    const durationFields = ['total_duration', 'load_duration', 'prompt_eval_duration', 'eval_duration'];
    for (const field of durationFields) {
      if (response[field] !== undefined && 
          (typeof response[field] !== 'number' || response[field] < 0)) {
        throw new Error(`Invalid response: ${field} must be a non-negative number`);
      }
    }

    // Check for reasonable content length (not too long or empty when expected)
    if (response.done && response.message) {
      const message = response.message as Record<string, unknown>;
      if (!message.content || (typeof message.content === 'string' && message.content.trim().length === 0)) {
        console.warn('Warning: Received empty content from Ollama for completed response');
      }
      
      if (message.content && typeof message.content === 'string' && message.content.length > 100000) {
        console.warn('Warning: Received unusually long response from Ollama:', message.content.length, 'characters');
      }
    }
  }

  /**
   * Process Ollama response to extract function calls
   */
  private processFunctionCallResponse(content: string): { parts: Part[] } {
    const parts: Part[] = [];
    const lines = content.split('\n');
    let currentText = '';
    let inFunctionCall = false;
    let functionCallBuffer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'FUNCTION_CALL:') {
        // Save any text before function call
        if (currentText.trim()) {
          parts.push({ text: currentText.trim() });
          currentText = '';
        }
        inFunctionCall = true;
        functionCallBuffer = '';
      } else if (inFunctionCall) {
        functionCallBuffer += line;
        
        // Try to parse as JSON
        try {
          const funcCall = JSON.parse(functionCallBuffer);
          if (funcCall.name && funcCall.arguments) {
            parts.push({
              functionCall: {
                name: funcCall.name,
                args: funcCall.arguments,
                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              },
            });
            inFunctionCall = false;
            functionCallBuffer = '';
          }
        } catch (_e) {
          // Continue accumulating if not valid JSON yet
          if (functionCallBuffer.length > 1000) {
            // Give up if too long, treat as regular text
            currentText += 'FUNCTION_CALL:\n' + functionCallBuffer;
            inFunctionCall = false;
            functionCallBuffer = '';
          }
        }
      } else {
        currentText += line + '\n';
      }
    }

    // Add any remaining text
    if (currentText.trim()) {
      parts.push({ text: currentText.trim() });
    }

    // If we were still in a function call, treat it as text
    if (inFunctionCall && functionCallBuffer) {
      parts.push({ text: `FUNCTION_CALL:\n${functionCallBuffer}` });
    }

    // Return at least one part
    return {
      parts: parts.length > 0 ? parts : [{ text: content }],
    };
  }
}