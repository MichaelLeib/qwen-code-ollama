/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@qwen-code/qwen-code-core';
import { loadEnvironment } from './settings.js';

export const validateAuthMethod = (authMethod: string): string | null => {
  loadEnvironment();
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.CLOUD_SHELL
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    if (!process.env.GEMINI_API_KEY) {
      return 'GEMINI_API_KEY environment variable not found. Add that to your environment and try again (no reload needed if using .env)!';
    }
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    const hasVertexProjectLocationConfig =
      !!process.env.GOOGLE_CLOUD_PROJECT && !!process.env.GOOGLE_CLOUD_LOCATION;
    const hasGoogleApiKey = !!process.env.GOOGLE_API_KEY;
    if (!hasVertexProjectLocationConfig && !hasGoogleApiKey) {
      return (
        'When using Vertex AI, you must specify either:\n' +
        '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
        '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  if (authMethod === AuthType.USE_OPENAI) {
    if (!process.env.OPENAI_API_KEY) {
      return 'OPENAI_API_KEY environment variable not found. You can enter it interactively or add it to your .env file.';
    }
    return null;
  }

  if (authMethod === AuthType.USE_OLLAMA) {
    if (!process.env.OLLAMA_ENDPOINT) {
      return 'OLLAMA_ENDPOINT environment variable not found. You can configure it interactively or add it to your .env file.';
    }
    return validateOllamaEndpoint(process.env.OLLAMA_ENDPOINT);
  }

  return 'Invalid auth method selected.';
};

export const validateOllamaEndpoint = (endpoint: string): string | null => {
  try {
    new URL(endpoint);
    return null;
  } catch {
    return 'Invalid Ollama endpoint URL format';
  }
};

export const setOpenAIApiKey = (apiKey: string): void => {
  process.env.OPENAI_API_KEY = apiKey;
};

export const setOpenAIBaseUrl = (baseUrl: string): void => {
  process.env.OPENAI_BASE_URL = baseUrl;
};

export const setOpenAIModel = (model: string): void => {
  process.env.OPENAI_MODEL = model;
};

export const setOllamaEndpoint = (endpoint: string): void => {
  process.env.OLLAMA_ENDPOINT = endpoint;
};

export const setOllamaModel = (model: string): void => {
  process.env.OLLAMA_MODEL = model;
};
