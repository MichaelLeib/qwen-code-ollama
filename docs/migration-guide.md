# Migration Guide: Moving to Ollama Integration

This guide helps existing Qwen Code users migrate from cloud API authentication to the new local Ollama integration.

## What's New

### Major Changes

- **🆕 Local Ollama Support**: Run AI models locally for privacy and offline access
- **🔄 Updated Authentication Flow**: Interactive Ollama configuration replaces API key setup
- **📊 Model Selection**: Dynamic model discovery and selection from your Ollama server
- **⚡ Streaming Improvements**: Enhanced real-time response streaming
- **🛠️ Function Calling**: Improved compatibility layer for models without native function support

### Breaking Changes

- The default authentication method is now Ollama (instead of cloud APIs)
- New CLI arguments: `--ollama-endpoint` and `--ollama-model` 
- New environment variables: `OLLAMA_ENDPOINT` and `OLLAMA_MODEL`

## Migration Paths

### Option 1: Switch to Local Ollama (Recommended)

This provides better privacy, offline access, and potentially better performance.

#### Step 1: Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Or visit https://ollama.ai/download for other platforms
```

#### Step 2: Start Ollama and Install Models

```bash
# Start the Ollama service
ollama serve

# Install recommended models
ollama pull qwen3-coder:latest    # Best for coding tasks
ollama pull llama3.2:latest       # General purpose
ollama pull codellama:latest      # Code generation
```

#### Step 3: Configure Qwen Code

```bash
# Remove old API configurations (optional)
unset OPENAI_API_KEY
unset OPENAI_BASE_URL
unset OPENAI_MODEL

# Set Ollama configuration (optional - interactive setup is available)
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="qwen3-coder:latest"

# Run Qwen Code
qwen
```

### Option 2: Continue Using Cloud APIs

If you prefer to continue using cloud APIs, they're still supported as a legacy option.

#### Keep Your Existing Setup

Your existing environment variables will continue to work:

```bash
export OPENAI_API_KEY="your_api_key"
export OPENAI_BASE_URL="your_api_endpoint"
export OPENAI_MODEL="your_model"
```

#### Authentication Flow

The authentication dialog now shows "Ollama" as the primary option, but cloud API authentication is still available through the settings.

## Configuration Migration

### Environment Variables

| Old Variable | New Variable | Notes |
|-------------|--------------|-------|
| `OPENAI_API_KEY` | *(unchanged)* | Still supported for cloud APIs |
| `OPENAI_BASE_URL` | *(unchanged)* | Still supported for cloud APIs |
| `OPENAI_MODEL` | `OLLAMA_MODEL` | For Ollama models |
| *(new)* | `OLLAMA_ENDPOINT` | Ollama server endpoint |
| *(new)* | `DEBUG_OLLAMA` | Enable Ollama debug logging |

### CLI Arguments

| Old Argument | New Argument | Notes |
|-------------|--------------|-------|
| `-m, --model` | `-m, --model` | Now defaults to Ollama model |
| *(new)* | `--ollama-endpoint` | Specify Ollama server endpoint |
| *(new)* | `--ollama-model` | Specify Ollama model |

### Settings Files

Your existing `.qwen/.env` and settings files will continue to work. You can add Ollama configuration alongside existing settings.

Example `.qwen/.env`:

```bash
# Ollama configuration (recommended)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:latest

# Legacy cloud API configuration (still supported)
# OPENAI_API_KEY=your_key
# OPENAI_BASE_URL=your_endpoint
# OPENAI_MODEL=your_model
```

## Model Equivalents

If you were using cloud models, here are recommended local equivalents:

| Cloud Model | Local Ollama Equivalent | Notes |
|------------|------------------------|-------|
| `qwen-coder-plus` | `qwen3-coder:latest` | Latest Qwen3 Coder model |
| `qwen-coder-turbo` | `qwen3-coder:latest` | Same model, better performance locally |
| `gpt-4` | `llama3.2:latest` | General purpose alternative |
| `claude-3` | `mistral:latest` | Another general purpose option |
| `codellama` | `codellama:latest` | Direct equivalent |

## Feature Comparison

| Feature | Cloud APIs | Local Ollama |
|---------|------------|-------------|
| **Privacy** | ❌ Data sent to servers | ✅ Fully local |
| **Offline Access** | ❌ Requires internet | ✅ Works offline |
| **Cost** | 💰 Pay per token | ✅ Free after setup |
| **Performance** | 🌐 Network dependent | ⚡ Local hardware dependent |
| **Model Variety** | 🔄 Provider-dependent | 📦 Large model library |
| **Setup Complexity** | ✅ API key only | 🔧 Requires local setup |

## Troubleshooting Migration

### Common Issues

#### "Connection Refused" Error

```bash
# Solution: Start Ollama service
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

#### "No Models Found" Error

```bash
# Solution: Install models
ollama pull qwen3-coder:latest
ollama list  # Verify installation
```

#### Performance Issues

```bash
# Use smaller models for better performance
ollama pull llama3.2:3b

# Or check system resources
htop
nvidia-smi  # For GPU users
```

#### Authentication Dialog Shows Cloud Options

This is normal - Ollama is now the default, but cloud APIs remain supported for existing users.

### Getting Help

1. **Ollama Issues**: [Ollama Documentation](https://ollama.ai/docs)
2. **Qwen Code Issues**: [GitHub Issues](https://github.com/QwenLM/qwen-code/issues)
3. **Migration Questions**: Check the [Ollama Setup Guide](./ollama-setup.md)

## Performance Tips

### Hardware Optimization

- **GPU Acceleration**: Ensure CUDA/Metal is configured for GPU inference
- **Memory**: 8GB+ RAM recommended for 7B models, 4GB+ for 3B models
- **Storage**: SSD recommended for faster model loading

### Model Selection

- **Development**: `qwen3-coder:latest` for best coding assistance
- **General Use**: `llama3.2:latest` for balanced performance
- **Limited Resources**: `llama3.2:3b` for faster responses
- **Code Focus**: `codellama:latest` for specialized code generation

### Configuration Tuning

```bash
# Optimize for your hardware
export OLLAMA_NUM_PARALLEL=2      # Parallel requests
export OLLAMA_MAX_LOADED_MODELS=1 # Models in memory
export OLLAMA_FLASH_ATTENTION=1   # Memory optimization
```

## Benefits of Local Ollama

### Privacy & Security

- **No Data Transmission**: Code and conversations never leave your machine
- **No API Keys**: No sensitive credentials to manage
- **Audit Trail**: Full control over data and processing

### Cost & Performance

- **Zero API Costs**: No per-token charges after initial setup
- **Consistent Performance**: No network latency or rate limits
- **Offline Capability**: Work anywhere without internet

### Flexibility & Control

- **Model Choice**: Access to large library of open-source models
- **Custom Models**: Create specialized models for your use case
- **Version Control**: Pin to specific model versions

## Support

For questions about migration or setup:

1. Review the [Ollama Setup Guide](./ollama-setup.md)
2. Check the [Troubleshooting Section](./troubleshooting.md)
3. File issues on [GitHub](https://github.com/QwenLM/qwen-code/issues)

Welcome to the new Qwen Code with Ollama integration! 🚀