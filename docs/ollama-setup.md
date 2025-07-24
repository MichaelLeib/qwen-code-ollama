# Ollama Setup Guide

This guide walks you through setting up Ollama for use with Qwen Code, providing local AI capabilities for privacy and offline access.

## Quick Start

### 1. Install Ollama

#### macOS
```bash
# Using Homebrew (recommended)
brew install ollama

# Or download from https://ollama.ai/download
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows
Download the installer from [https://ollama.ai/download](https://ollama.ai/download)

### 2. Start Ollama Service

```bash
# Start the Ollama service
ollama serve

# The service will run on http://localhost:11434 by default
```

### 3. Install Models

```bash
# Install Qwen3-Coder (recommended for coding tasks)
ollama pull qwen3-coder:latest

# Install other popular models
ollama pull llama3.2:latest      # General purpose, 3B parameters
ollama pull codellama:latest     # Code-focused model
ollama pull mistral:latest       # Alternative general model

# For better performance on limited hardware
ollama pull llama3.2:3b         # Smaller, faster model
```

### 4. Verify Installation

```bash
# List installed models
ollama list

# Test API connectivity
curl http://localhost:11434/api/tags
```

### 5. Run Qwen Code

```bash
# Start Qwen Code - it will automatically detect Ollama
qwen

# Or with specific configuration
qwen --ollama-endpoint http://localhost:11434 --ollama-model qwen3-coder:latest
```

## Advanced Configuration

### Custom Endpoint

If you're running Ollama on a different port or server:

```bash
# Environment variables
export OLLAMA_ENDPOINT="http://your-server:11434"
export OLLAMA_MODEL="qwen3-coder:latest"

# Or CLI arguments
qwen --ollama-endpoint http://your-server:11434 --ollama-model qwen3-coder:latest
```

### Model Recommendations

| Model | Size | Best For | Memory Required |
|-------|------|----------|----------------|
| `qwen3-coder:latest` | ~7B | Code generation, analysis | 8GB+ |
| `llama3.2:latest` | ~3B | General tasks, chat | 4GB+ |
| `codellama:latest` | ~7B | Code completion, debugging | 8GB+ |
| `mistral:latest` | ~7B | General tasks, reasoning | 8GB+ |
| `llama3.2:3b` | ~3B | Lightweight, fast responses | 4GB+ |

### Performance Optimization

#### GPU Acceleration

Ollama automatically uses GPU when available:

```bash
# Verify GPU usage
ollama ps

# Check GPU memory usage during inference
nvidia-smi  # For NVIDIA GPUs
```

#### Model Quantization

Use quantized models for better performance:

```bash
# These are automatically quantized (Q4_K_M by default)
ollama pull qwen3-coder:latest
ollama pull llama3.2:latest

# For even smaller models
ollama pull llama3.2:3b
```

#### Resource Limits

Configure Ollama resource usage:

```bash
# Set environment variables before starting
export OLLAMA_NUM_PARALLEL=2      # Number of parallel requests
export OLLAMA_MAX_LOADED_MODELS=2 # Max models in memory
export OLLAMA_FLASH_ATTENTION=1   # Enable flash attention

ollama serve
```

## Troubleshooting

### Connection Issues

#### Service Not Running
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start the service
ollama serve

# Or run as daemon (Linux/macOS)
nohup ollama serve > ollama.log 2>&1 &
```

#### Port Conflicts
```bash
# Check what's using port 11434
lsof -i :11434

# Use different port
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

#### Permission Issues (Linux)
```bash
# Add user to ollama group (if exists)
sudo usermod -aG ollama $USER

# Or run with appropriate permissions
sudo ollama serve
```

### Model Issues

#### Download Failures
```bash
# Clear cache and retry
rm -rf ~/.ollama/models/[model-name]
ollama pull qwen3-coder:latest

# Check disk space
df -h ~/.ollama
```

#### Memory Issues
```bash
# Use smaller models
ollama pull llama3.2:3b

# Monitor memory usage
htop

# Clear unused models
ollama rm unused-model-name
```

#### Performance Issues
```bash
# Check model status
ollama ps

# Restart Ollama service
pkill ollama
ollama serve

# Update to latest version
curl -fsSL https://ollama.ai/install.sh | sh
```

### Qwen Code Integration Issues

#### Model Not Detected
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check model exists: `ollama list`
3. Restart Qwen Code: `qwen`

#### Slow Responses
1. Use smaller models: `llama3.2:3b`
2. Enable GPU acceleration
3. Increase system memory
4. Close other memory-intensive applications

#### Error Messages
Common errors and solutions:

```bash
# "Connection refused"
ollama serve

# "Model not found"
ollama pull qwen3-coder:latest

# "Out of memory"
ollama pull llama3.2:3b  # Use smaller model
```

## Model Development

### Custom Models

You can create custom models with Ollama:

```bash
# Create a Modelfile
cat << EOF > Modelfile
FROM qwen3-coder:latest
SYSTEM "You are a specialized coding assistant for [your use case]."
TEMPERATURE 0.1
EOF

# Build custom model
ollama create my-custom-coder -f Modelfile

# Use with Qwen Code
qwen --ollama-model my-custom-coder
```

### Model Updates

```bash
# Update to latest version
ollama pull qwen3-coder:latest

# List available versions
ollama list qwen3-coder

# Remove old versions
ollama rm qwen3-coder:old-version
```

## Security Considerations

### Network Security

- Ollama runs locally by default (localhost:11434)
- For remote access, use proper authentication and encryption
- Consider firewall rules for production deployments

### Data Privacy

- All inference happens locally
- No data sent to external servers
- Models and conversations stored locally in `~/.ollama/`

### Access Control

For shared systems:

```bash
# Run Ollama with specific user
sudo -u ollama-user ollama serve

# Restrict access to localhost only
OLLAMA_HOST=127.0.0.1:11434 ollama serve
```

## Integration Examples

### Environment Setup

```bash
# .env file for Qwen Code project
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:latest
DEBUG_OLLAMA=false
```

### Docker Deployment

```dockerfile
# Dockerfile for Ollama
FROM ollama/ollama:latest

# Install models during build
RUN ollama serve & sleep 5 && ollama pull qwen3-coder:latest

EXPOSE 11434
CMD ["ollama", "serve"]
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Setup Ollama
  run: |
    curl -fsSL https://ollama.ai/install.sh | sh
    ollama serve &
    sleep 10
    ollama pull llama3.2:3b

- name: Run Qwen Code Tests
  run: |
    npm test
  env:
    OLLAMA_ENDPOINT: http://localhost:11434
    OLLAMA_MODEL: llama3.2:3b
```

## Resources

- [Ollama Documentation](https://ollama.ai/docs)
- [Model Library](https://ollama.ai/library)
- [Qwen3-Coder Models](https://ollama.ai/library/qwen3-coder)
- [Performance Benchmarks](https://ollama.ai/blog/performance)
- [Community Discord](https://discord.gg/ollama)

## Support

For Ollama-specific issues:
- [Ollama GitHub Issues](https://github.com/ollama/ollama/issues)
- [Ollama Community Forum](https://github.com/ollama/ollama/discussions)

For Qwen Code integration issues:
- [Qwen Code Issues](https://github.com/QwenLM/qwen-code/issues)