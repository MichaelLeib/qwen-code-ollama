# Qwen Code

![Qwen Code Screenshot](./docs/assets/qwen-screenshot.png)

Qwen Code is a command-line AI workflow tool adapted from [**Gemini CLI**](https://github.com/google-gemini/gemini-cli) (Please refer to [this document](./README.gemini.md) for more details), optimized for [Qwen3-Coder](https://github.com/QwenLM/Qwen3-Coder) models with **local Ollama integration** and enhanced parser support & tool support.

> [!WARNING]
> Qwen Code may issue multiple API calls per cycle, resulting in higher token usage, similar to Claude Code. We’re actively working to enhance API efficiency and improve the overall developer experience.

## Key Features

- **Local AI with Ollama** - Run AI models locally for privacy and offline access
- **Code Understanding & Editing** - Query and edit large codebases beyond traditional context window limits
- **Workflow Automation** - Automate operational tasks like handling pull requests and complex rebases
- **Enhanced Parser** - Adapted parser specifically optimized for Qwen-Coder models
- **Flexible Configuration** - Support for both cloud APIs and local Ollama deployments

## Quick Start

### Prerequisites

Ensure you have [Node.js version 20](https://nodejs.org/en/download) or higher installed.

```bash
curl -qL https://www.npmjs.com/install.sh | sh
```

### Installation

```bash
npm install -g @qwen-code/qwen-code
qwen --version
```

Then run from anywhere:

```bash
qwen
```

Or you can install it from source:

```bash
git clone https://github.com/QwenLM/qwen-code.git
cd qwen-code
npm install
npm install -g .
```

### Configuration Options

Qwen Code supports two deployment modes:

#### Option 1: Local Ollama (Recommended for Privacy)

1. **Install Ollama:**
   ```bash
   # Visit https://ollama.ai/download for installation instructions
   # Or use:
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Start Ollama service:**
   ```bash
   ollama serve
   ```

3. **Install a model:**
   ```bash
   # Install Qwen3-Coder model
   ollama pull qwen3-coder:latest
   
   # Or other popular models:
   ollama pull llama3.2:latest
   ollama pull codellama:latest
   ```

4. **Run Qwen Code:**
   ```bash
   qwen
   # The application will automatically detect Ollama and prompt for configuration
   ```

5. **Environment Variables (Optional):**
   ```bash
   export OLLAMA_ENDPOINT="http://localhost:11434"
   export OLLAMA_MODEL="qwen3-coder:latest"
   ```

#### Option 2: Cloud API

Set your Qwen API key (In Qwen Code project, you can also set your API key in `.env` file). The `.env` file should be placed in the root directory of your current project.

> ⚠️ **Notice:** <br>
> **If you are in mainland China, please go to https://bailian.console.aliyun.com/ to apply for your API key** <br>
> **If you are not in mainland China, please go to https://modelstudio.console.alibabacloud.com/ to apply for your API key**

```bash
# If you are in mainland China, use the following URL:
# https://dashscope.aliyuncs.com/compatible-mode/v1
# If you are not in mainland China, use the following URL:
# https://dashscope-intl.aliyuncs.com/compatible-mode/v1
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="your_api_base_url_here"
export OPENAI_MODEL="your_api_model_here"
```

## Usage Examples

### First Run with Ollama

When you run `qwen` for the first time, it will guide you through the Ollama setup:

```bash
$ qwen
┌─────────────────────────────────────────────────────────────────┐
│                      Ollama Configuration                       │
├─────────────────────────────────────────────────────────────────┤
│ Configure your Ollama server endpoint and select a model.      │
│                                                                 │
│ ✅ Connected • 3 models available                               │
│                                                                 │
│ Endpoint:   > http://localhost:11434                           │
│ Model:      > qwen3-coder:latest (7B, Q4_K_M, 4.2 GB)         │
│                                                                 │
│ Available models (use ↑↓ to select):                           │
│   → qwen3-coder:latest (7B, Q4_K_M, 4.2 GB)                   │
│     llama3.2:latest (3B, Q4_K_M, 2.0 GB)                      │
│     codellama:latest (7B, Q4_K_M, 3.8 GB)                     │
│                                                                 │
│ ✨ Press Enter to confirm • ↑↓ to select model • Esc to cancel │
└─────────────────────────────────────────────────────────────────┘
```

### Explore Codebases

```sh
cd your-project/
qwen
> Describe the main pieces of this system's architecture
```

### Code Development

```sh
> Refactor this function to improve readability and performance
```

### Automate Workflows

```sh
> Analyze git commits from the last 7 days, grouped by feature and team member
```

```sh
> Convert all images in this directory to PNG format
```

## Popular Tasks

### Understand New Codebases

```text
> What are the core business logic components?
> What security mechanisms are in place?
> How does the data flow work?
```

### Code Refactoring & Optimization

```text
> What parts of this module can be optimized?
> Help me refactor this class to follow better design patterns
> Add proper error handling and logging
```

### Documentation & Testing

```text
> Generate comprehensive JSDoc comments for this function
> Write unit tests for this component
> Create API documentation
```

## Benchmark Results

### Terminal-Bench

| Agent     | Model              | Accuracy |
| --------- | ------------------ | -------- |
| Qwen Code | Qwen3-Coder-480A35 | 37.5     |

## Project Structure

```
qwen-code/
├── packages/           # Core packages
├── docs/              # Documentation
├── examples/          # Example code
└── tests/            # Test files
```

## Development & Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) to learn how to contribute to the project.

## Troubleshooting

### Ollama Issues

#### Connection Failed
```
❌ Connection refused. Start Ollama with: ollama serve

• Install Ollama: https://ollama.ai/download
• Start server: ollama serve
• Install models: ollama pull llama3.2
```

**Solution:**
1. Make sure Ollama is installed and running: `ollama serve`
2. Check if the endpoint is correct (default: `http://localhost:11434`)
3. Verify Ollama is accessible: `curl http://localhost:11434/api/tags`

#### No Models Found
```
❌ No models found. Install models with: ollama pull llama3.2
```

**Solution:**
```bash
# Install recommended models
ollama pull qwen3-coder:latest    # Best for coding tasks
ollama pull llama3.2:latest       # General purpose
ollama pull codellama:latest      # Code generation
```

#### Model Performance Issues
- **Slow responses:** Consider using smaller models like `llama3.2:3b`
- **High memory usage:** Use quantized versions (Q4_K_M is recommended)
- **GPU acceleration:** Ensure CUDA/Metal is properly configured

#### Environment Variables
```bash
# Override default settings
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="qwen3-coder:latest"

# For custom Ollama installations
export OLLAMA_ENDPOINT="http://your-server:11434"
```

### General Issues

If you encounter other issues, check the [troubleshooting guide](docs/troubleshooting.md).

## Acknowledgments

This project is based on [Google Gemini CLI](https://github.com/google-gemini/gemini-cli). We acknowledge and appreciate the excellent work of the Gemini CLI team. Our main contribution focuses on parser-level adaptations to better support Qwen-Coder models.

## License

[LICENSE](./LICENSE)
