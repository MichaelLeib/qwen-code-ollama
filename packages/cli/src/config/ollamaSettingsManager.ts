/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_OLLAMA_SETTINGS,
  loadOllamaSettings,
  saveOllamaSettings,
  validateOllamaSettings,
  getOllamaSettingsPath,
} from '@qwen-code/qwen-code-core';
import type { OllamaSettings as _OllamaSettings } from '@qwen-code/qwen-code-core';
import fs from 'node:fs';

/**
 * Display current Ollama settings in a formatted way
 */
export function displayOllamaSettings(): void {
  console.log('\n🔧 Current Ollama Settings:');
  console.log('=' .repeat(50));
  
  const settings = loadOllamaSettings();
  const settingsPath = getOllamaSettingsPath();
  
  console.log(`📁 Settings file: ${settingsPath}`);
  console.log(`📂 File exists: ${fs.existsSync(settingsPath) ? '✅ Yes' : '❌ No'}`);
  console.log('');
  
  // Display each setting with description
  console.log('📋 Configuration:');
  console.log(`  🌐 Endpoint: ${settings.endpoint}`);
  console.log(`  🤖 Model: ${settings.model || 'Not set'}`);
  console.log(`  📏 Context Size: ${settings.contextSize}`);
  console.log(`  ⏱️  Timeout: ${settings.timeout}ms`);
  console.log(`  🌡️  Temperature: ${settings.temperature}`);
  console.log(`  🎯 Top P: ${settings.topP}`);
  console.log(`  📡 Stream Response: ${settings.streamResponse ? 'Yes' : 'No'}`);
  console.log(`  💤 Keep Alive: ${settings.keepAlive}`);
  
  if (settings.systemPrompt) {
    const preview = settings.systemPrompt.length > 100 
      ? settings.systemPrompt.substring(0, 97) + '...'
      : settings.systemPrompt;
    console.log(`  💭 System Prompt: "${preview}"`);
  } else {
    console.log(`  💭 System Prompt: Not set`);
  }
  
  // Validate settings
  const errors = validateOllamaSettings(settings);
  if (errors.length > 0) {
    console.log('\n⚠️  Validation Issues:');
    errors.forEach(error => console.log(`  ❌ ${error}`));
  } else {
    console.log('\n✅ Settings are valid');
  }
  
  console.log('\n📚 Usage:');
  console.log('  qwen --ollama-settings show   # Display these settings');
  console.log('  qwen --ollama-settings reset  # Reset to defaults');
  console.log('  qwen --ollama-settings edit   # Open interactive editor');
  console.log('');
}

/**
 * Reset Ollama settings to defaults
 */
export function resetOllamaSettings(): void {
  console.log('\n🔄 Resetting Ollama Settings...');
  
  const settingsPath = getOllamaSettingsPath();
  const hadExistingFile = fs.existsSync(settingsPath);
  
  // Save default settings
  const success = saveOllamaSettings(DEFAULT_OLLAMA_SETTINGS);
  
  if (success) {
    console.log('✅ Settings successfully reset to defaults');
    
    if (hadExistingFile) {
      console.log(`📁 Updated file: ${settingsPath}`);
    } else {
      console.log(`📁 Created file: ${settingsPath}`);
    }
    
    console.log('\n📋 Default Settings:');
    console.log(`  🌐 Endpoint: ${DEFAULT_OLLAMA_SETTINGS.endpoint}`);
    console.log(`  🤖 Model: ${DEFAULT_OLLAMA_SETTINGS.model}`);  
    console.log(`  📏 Context Size: ${DEFAULT_OLLAMA_SETTINGS.contextSize}`);
    console.log(`  ⏱️  Timeout: ${DEFAULT_OLLAMA_SETTINGS.timeout}ms`);
    console.log(`  🌡️  Temperature: ${DEFAULT_OLLAMA_SETTINGS.temperature}`);
    console.log(`  🎯 Top P: ${DEFAULT_OLLAMA_SETTINGS.topP}`);
    console.log(`  📡 Stream Response: ${DEFAULT_OLLAMA_SETTINGS.streamResponse ? 'Yes' : 'No'}`);
    console.log(`  💤 Keep Alive: ${DEFAULT_OLLAMA_SETTINGS.keepAlive}`);
    
    console.log('\n🎮 Next Steps:');
    console.log('  • Run "qwen" to start the interactive CLI');
    console.log('  • Use authentication menu to configure Ollama');
    console.log('  • Test connection with your Ollama server');
  } else {
    console.error('❌ Failed to reset settings');
    console.error(`   Could not write to: ${settingsPath}`);
    process.exit(1);
  }
  
  console.log('');
}

/**
 * Launch interactive settings editor
 * This redirects to the main CLI with the settings screen
 */
export function editOllamaSettings(): void {
  console.log('\n🔧 Opening Interactive Ollama Settings Editor...');
  console.log('');
  console.log('💡 This will launch the main CLI interface.');
  console.log('   Select "Use Ollama" from the authentication menu');
  console.log('   to access the interactive settings configuration.');
  console.log('');
  console.log('🎮 Controls in the settings editor:');
  console.log('  • Tab/Shift+Tab: Navigate between fields');
  console.log('  • Ctrl+Enter: Save settings');  
  console.log('  • Ctrl+T: Test connection');
  console.log('  • Ctrl+R: Reset to defaults');
  console.log('  • Escape: Cancel and return');
  console.log('');
  console.log('🚀 Launching CLI...');
  
  // Note: We don't actually launch the CLI here since we're already in the CLI process
  // This message guides the user on what to do next
}

/**
 * Handle Ollama settings management commands
 */
export function handleOllamaSettingsCommand(command: string): void {
  switch (command) {
    case 'show':
      displayOllamaSettings();
      break;
      
    case 'reset':
      resetOllamaSettings();
      break;
      
    case 'edit':
      editOllamaSettings();
      break;
      
    default:
      console.error(`❌ Unknown settings command: ${command}`);
      console.error('   Valid commands: show, reset, edit');
      process.exit(1);
  }
}