# Ollama Integration Implementation Plan

This document provides a comprehensive plan for replacing the current OpenAI authentication system with Ollama endpoint configuration and model selection.

## Executive Summary

The current system asks users for OpenAI API key authentication on startup. The goal is to replace this with:
1. **Ollama Endpoint Configuration**: Prompt for Ollama server endpoint (default: http://localhost:11434)
2. **Dynamic Model Selection**: Fetch and display available models from the Ollama API for user selection
3. **Seamless Integration**: Maintain existing architecture while routing requests through Ollama

## Current System Analysis

### Authentication Flow
Currently, the system follows this pattern:
1. **Startup Check** (`packages/cli/src/gemini.tsx:159-171`): Validates existing authentication
2. **Auth Dialog** (`packages/cli/src/ui/components/AuthDialog.tsx:48`): Shows only "OpenAI" option
3. **OpenAI Prompt** (`packages/cli/src/ui/components/OpenAIKeyPrompt.tsx`): Collects API key, base URL, and model
4. **Validation** (`packages/cli/src/config/auth.ts:10-49`): Validates OpenAI API key
5. **Content Generator** (`packages/core/src/core/openaiContentGenerator.ts`): Handles API communication

### Key Components to Modify
- **AuthDialog**: Replace OpenAI option with Ollama option
- **OpenAIKeyPrompt**: Transform into OllamaConfigPrompt for endpoint and model selection  
- **Authentication validation**: Replace API key validation with endpoint connectivity check
- **Content generator**: Adapt OpenAI generator for Ollama API compatibility

## Implementation Plan

### Phase 1: Core Infrastructure Changes

#### 1.1 Update Authentication Types
**File**: `packages/core/src/core/contentGenerator.ts`
- Add new `AuthType.USE_OLLAMA = 'ollama'` to enum
- Update `createContentGeneratorConfig()` to handle Ollama configuration

#### 1.2 Modify AuthDialog Component  
**File**: `packages/cli/src/ui/components/AuthDialog.tsx`
```typescript
// Replace line 48
const items = [{ label: 'Ollama', value: AuthType.USE_OLLAMA }];

// Update handler logic to call Ollama configuration instead of OpenAI
if (authMethod === AuthType.USE_OLLAMA && !process.env.OLLAMA_ENDPOINT) {
  setShowOllamaConfigPrompt(true);
  setErrorMessage(null);
}
```

#### 1.3 Create OllamaConfigPrompt Component
**File**: `packages/cli/src/ui/components/OllamaConfigPrompt.tsx`

Replace `OpenAIKeyPrompt` with a new component that:
- **Field 1**: Ollama endpoint URL (default: "http://localhost:11434")
- **Field 2**: Model selection (dynamically fetched from `/api/tags`)
- **Validation**: Test endpoint connectivity and fetch models
- **Navigation**: Same Tab/Arrow key navigation as current component

Key features:
```typescript
interface OllamaConfigPromptProps {
  onSubmit: (endpoint: string, model: string) => void;
  onCancel: () => void;
}

// States needed:
const [endpoint, setEndpoint] = useState('http://localhost:11434');
const [selectedModel, setSelectedModel] = useState('');
const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
const [isLoadingModels, setIsLoadingModels] = useState(false);
const [connectionError, setConnectionError] = useState<string | null>(null);
```

#### 1.4 Update Authentication Validation
**File**: `packages/cli/src/config/auth.ts`
```typescript
// Add Ollama validation function
export function validateOllamaEndpoint(endpoint: string): string | null {
  try {
    new URL(endpoint); // Validate URL format
    // Test connectivity (implement async version)
    return null;
  } catch {
    return 'Invalid Ollama endpoint URL format';
  }
}

// Update validateAuthMethod to handle USE_OLLAMA
case AuthType.USE_OLLAMA:
  if (!process.env.OLLAMA_ENDPOINT) {
    return 'Ollama endpoint is required. Please configure your Ollama server endpoint.';
  }
  return validateOllamaEndpoint(process.env.OLLAMA_ENDPOINT);
```

### Phase 2: Ollama API Integration

#### 2.1 Create Ollama Service
**File**: `packages/core/src/services/ollamaService.ts`

Implement service for Ollama API communication:
```typescript
export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  details: {
    parameter_size: string;
    quantization_level: string;
    family: string;
  };
}

export class OllamaService {
  constructor(private endpoint: string) {}
  
  async testConnection(): Promise<boolean>
  async getAvailableModels(): Promise<OllamaModel[]>
  async generateResponse(model: string, messages: any[]): Promise<any>
}
```

#### 2.2 Create Ollama Content Generator
**File**: `packages/core/src/core/ollamaContentGenerator.ts`

Adapt the existing `openaiContentGenerator.ts`:
- Replace OpenAI API calls with Ollama API calls
- Map between Gemini message format and Ollama format
- Handle streaming responses
- Implement proper error handling and timeouts
- Support for `/api/chat` endpoint (preferred) or `/api/generate`

Key differences from OpenAI generator:
```typescript
export class OllamaContentGenerator implements ContentGenerator {
  constructor(
    private endpoint: string,
    private model: string,
    // No API key needed
  ) {}
  
  // Use Ollama chat API: POST {endpoint}/api/chat
  // Format: { model, messages, stream: true/false }
}
```

#### 2.3 Update Content Generator Factory
**File**: `packages/core/src/core/contentGenerator.ts`
```typescript
// Add Ollama case to createContentGenerator()
case AuthType.USE_OLLAMA:
  return new OllamaContentGenerator(
    config.ollamaEndpoint!,
    config.model,
  );
```

### Phase 3: Configuration Management

#### 3.1 Environment Variables
Add support for new environment variables:
- `OLLAMA_ENDPOINT`: Ollama server endpoint (default: http://localhost:11434)  
- `OLLAMA_MODEL`: Default model name
- Remove dependency on `OPENAI_API_KEY`, `OPENAI_BASE_URL`

#### 3.2 Update Settings and Config
**Files**: 
- `packages/cli/src/config/settings.ts`
- `packages/cli/src/config/config.ts`

Add Ollama-specific configuration:
```typescript
// Add to settings interface
interface Settings {
  ollamaEndpoint?: string;
  ollamaModel?: string;
  // Remove openai fields
}

// Add helper functions  
export function setOllamaEndpoint(endpoint: string): void
export function setOllamaModel(model: string): void
```

#### 3.3 Command Line Arguments
**File**: `packages/cli/src/config/config.ts`
```typescript
// Replace OpenAI args with Ollama args
.option('ollama-endpoint', {
  type: 'string', 
  description: 'Ollama server endpoint',
  default: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
})
.option('ollama-model', {
  type: 'string',
  description: 'Ollama model to use', 
  default: process.env.OLLAMA_MODEL,
})
```

### Phase 4: UI/UX Enhancements

#### 4.1 Model Selection Interface
The OllamaConfigPrompt should provide an intuitive model selection experience:

**Step 1**: Endpoint Configuration
- Input field for Ollama endpoint
- Test connection button/automatic testing
- Clear error messages for connection issues

**Step 2**: Model Selection  
- Display loading indicator while fetching models
- Show models in a selectable list with details:
  - Model name and tag (e.g., "llama3.2:latest")
  - Parameter size (e.g., "7.6B")
  - Quantization level (e.g., "Q4_K_M")
  - Model size (formatted, e.g., "4.4 GB")

**Navigation Flow**:
```
Endpoint Input → [Test Connection] → Model Selection → [Confirm]
     ↑                                                      ↓
     ←←←←←←←←←←←←←← [Back] ←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

#### 4.2 Error Handling and Feedback
- **Connection Errors**: Clear messages for network issues, invalid endpoints
- **No Models Found**: Guidance on installing models with `ollama pull`
- **Model Loading Errors**: Helpful error messages with troubleshooting tips

#### 4.3 Model Information Display
Show useful model information to help users choose:
- **Parameter count**: Indicates model capability/size
- **Quantization**: Affects quality vs performance tradeoff  
- **Family**: Model architecture (llama, qwen, etc.)
- **Size**: Disk space usage

### Phase 5: API Format Compatibility

#### 5.1 Message Format Translation
Translate between Gemini-style messages and Ollama format:

**Gemini Format** (current):
```typescript
{
  role: "user" | "model",
  parts: [{ text: string }]
}
```

**Ollama Format** (target):
```typescript
{
  role: "user" | "assistant" | "system", 
  content: string
}
```

#### 5.2 Streaming Response Handling
Ollama supports streaming via:
```json
POST /api/chat
{
  "model": "llama3.2",
  "messages": [...],
  "stream": true
}
```

Response format:
```json
{"message": {"role": "assistant", "content": "partial response"}}
{"done": false}
{"done": true, "total_duration": 5043500667}
```

#### 5.3 Tool/Function Call Support
If the application uses function calling:
- Investigate Ollama's function calling capabilities
- Implement compatibility layer or graceful degradation
- Update tool calling logic accordingly

### Phase 6: Testing and Validation

#### 6.1 Unit Tests
**Files to test**:
- `OllamaService` - API communication
- `OllamaContentGenerator` - Message generation
- `OllamaConfigPrompt` - UI component behavior
- Configuration validation functions

#### 6.2 Integration Tests
- End-to-end authentication flow
- Model fetching and selection
- Content generation with various models
- Error handling scenarios

#### 6.3 Manual Testing Scenarios
1. **Fresh Installation**: No existing config, guided setup
2. **Ollama Not Running**: Error handling and user guidance
3. **No Models Installed**: Clear instructions for model installation
4. **Network Issues**: Timeout and retry behavior
5. **Invalid Endpoints**: URL validation and error messages
6. **Model Switching**: Runtime model changes (if supported)

### Phase 7: Documentation and Migration

#### 7.1 Update Documentation
- Installation instructions for Ollama
- Configuration guide for different Ollama setups
- Model selection recommendations
- Troubleshooting guide

#### 7.2 Migration Guide
For existing users:
- How to transition from OpenAI to Ollama
- Configuration file migration
- Environment variable changes

#### 7.3 Backward Compatibility
Consider maintaining OpenAI support as an option:
- Dual authentication modes
- Configuration-based provider selection
- Gradual migration path

## Technical Implementation Details

### File Structure Changes
```
packages/
├── cli/src/
│   ├── ui/components/
│   │   ├── AuthDialog.tsx (modified)
│   │   ├── OllamaConfigPrompt.tsx (new)
│   │   └── OpenAIKeyPrompt.tsx (remove or deprecate)
│   └── config/
│       ├── auth.ts (modified)
│       ├── config.ts (modified)
│       └── settings.ts (modified)
├── core/src/
│   ├── core/
│   │   ├── contentGenerator.ts (modified)
│   │   ├── ollamaContentGenerator.ts (new)
│   │   └── openaiContentGenerator.ts (keep for backward compatibility)
│   └── services/
│       └── ollamaService.ts (new)
```

### Configuration Schema
```typescript
interface OllamaConfig {
  endpoint: string; // http://localhost:11434
  model: string;    // Selected model name
  timeout?: number; // Request timeout (default: 30s)
  maxRetries?: number; // Retry attempts (default: 3)
}
```

### Environment Variable Migration
```bash
# Old (remove these)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# New (add these)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
```

## Implementation Timeline

### Week 1: Core Infrastructure
- Modify AuthDialog and authentication types
- Create OllamaConfigPrompt basic structure
- Update configuration management

### Week 2: Ollama Integration  
- Implement OllamaService
- Create OllamaContentGenerator
- Add model fetching and validation

### Week 3: UI Polish and Testing
- Complete OllamaConfigPrompt functionality
- Add error handling and user feedback
- Write unit and integration tests

### Week 4: Documentation and Refinement
- Update documentation
- Performance optimization
- Bug fixes and edge case handling

## Risk Mitigation

### Technical Risks
1. **Ollama API Changes**: Pin to specific API version, implement graceful degradation
2. **Network Connectivity**: Robust error handling, offline mode considerations
3. **Model Compatibility**: Validate model capabilities, provide model recommendations
4. **Performance**: Implement request timeouts, connection pooling, caching

### User Experience Risks
1. **Migration Complexity**: Provide clear migration guide, maintain backward compatibility
2. **Configuration Confusion**: Intuitive defaults, comprehensive error messages
3. **Model Selection Overwhelm**: Curated model recommendations, clear descriptions

### Operational Risks
1. **Local Dependencies**: Clear Ollama installation instructions
2. **Resource Usage**: Model size warnings, system requirement guidance
3. **Updates**: Automated Ollama version checking, compatibility warnings

## Success Criteria

1. **Functional**: Users can configure Ollama endpoint and select models seamlessly
2. **Performance**: Response times comparable to or better than OpenAI integration  
3. **Reliability**: Robust error handling for common failure scenarios
4. **Usability**: Intuitive setup process requiring minimal technical knowledge
5. **Compatibility**: Existing chat functionality works identically with Ollama models

## Post-Implementation Considerations

### Future Enhancements
1. **Multiple Providers**: Support both Ollama and OpenAI simultaneously
2. **Model Management**: Built-in model downloading and management
3. **Performance Optimization**: Model caching, request batching
4. **Advanced Features**: Custom model configurations, fine-tuning integration

### Monitoring and Analytics
1. **Usage Metrics**: Track model selection patterns, performance metrics
2. **Error Monitoring**: Log and analyze common failure scenarios
3. **User Feedback**: Collect feedback on model quality and performance

This implementation plan provides a comprehensive roadmap for transitioning from OpenAI authentication to Ollama endpoint configuration while maintaining system reliability and user experience quality.