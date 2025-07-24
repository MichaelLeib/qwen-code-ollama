/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface OllamaSettings {
  endpoint: string;
  model: string;
  contextSize: number;
  timeout: number;
  temperature: number;
  topP: number;
  streamResponse: boolean;
  keepAlive: string;
  systemPrompt?: string;
}

export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  endpoint: 'http://localhost:11434',
  model: 'llama3.2:latest',
  contextSize: 4096,
  timeout: 30000, // 30 seconds
  temperature: 0.7,
  topP: 0.9,
  streamResponse: true,
  keepAlive: '5m',
  systemPrompt: undefined,
};

// Settings file path
const getSettingsPath = (): string => {
  const homeDir = homedir();
  const qwenDir = join(homeDir, '.qwen');
  return join(qwenDir, 'ollama-settings.json');
};

// Export settings path for external use
export const getOllamaSettingsPath = (): string => getSettingsPath();

// Ensure settings directory exists
const ensureSettingsDirectory = (): void => {
  const settingsPath = getSettingsPath();
  const settingsDir = dirname(settingsPath);
  
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }
};

// Load settings from file
export const loadOllamaSettings = (): OllamaSettings => {
  const settingsPath = getSettingsPath();
  
  if (!existsSync(settingsPath)) {
    return { ...DEFAULT_OLLAMA_SETTINGS };
  }
  
  try {
    const content = readFileSync(settingsPath, 'utf-8');
    const savedSettings = JSON.parse(content) as Partial<OllamaSettings>;
    
    // Merge with defaults to ensure all required fields are present
    return {
      ...DEFAULT_OLLAMA_SETTINGS,
      ...savedSettings,
    };
  } catch (error) {
    console.warn(`Failed to load Ollama settings: ${error}`);
    return { ...DEFAULT_OLLAMA_SETTINGS };
  }
};

// Save settings to file
export const saveOllamaSettings = (settings: OllamaSettings): boolean => {
  try {
    ensureSettingsDirectory();
    const settingsPath = getSettingsPath();
    const content = JSON.stringify(settings, null, 2);
    writeFileSync(settingsPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Failed to save Ollama settings: ${error}`);
    return false;
  }
};

// Get settings with environment variable overrides
export const getEffectiveOllamaSettings = (): OllamaSettings => {
  const settings = loadOllamaSettings();
  
  // Override with environment variables if set
  if (process.env.OLLAMA_ENDPOINT) {
    settings.endpoint = process.env.OLLAMA_ENDPOINT;
  }
  
  if (process.env.OLLAMA_MODEL) {
    settings.model = process.env.OLLAMA_MODEL;
  }
  
  if (process.env.OLLAMA_CONTEXT_SIZE) {
    const contextSize = parseInt(process.env.OLLAMA_CONTEXT_SIZE, 10);
    if (!isNaN(contextSize) && contextSize > 0) {
      settings.contextSize = contextSize;
    }
  }
  
  if (process.env.OLLAMA_TIMEOUT) {
    const timeout = parseInt(process.env.OLLAMA_TIMEOUT, 10);
    if (!isNaN(timeout) && timeout > 0) {
      settings.timeout = timeout;
    }
  }
  
  if (process.env.OLLAMA_TEMPERATURE) {
    const temperature = parseFloat(process.env.OLLAMA_TEMPERATURE);
    if (!isNaN(temperature) && temperature >= 0 && temperature <= 2) {
      settings.temperature = temperature;
    }
  }
  
  return settings;
};

// Validate settings
export const validateOllamaSettings = (settings: Partial<OllamaSettings>): string[] => {
  const errors: string[] = [];
  
  if (!settings.endpoint) {
    errors.push('Endpoint is required');
  } else if (!settings.endpoint.match(/^https?:\/\/.+/)) {
    errors.push('Endpoint must be a valid HTTP/HTTPS URL');
  }
  
  if (!settings.model) {
    errors.push('Model is required');
  }
  
  if (settings.contextSize !== undefined) {
    if (!Number.isInteger(settings.contextSize) || settings.contextSize < 512 || settings.contextSize > 32768) {
      errors.push('Context size must be between 512 and 32768');
    }
  }
  
  if (settings.timeout !== undefined) {
    if (!Number.isInteger(settings.timeout) || settings.timeout < 1000 || settings.timeout > 300000) {
      errors.push('Timeout must be between 1000ms and 300000ms (5 minutes)');
    }
  }
  
  if (settings.temperature !== undefined) {
    if (typeof settings.temperature !== 'number' || settings.temperature < 0 || settings.temperature > 2) {
      errors.push('Temperature must be between 0.0 and 2.0');
    }
  }
  
  if (settings.topP !== undefined) {
    if (typeof settings.topP !== 'number' || settings.topP < 0 || settings.topP > 1) {
      errors.push('Top P must be between 0.0 and 1.0');
    }
  }
  
  return errors;
};

// Settings descriptions for UI
export const SETTING_DESCRIPTIONS = {
  endpoint: 'Ollama server endpoint URL (e.g., http://localhost:11434)',
  model: 'Model name to use for generation (e.g., llama3.2:latest)',
  contextSize: 'Maximum context window size in tokens (512-32768)',
  timeout: 'Request timeout in milliseconds (1000-300000)',
  temperature: 'Randomness in responses (0.0 = deterministic, 2.0 = very random)',
  topP: 'Nucleus sampling parameter (0.0-1.0, controls diversity)',
  streamResponse: 'Enable streaming responses for real-time output',
  keepAlive: 'How long to keep model loaded in memory (e.g., "5m", "1h")',
  systemPrompt: 'Optional system prompt to prepend to all conversations',
} as const;