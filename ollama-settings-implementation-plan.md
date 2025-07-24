# Ollama Settings Implementation Plan

## Overview
This plan addresses two critical issues:
1. Settings menu doesn't close after saving
2. Saved settings are not used throughout the application

## Current State Analysis

### Issues Identified
1. **UI Flow Issue**: `handleOllamaSettingsComplete` doesn't accept settings parameter, preventing proper closure
2. **Settings Persistence**: Settings are saved to `~/.qwen/ollama-settings.json` but not loaded in content generator config
3. **Configuration Flow**: `createContentGeneratorConfig` only uses environment variables, ignoring saved settings
4. **Missing Features**: No way to re-access settings after initial setup

### Current Architecture
```
User → AuthDialog → OllamaSettingsScreen → Save to JSON
                                         ↓
                                    OllamaService (loads settings ✓)
                                         ↓
                          ContentGenerator (doesn't receive settings ✗)
```

## Implementation Steps

### Phase 1: Fix Settings Menu Closure
**Goal**: Ensure settings menu closes properly after saving

#### 1.1 Update AuthDialog Handler
- **File**: `packages/cli/src/ui/components/AuthDialog.tsx`
- **Changes**:
  ```typescript
  const handleOllamaSettingsComplete = (settings: OllamaSettings) => {
    setShowOllamaSettingsScreen(false);
    setErrorMessage(null);
    // Store settings in auth config
    setOllamaEndpoint(settings.endpoint);
    setOllamaModel(settings.model);
    onSelect(AuthType.USE_OLLAMA, SettingScope.User);
  };
  ```

#### 1.2 Update OllamaSettingsScreen Props Interface
- **File**: `packages/cli/src/ui/components/OllamaSettingsScreen.tsx`
- **Changes**: Ensure `onComplete` is properly typed as `(settings: OllamaSettings) => void`

### Phase 2: Load Saved Settings in Content Generator Config
**Goal**: Use saved settings instead of only environment variables

#### 2.1 Update createContentGeneratorConfig
- **File**: `packages/core/src/core/contentGenerator.ts`
- **Changes**:
  ```typescript
  import { getEffectiveOllamaSettings } from '../config/ollamaSettings.js';
  
  // In createContentGeneratorConfig function
  if (authType === AuthType.USE_OLLAMA) {
    const ollamaSettings = getEffectiveOllamaSettings();
    contentGeneratorConfig.ollamaEndpoint = ollamaEndpoint || ollamaSettings.endpoint;
    contentGeneratorConfig.model = model || ollamaSettings.model;
    return contentGeneratorConfig;
  }
  ```

#### 2.2 Update OllamaContentGenerator Constructor
- **File**: `packages/core/src/core/ollamaContentGenerator.ts`
- **Changes**: Pass full settings to OllamaService instead of just endpoint/model

### Phase 3: Add Settings Management Commands
**Goal**: Allow users to view/edit settings after initial setup

#### 3.1 Create Settings Command Handler
- **File**: `packages/cli/src/commands/settingsCommand.ts` (new file)
- **Implementation**:
  - `/settings` - Show current settings
  - `/settings ollama` - Open Ollama settings screen
  - `/settings reset` - Reset to defaults

#### 3.2 Register Settings Command
- **File**: `packages/cli/src/gemini.tsx`
- **Changes**: Add settings command to command registry

### Phase 4: Improve Settings Loading Flow
**Goal**: Ensure settings are loaded at startup and used consistently

#### 4.1 Create Settings Manager
- **File**: `packages/core/src/config/settingsManager.ts` (new file)
- **Purpose**: Centralized settings management with caching
- **Features**:
  - Load settings once at startup
  - Cache in memory for performance
  - Provide getter methods
  - Handle environment variable overrides

#### 4.2 Update Session Initialization
- **File**: `packages/cli/src/gemini.tsx`
- **Changes**: Load settings early in session initialization

### Phase 5: Add Settings Validation at Startup
**Goal**: Validate saved settings and prompt for update if invalid

#### 5.1 Create Settings Validator
- **File**: `packages/core/src/config/settingsValidator.ts` (new file)
- **Features**:
  - Check endpoint connectivity
  - Verify model availability
  - Prompt for re-configuration if needed

#### 5.2 Integrate Validation in Auth Flow
- **File**: `packages/cli/src/config/auth.ts`
- **Changes**: Add validation step for Ollama auth type

## Implementation Order

1. **Phase 1** (Critical - Fix UI): 30 minutes
   - Fix handleOllamaSettingsComplete to accept settings
   - Ensure menu closes properly

2. **Phase 2** (Critical - Use Settings): 45 minutes
   - Update createContentGeneratorConfig to load saved settings
   - Ensure settings flow through to OllamaService

3. **Phase 4** (Important - Better Loading): 1 hour
   - Create centralized settings manager
   - Update initialization flow

4. **Phase 3** (Enhancement - Settings Commands): 1 hour
   - Add /settings commands
   - Allow runtime settings updates

5. **Phase 5** (Enhancement - Validation): 45 minutes
   - Add startup validation
   - Handle invalid settings gracefully

## Testing Plan

### Unit Tests
1. Test settings save/load functionality
2. Test settings validation logic
3. Test command handlers

### Integration Tests
1. Test full auth flow with settings
2. Test settings persistence across sessions
3. Test environment variable overrides

### Manual Testing
1. Fresh install flow
2. Settings update flow
3. Invalid settings handling
4. Command testing

## Success Criteria

1. ✅ Settings menu closes after saving
2. ✅ Settings are persisted to `~/.qwen/ollama-settings.json`
3. ✅ Saved settings are used by OllamaContentGenerator
4. ✅ Environment variables override saved settings
5. ✅ Users can view/edit settings after initial setup
6. ✅ Invalid settings are handled gracefully

## Risk Mitigation

1. **Backward Compatibility**: Ensure existing environment variable setup still works
2. **Settings Migration**: Handle old format settings files
3. **Error Recovery**: Fallback to defaults if settings are corrupted
4. **Performance**: Cache settings to avoid repeated disk reads

## Future Enhancements

1. **Settings UI in Web Interface**: Add settings management to web UI
2. **Settings Profiles**: Support multiple named configurations
3. **Auto-discovery**: Automatically find Ollama endpoints on network
4. **Settings Sync**: Sync settings across devices
5. **Advanced Settings**: Add more granular control options

## Estimated Timeline

- **Critical Fixes** (Phase 1 & 2): 1.5 hours
- **Core Improvements** (Phase 4): 1 hour
- **Enhancements** (Phase 3 & 5): 1.75 hours
- **Testing**: 1 hour

**Total**: ~5.25 hours

## Notes

- Priority is fixing the immediate issues (menu closure and settings usage)
- Settings manager provides a clean abstraction for future enhancements
- Command system allows users to manage settings without restarting
- Validation ensures a smooth user experience even with invalid settings