/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import { AuthType } from '@qwen-code/qwen-code-core';
import {
  validateAuthMethod,
  setOllamaEndpoint,
  setOllamaModel,
} from '../../config/auth.js';
import { OllamaConfigPrompt } from './OllamaConfigPrompt.js';
import { OllamaSettingsScreen } from './OllamaSettingsScreen.js';

interface AuthDialogProps {
  onSelect: (authMethod: AuthType | undefined, scope: SettingScope) => void;
  settings: LoadedSettings;
  initialErrorMessage?: string | null;
}

function parseDefaultAuthType(
  defaultAuthType: string | undefined,
): AuthType | null {
  if (
    defaultAuthType &&
    Object.values(AuthType).includes(defaultAuthType as AuthType)
  ) {
    return defaultAuthType as AuthType;
  }
  return null;
}

export function AuthDialog({
  onSelect,
  settings,
  initialErrorMessage,
}: AuthDialogProps): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage || null,
  );
  const [showOllamaConfigPrompt, setShowOllamaConfigPrompt] = useState(false);
  const [showOllamaSettingsScreen, setShowOllamaSettingsScreen] = useState(false);
  const items = [{ label: 'Ollama', value: AuthType.USE_OLLAMA }];

  const initialAuthIndex = Math.max(
    0,
    items.findIndex((item) => {
      if (settings.merged.selectedAuthType) {
        return item.value === settings.merged.selectedAuthType;
      }

      const defaultAuthType = parseDefaultAuthType(
        process.env.GEMINI_DEFAULT_AUTH_TYPE,
      );
      if (defaultAuthType) {
        return item.value === defaultAuthType;
      }

      if (process.env.GEMINI_API_KEY) {
        return item.value === AuthType.USE_GEMINI;
      }

      return item.value === AuthType.LOGIN_WITH_GOOGLE;
    }),
  );

  const handleAuthSelect = (authMethod: AuthType) => {
    if (authMethod === AuthType.USE_OLLAMA) {
      // Always show settings screen for Ollama
      setShowOllamaSettingsScreen(true);
      setErrorMessage(null);
      return;
    }
    
    const error = validateAuthMethod(authMethod);
    if (error) {
      setErrorMessage(error);
    } else {
      setErrorMessage(null);
      onSelect(authMethod, SettingScope.User);
    }
  };

  const handleOllamaConfigSubmit = (
    endpoint: string,
    model: string,
  ) => {
    setOllamaEndpoint(endpoint);
    setOllamaModel(model);
    setShowOllamaConfigPrompt(false);
    onSelect(AuthType.USE_OLLAMA, SettingScope.User);
  };

  const handleOllamaConfigCancel = () => {
    setShowOllamaConfigPrompt(false);
    setErrorMessage('Ollama endpoint is required to use Ollama.');
  };

  const handleOllamaSettingsComplete = () => {
    setShowOllamaSettingsScreen(false);
    setErrorMessage(null);
    onSelect(AuthType.USE_OLLAMA, SettingScope.User);
  };

  const handleOllamaSettingsCancel = () => {
    setShowOllamaSettingsScreen(false);
    setErrorMessage('Ollama configuration is required to continue.');
  };

  useInput((_input, key) => {
    // Don't handle input when showing config screens
    if (showOllamaConfigPrompt || showOllamaSettingsScreen) {
      return;
    }

    if (key.escape) {
      // Prevent exit if there is an error message.
      // This means they user is not authenticated yet.
      if (errorMessage) {
        return;
      }
      if (settings.merged.selectedAuthType === undefined) {
        // Prevent exiting if no auth method is set
        setErrorMessage(
          'You must select an auth method to proceed. Press Ctrl+C twice to exit.',
        );
        return;
      }
      onSelect(undefined, SettingScope.User);
    }
  });

  if (showOllamaSettingsScreen) {
    return (
      <OllamaSettingsScreen
        onComplete={handleOllamaSettingsComplete}
        onCancel={handleOllamaSettingsCancel}
      />
    );
  }

  if (showOllamaConfigPrompt) {
    return (
      <OllamaConfigPrompt
        onSubmit={handleOllamaConfigSubmit}
        onCancel={handleOllamaConfigCancel}
      />
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Welcome to Qwen Code</Text>
      <Box marginTop={1}>
        <Text>Configure your local Ollama server to get started with AI-powered coding.</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.Gray}>
          Ollama runs large language models locally on your machine, ensuring privacy and offline access.
        </Text>
      </Box>
      <Box marginTop={1}>
        <RadioButtonSelect
          items={items}
          initialIndex={initialAuthIndex}
          onSelect={handleAuthSelect}
          isFocused={true}
        />
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{errorMessage}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={Colors.AccentPurple}>💡 Press Enter to configure Ollama</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.Gray}>
          New to Ollama? Visit ollama.ai for installation instructions.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>Terms of Service and Privacy Notice for Qwen Code</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.AccentBlue}>
          {'https://github.com/QwenLM/Qwen3-Coder/blob/main/README.md'}
        </Text>
      </Box>
    </Box>
  );
}
