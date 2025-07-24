/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}

interface OllamaConfigPromptProps {
  onSubmit: (endpoint: string, model: string) => void;
  onCancel: () => void;
}

export function OllamaConfigPrompt({
  onSubmit,
  onCancel,
}: OllamaConfigPromptProps): React.JSX.Element {
  const [endpoint, setEndpoint] = useState('http://localhost:11434');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [currentField, setCurrentField] = useState<'endpoint' | 'model'>('endpoint');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasTestedConnection, setHasTestedConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const testConnectionAndFetchModels = useCallback(async () => {
    if (!endpoint.trim()) {
      setConnectionError('Endpoint cannot be empty');
      setConnectionStatus('error');
      return;
    }

    setIsLoadingModels(true);
    setConnectionError(null);
    setConnectionStatus('testing');

    try {
      // Validate URL format
      new URL(endpoint);
      
      // Test connection by fetching models
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const models = data.models || [];

      if (models.length === 0) {
        setConnectionError('No models found. Install models with: ollama pull llama3.2');
        setConnectionStatus('error');
        setAvailableModels([]);
      } else {
        setAvailableModels(models);
        setSelectedModel(models[0].name);
        setSelectedModelIndex(0);
        setConnectionError(null);
        setConnectionStatus('success');
      }
      setHasTestedConnection(true);
    } catch (error) {
      setConnectionStatus('error');
      if (error instanceof TypeError) {
        setConnectionError('Invalid URL format. Use http://localhost:11434');
      } else if (error instanceof Error && error.name === 'TimeoutError') {
        setConnectionError('Connection timeout. Start Ollama with: ollama serve');
      } else if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        setConnectionError('Connection refused. Start Ollama with: ollama serve');
      } else if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
          setConnectionError('Network error. Check Ollama is running and accessible');
        } else {
          setConnectionError(`Connection failed: ${error.message}`);
        }
      } else {
        setConnectionError('Connection failed: Unknown error');
      }
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, [endpoint]);

  // Test connection and fetch models when endpoint changes
  useEffect(() => {
    if (currentField === 'model' && !hasTestedConnection) {
      testConnectionAndFetchModels();
    }
  }, [currentField, hasTestedConnection, testConnectionAndFetchModels]);

  const formatModelSize = (size: number): string => {
    const gb = size / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(size / (1024 ** 2)).toFixed(0)} MB`;
  };

  const getModelDisplayInfo = (model: OllamaModel) => {
    const parts = [];
    if (model.details?.parameter_size) parts.push(model.details.parameter_size);
    if (model.details?.quantization_level) parts.push(model.details.quantization_level);
    if (model.size) parts.push(formatModelSize(model.size));
    
    const info = parts.length > 0 ? ` (${parts.join(', ')})` : '';
    
    // Add family information for better context
    const family = model.details?.family;
    if (family && family !== 'llama' && !model.name.toLowerCase().includes(family)) {
      return ` [${family}]${info}`;
    }
    
    return info;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing connection...';
      case 'success': return `Connected • ${availableModels.length} models available`;
      case 'error': return 'Connection failed';
      default: return '';
    }
  };

  const validateAndCorrectEndpoint = (input: string): string => {
    // Remove trailing slashes
    let corrected = input.replace(/\/+$/, '');
    
    // Add protocol if missing
    if (corrected && !corrected.match(/^https?:\/\//)) {
      corrected = `http://${corrected}`;
    }
    
    // Suggest common ports if none specified
    if (corrected.match(/^https?:\/\/[^:/]+$/) && !corrected.includes('localhost')) {
      // For non-localhost without port, suggest common Ollama port
      return corrected;
    }
    
    return corrected;
  };

  useInput((input, key) => {
    // Filter control sequences like in OpenAIKeyPrompt
    let cleanInput = (input || '')
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '') // eslint-disable-line no-control-regex
      .replace(/\[200~/g, '')
      .replace(/\[201~/g, '')
      .replace(/^\[|~$/g, '');

    cleanInput = cleanInput
      .split('')
      .filter((ch) => ch.charCodeAt(0) >= 32)
      .join('');

    if (cleanInput.length > 0) {
      if (currentField === 'endpoint') {
        setEndpoint((prev) => prev + cleanInput);
        setHasTestedConnection(false); // Reset connection test when endpoint changes
        setConnectionStatus('idle');
        setConnectionError(null);
        setAvailableModels([]);
      }
      return;
    }

    // Handle Enter key
    if (input.includes('\n') || input.includes('\r')) {
      if (currentField === 'endpoint') {
        if (endpoint.trim()) {
          // Validate and correct endpoint format
          const correctedEndpoint = validateAndCorrectEndpoint(endpoint.trim());
          if (correctedEndpoint !== endpoint) {
            setEndpoint(correctedEndpoint);
          }
          setCurrentField('model');
        }
        return;
      } else if (currentField === 'model') {
        if (selectedModel && !connectionError) {
          onSubmit(endpoint.trim(), selectedModel);
        } else if (connectionError) {
          // Go back to endpoint field to fix connection
          setCurrentField('endpoint');
        }
        return;
      }
    }

    if (key.escape) {
      onCancel();
      return;
    }

    // Handle Tab key for field navigation
    if (key.tab) {
      if (currentField === 'endpoint') {
        setCurrentField('model');
      } else if (currentField === 'model') {
        setCurrentField('endpoint');
      }
      return;
    }

    // Handle arrow keys
    if (key.upArrow) {
      if (currentField === 'model' && availableModels.length > 0) {
        const newIndex = selectedModelIndex > 0 ? selectedModelIndex - 1 : availableModels.length - 1;
        setSelectedModelIndex(newIndex);
        setSelectedModel(availableModels[newIndex].name);
      } else if (currentField === 'model') {
        setCurrentField('endpoint');
      }
      return;
    }

    if (key.downArrow) {
      if (currentField === 'endpoint') {
        setCurrentField('model');
      } else if (currentField === 'model' && availableModels.length > 0) {
        const newIndex = selectedModelIndex < availableModels.length - 1 ? selectedModelIndex + 1 : 0;
        setSelectedModelIndex(newIndex);
        setSelectedModel(availableModels[newIndex].name);
      }
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      if (currentField === 'endpoint') {
        setEndpoint((prev) => prev.slice(0, -1));
        setHasTestedConnection(false);
        setConnectionStatus('idle');
        setConnectionError(null);
        setAvailableModels([]);
      }
      return;
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.AccentBlue}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold color={Colors.AccentBlue}>
        Ollama Configuration
      </Text>
      <Box marginTop={1}>
        <Text>
          Configure your Ollama server endpoint and select a model.
        </Text>
      </Box>
      
      {/* Connection Status */}
      {connectionStatus !== 'idle' && (
        <Box marginTop={1} flexDirection="row">
          <Text>
            {getConnectionStatusIcon()} {getConnectionStatusText()}
          </Text>
        </Box>
      )}
      
      {/* Endpoint Configuration */}
      <Box marginTop={1} flexDirection="row">
        <Box width={12}>
          <Text
            color={currentField === 'endpoint' ? Colors.AccentBlue : Colors.Gray}
          >
            Endpoint:
          </Text>
        </Box>
        <Box flexGrow={1}>
          <Text>
            {currentField === 'endpoint' ? '> ' : '  '}
            {endpoint || ' '}
          </Text>
        </Box>
      </Box>

      {/* Model Selection */}
      <Box marginTop={1} flexDirection="row">
        <Box width={12}>
          <Text
            color={currentField === 'model' ? Colors.AccentBlue : Colors.Gray}
          >
            Model:
          </Text>
        </Box>
        <Box flexGrow={1}>
          <Text>
            {currentField === 'model' ? '> ' : '  '}
            {isLoadingModels ? 'Loading models...' : selectedModel || 'Select a model'}
          </Text>
        </Box>
      </Box>

      {/* Available Models List (when in model selection mode) */}
      {currentField === 'model' && availableModels.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color={Colors.Gray}>Available models (use ↑↓ to select):</Text>
          {availableModels.slice(0, 5).map((model, index) => (
            <Box key={model.name} marginLeft={2}>
              <Text color={index === selectedModelIndex ? Colors.AccentBlue : Colors.Gray}>
                {index === selectedModelIndex ? '→ ' : '  '}
                {model.name}
                {getModelDisplayInfo(model)}
              </Text>
            </Box>
          ))}
          {availableModels.length > 5 && (
            <Box marginLeft={2}>
              <Text color={Colors.Gray}>
                ... and {availableModels.length - 5} more models
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Model Selection Help */}
      {currentField === 'model' && availableModels.length > 5 && (
        <Box marginTop={1} marginLeft={2}>
          <Text color={Colors.Gray} dimColor>
            Tip: Popular models include llama3.2, codellama, and mistral
          </Text>
        </Box>
      )}

      {/* Error Messages with Enhanced Help */}
      {connectionError && (
        <Box marginTop={1} flexDirection="column">
          <Text color={Colors.AccentRed}>❌ {connectionError}</Text>
          {connectionError.includes('ollama serve') && (
            <Box marginTop={1} marginLeft={2}>
              <Text color={Colors.Gray}>
                • Install Ollama: https://ollama.ai/download
              </Text>
              <Text color={Colors.Gray}>
                • Start server: ollama serve
              </Text>
              <Text color={Colors.Gray}>
                • Install models: ollama pull llama3.2
              </Text>
            </Box>
          )}
          {connectionError.includes('Install models') && (
            <Box marginTop={1} marginLeft={2}>
              <Text color={Colors.Gray}>
                Suggested models to install:
              </Text>
              <Text color={Colors.Gray}>
                • ollama pull llama3.2 (general purpose)
              </Text>
              <Text color={Colors.Gray}>
                • ollama pull codellama (code generation)
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Instructions */}
      <Box marginTop={1}>
        <Text color={Colors.Gray}>
          {currentField === 'endpoint' 
            ? '💡 Press Enter to test connection • Tab/↑↓ to navigate • Esc to cancel'
            : isLoadingModels
            ? '⏳ Testing connection to Ollama server...'
            : availableModels.length > 0
            ? '✨ Press Enter to confirm • ↑↓ to select model • Tab to go back • Esc to cancel'
            : connectionError
            ? '🔧 Fix connection error to continue'
            : 'Select a model to use'
          }
        </Text>
      </Box>
    </Box>
  );
}