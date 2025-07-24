# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Test
- `npm run build` - Build all packages
- `npm run build:all` - Build main packages and sandbox
- `npm run test` - Run tests for all workspaces
- `npm run test:ci` - Run CI tests including scripts tests
- `npm run test:e2e` - Run end-to-end integration tests
- `npm run test:integration:all` - Run all integration tests (sandbox variations)

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files and integration tests
- `npm run lint:fix` - Auto-fix linting issues
- `npm run typecheck` - Run TypeScript type checking across workspaces
- `npm run format` - Format code with Prettier
- `npm run preflight` - Complete CI pipeline (clean, install, format, lint, build, typecheck, test)

### Development
- `npm run start` - Start the CLI in development mode
- `npm run debug` - Start with Node.js debugger attached
- `npm run bundle` - Create production bundle with assets

## Architecture

This project is a fork of Google's Gemini CLI, adapted for Qwen-Coder models with **local Ollama integration**. It follows a modular monorepo structure with three main packages:

### Core Packages
- **`packages/cli/`** - User-facing terminal interface built with React/Ink
  - Handles input processing, history management, theming, and display rendering
  - Entry point: `packages/cli/src/gemini.tsx`
  - UI components in `packages/cli/src/ui/`

- **`packages/core/`** - Backend logic and API orchestration
  - Manages Ollama/Qwen API communication, tool execution, and session state
  - OllamaContentGenerator and OllamaService for local AI integration
  - Tool registry and implementations in `packages/core/src/tools/`
  - Core chat logic in `packages/core/src/core/`

- **`packages/vscode-ide-companion/`** - VSCode extension integration
  - Provides IDE integration capabilities

### Key Architectural Concepts
- **Tool System**: Extensible tools for file operations, shell commands, web fetching (in `packages/core/src/tools/`)
- **Approval Mode**: User confirmation required for destructive operations (shell, edit, write)
- **Memory System**: Conversation history and context management
- **Telemetry**: Usage analytics and error reporting

### API Configuration
The application supports multiple deployment modes:

#### Local Ollama (Recommended for Privacy)
- **Endpoint**: `http://localhost:11434` (default)
- **Models**: Any Ollama-compatible model (qwen3-coder, llama3.2, codellama, etc.)
- **Key Components**:
  - `OllamaService` - Handles API communication with Ollama server
  - `OllamaContentGenerator` - Implements ContentGenerator interface for Ollama
  - `OllamaConfigPrompt` - Interactive setup UI component

Configure via environment variables:
- `OLLAMA_ENDPOINT` - Ollama server endpoint (default: http://localhost:11434)
- `OLLAMA_MODEL` - Model name (e.g., qwen3-coder:latest)

#### Cloud API (Legacy Support)
- **Mainland China**: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- **International**: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

Configure via environment variables:
- `OPENAI_API_KEY` - Your API key
- `OPENAI_BASE_URL` - API endpoint URL
- `OPENAI_MODEL` - Model name (e.g., qwen-coder-plus)

### Configuration Files
- Root `package.json` manages workspaces and scripts
- `tsconfig.json` - TypeScript configuration with composite project setup
- `eslint.config.js` - ESLint rules including custom monorepo import restrictions
- Individual package configs in `packages/*/tsconfig.json` and `packages/*/package.json`

### Testing Strategy
- Unit tests with Vitest (`.test.ts/.test.tsx` files)
- Integration tests in `integration-tests/` directory
- Snapshot testing for UI components
- End-to-end testing with multiple sandbox configurations

## Development Notes

- Node.js 20+ required
- Uses ES modules throughout (`"type": "module"`)
- TypeScript with strict settings and composite project structure
- React components use Ink for terminal UI rendering
- All packages follow monorepo workspace pattern
- Custom ESLint rule prevents cross-package relative imports

### Ollama Integration Architecture

#### Key Files for Ollama Implementation:
- `packages/core/src/services/ollamaService.ts` - Ollama API service layer
- `packages/core/src/core/ollamaContentGenerator.ts` - ContentGenerator implementation for Ollama
- `packages/cli/src/ui/components/OllamaConfigPrompt.tsx` - Interactive configuration UI
- `packages/cli/src/ui/components/AuthDialog.tsx` - Updated to show Ollama option
- `packages/cli/src/config/auth.ts` - Authentication validation for Ollama
- `packages/cli/src/config/config.ts` - CLI argument parsing for Ollama options

#### Architecture Features:
- **Message Format Translation**: Converts between Gemini and Ollama message formats
- **Streaming Support**: Handles real-time streaming responses with chunk validation
- **Function Calling Compatibility**: Text-based function calling simulation for models without native support
- **Error Handling**: Comprehensive error handling with user-friendly troubleshooting guidance
- **Model Management**: Dynamic model discovery and selection from Ollama server
- **Connection Testing**: Real-time connection validation and model availability checking

#### Development Workflow:
1. **Local Testing**: Use `npm run start` with Ollama running locally
2. **Model Testing**: Install test models with `ollama pull llama3.2:latest`
3. **Debugging**: Set `DEBUG_OLLAMA=true` for detailed API logging
4. **Integration Testing**: Test with various models and configurations