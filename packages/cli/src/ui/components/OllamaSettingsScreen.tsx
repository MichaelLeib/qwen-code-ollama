/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

import {
  OllamaSettings,
  DEFAULT_OLLAMA_SETTINGS,
  loadOllamaSettings,
  saveOllamaSettings,
  validateOllamaSettings,
  SETTING_DESCRIPTIONS,
} from '../../config/ollamaSettings.js';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaSettingsScreenProps {
  onComplete: (settings: OllamaSettings) => void;
  onCancel: () => void;
}

type SettingField = keyof OllamaSettings;

const SETTING_FIELDS: Array<{ key: SettingField; label: string; type: 'text' | 'number' | 'boolean' | 'select' }> = [
  { key: 'endpoint', label: 'Endpoint', type: 'text' },
  { key: 'model', label: 'Model', type: 'select' },
  { key: 'contextSize', label: 'Context Size', type: 'number' },
  { key: 'timeout', label: 'Timeout (ms)', type: 'number' },
  { key: 'temperature', label: 'Temperature', type: 'number' },
  { key: 'topP', label: 'Top P', type: 'number' },
  { key: 'streamResponse', label: 'Stream Response', type: 'boolean' },
  { key: 'keepAlive', label: 'Keep Alive', type: 'text' },
  { key: 'systemPrompt', label: 'System Prompt', type: 'text' },
];

export function OllamaSettingsScreen({
  onComplete,
  onCancel,
}: OllamaSettingsScreenProps): React.JSX.Element {
  const [settings, setSettings] = useState<OllamaSettings>(() => {
    const saved = loadOllamaSettings();
    return { ...saved };
  });

  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentField = SETTING_FIELDS[currentFieldIndex];

  // Initialize input value when field changes
  useEffect(() => {
    const value = settings[currentField.key];
    if (value === undefined || value === null) {
      setInputValue('');
    } else if (typeof value === 'boolean') {
      setInputValue(value ? 'true' : 'false');
    } else {
      setInputValue(String(value));
    }
  }, [currentField.key, settings]);

  // Test connection and fetch models
  const testConnectionAndFetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    setConnectionStatus('testing');
    setErrorMessage(null);

    try {
      const response = await fetch(`${settings.endpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.models || [];
      
      setAvailableModels(models);
      setConnectionStatus('success');
      
      // Set default model if none selected and models are available
      if (!settings.model && models.length > 0) {
        const defaultModel = models.find((m: OllamaModel) => m.name.includes('llama3.2')) || models[0];
        setSettings((prev: OllamaSettings) => ({ ...prev, model: defaultModel.name }));
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, [settings.endpoint, settings.model]);

  // Test connection when endpoint changes
  useEffect(() => {
    if (settings.endpoint && settings.endpoint.startsWith('http')) {
      testConnectionAndFetchModels();
    }
  }, [settings.endpoint, testConnectionAndFetchModels]);

  // Validate settings
  useEffect(() => {
    const errors = validateOllamaSettings(settings);
    setValidationErrors(errors);
  }, [settings]);

  const handleFieldChange = (value: string) => {
    setInputValue(value);
  };

  const applyFieldValue = () => {
    const field = currentField;
    let newValue: unknown = inputValue;

    // Type conversion
    if (field.type === 'number') {
      const numValue = parseFloat(inputValue);
      if (isNaN(numValue)) {
        setErrorMessage(`Invalid number: ${inputValue}`);
        return;
      }
      newValue = numValue;
    } else if (field.type === 'boolean') {
      newValue = inputValue.toLowerCase() === 'true';
    }

    setSettings((prev: OllamaSettings) => ({ ...prev, [field.key]: newValue as number | boolean | string }));
    setErrorMessage(null);
  };

  const nextField = () => {
    applyFieldValue();
    if (currentFieldIndex < SETTING_FIELDS.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    }
  };

  const prevField = () => {
    applyFieldValue();
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
    }
  };

  const handleSave = () => {
    applyFieldValue();
    
    if (validationErrors.length > 0) {
      setErrorMessage(`Validation errors: ${validationErrors.join(', ')}`);
      return;
    }

    const success = saveOllamaSettings(settings);
    if (success) {
      onComplete(settings);
    } else {
      setErrorMessage('Failed to save settings');
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const resetToDefaults = () => {
    setSettings({ ...DEFAULT_OLLAMA_SETTINGS });
    setCurrentFieldIndex(0);
  };

  useInput((input, key) => {
    if (key.escape) {
      handleCancel();
      return;
    }

    if (key.tab && !key.shift) {
      nextField();
      return;
    }

    if (key.tab && key.shift) {
      prevField();
      return;
    }

    if (key.return && (key.ctrl || key.meta)) {
      handleSave();
      return;
    }

    if (input === 'r' && (key.ctrl || key.meta)) {
      resetToDefaults();
      return;
    }

    if (input === 't' && (key.ctrl || key.meta) && settings.endpoint) {
      testConnectionAndFetchModels();
      return;
    }
  });

  const getConnectionStatusIndicator = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Text color="yellow"><Spinner type="dots" /> Testing connection...</Text>;
      case 'success':
        return <Text color="green">✅ Connected • {availableModels.length} models available</Text>;
      case 'error':
        return <Text color="red">❌ Connection failed</Text>;
      default:
        return <Text color="gray">⏸️  Not tested</Text>;
    }
  };

  const formatModelName = (model: OllamaModel) => {
    const size = model.details?.parameter_size || 'Unknown size';
    const family = model.details?.family || model.details?.families?.[0] || '';
    return `${model.name} (${size}${family ? `, ${family}` : ''})`;
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Box flexDirection="column">
          <Text bold color="blue">🔧 Ollama Configuration</Text>
          <Text color="gray">Configure your Ollama server settings and model parameters</Text>
        </Box>
      </Box>

      {/* Connection Status */}
      <Box marginBottom={1}>
        {getConnectionStatusIndicator()}
      </Box>

      {/* Current Field */}
      <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="blue" paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold>{currentField.label} ({currentFieldIndex + 1}/{SETTING_FIELDS.length})</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="gray">{SETTING_DESCRIPTIONS[currentField.key]}</Text>
        </Box>

        {/* Input Field */}
        {currentField.type === 'select' && currentField.key === 'model' ? (
          <Box flexDirection="column">
            {isLoadingModels ? (
              <Text><Spinner type="dots" /> Loading models...</Text>
            ) : availableModels.length > 0 ? (
              <SelectInput
                items={availableModels.map(model => ({
                  label: formatModelName(model),
                  value: model.name,
                }))}
                onSelect={(item) => {
                  setSettings((prev: OllamaSettings) => ({ ...prev, model: item.value }));
                }}
              />
            ) : (
              <Box flexDirection="column">
                <Text color="yellow">No models found. Please check your endpoint or install models:</Text>
                <Text color="gray">  ollama pull llama3.2:latest</Text>
                <Text color="gray">Manual entry: </Text>
                <TextInput
                  value={inputValue}
                  onChange={handleFieldChange}
                  placeholder="Enter model name manually..."
                />
              </Box>
            )}
          </Box>
        ) : currentField.type === 'boolean' ? (
          <SelectInput
            items={[
              { label: 'True', value: 'true' },
              { label: 'False', value: 'false' },
            ]}
            onSelect={(item) => {
              setInputValue(item.value);
              setSettings((prev: OllamaSettings) => ({ ...prev, [currentField.key]: item.value === 'true' }));
            }}
          />
        ) : (
          <TextInput
            value={inputValue}
            onChange={handleFieldChange}
            placeholder={`Enter ${currentField.label.toLowerCase()}...`}
          />
        )}
      </Box>

      {/* Settings Preview */}
      <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
        <Text bold color="yellow">📋 Current Settings</Text>
        <Text>Endpoint: <Text color="cyan">{settings.endpoint}</Text></Text>
        <Text>Model: <Text color="cyan">{settings.model || 'Not set'}</Text></Text>
        <Text>Context: <Text color="cyan">{settings.contextSize}</Text> • Timeout: <Text color="cyan">{settings.timeout}ms</Text></Text>
        <Text>Temperature: <Text color="cyan">{settings.temperature}</Text> • Top P: <Text color="cyan">{settings.topP}</Text></Text>
        <Text>Stream: <Text color="cyan">{settings.streamResponse ? 'Yes' : 'No'}</Text> • Keep Alive: <Text color="cyan">{settings.keepAlive}</Text></Text>
      </Box>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red" bold>⚠️  Validation Errors:</Text>
          {validationErrors.map((error, index) => (
            <Text key={index} color="red">  • {error}</Text>
          ))}
        </Box>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Box marginBottom={1}>
          <Text color="red">❌ {errorMessage}</Text>
        </Box>
      )}

      {/* Controls */}
      <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={2} paddingY={1}>
        <Text bold color="green">🎮 Controls</Text>
        <Text color="gray">• Tab/Shift+Tab: Navigate fields</Text>
        <Text color="gray">• Ctrl+Enter: Save settings</Text>
        <Text color="gray">• Ctrl+T: Test connection</Text>
        <Text color="gray">• Ctrl+R: Reset to defaults</Text>
        <Text color="gray">• Escape: Cancel</Text>
      </Box>
    </Box>
  );
}