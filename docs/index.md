# Welcome to Qwen Code CLI documentation

This documentation provides a comprehensive guide to installing, using, and developing Qwen Code CLI. This tool lets you interact with AI models through a command-line interface, with **local Ollama integration** for privacy and offline access.

## Overview

Qwen Code CLI brings the capabilities of AI models to your terminal in an interactive Read-Eval-Print Loop (REPL) environment. The CLI consists of a client-side application (`packages/cli`) that communicates with a local server (`packages/core`), which manages requests to **local Ollama servers** or cloud APIs. The system includes a variety of tools for tasks such as performing file system operations, running shells, and web fetching.

### Key Features

- **🏠 Local AI with Ollama**: Run models locally for privacy and offline access
- **🔧 Interactive Configuration**: Easy setup with automatic model detection
- **⚡ Streaming Responses**: Real-time response streaming with chunk validation
- **🛠️ Function Calling**: Compatible function calling even with models that don't natively support it
- **📊 Model Management**: Dynamic model discovery and selection
- **🔍 Connection Testing**: Real-time validation of Ollama server connectivity

## Navigating the documentation

This documentation is organized into the following sections:

- **[Ollama Setup Guide](./ollama-setup.md):** Complete guide for setting up and configuring Ollama for local AI inference.
- **[Migration Guide](./migration-guide.md):** Guide for migrating from cloud APIs to local Ollama integration.
- **[Execution and Deployment](./deployment.md):** Information for running Qwen Code CLI.
- **[Architecture Overview](./architecture.md):** Understand the high-level design of Qwen Code CLI, including its components and how they interact.
- **CLI Usage:** Documentation for `packages/cli`.
  - **[CLI Introduction](./cli/index.md):** Overview of the command-line interface.
  - **[Commands](./cli/commands.md):** Description of available CLI commands.
  - **[Configuration](./cli/configuration.md):** Information on configuring the CLI.
  - **[Checkpointing](./checkpointing.md):** Documentation for the checkpointing feature.
  - **[Extensions](./extension.md):** How to extend the CLI with new functionality.
  - **[Telemetry](./telemetry.md):** Overview of telemetry in the CLI.
- **Core Details:** Documentation for `packages/core`.
  - **[Core Introduction](./core/index.md):** Overview of the core component.
  - **[Tools API](./core/tools-api.md):** Information on how the core manages and exposes tools.
- **Tools:**
  - **[Tools Overview](./tools/index.md):** Overview of the available tools.
  - **[File System Tools](./tools/file-system.md):** Documentation for the `read_file` and `write_file` tools.
  - **[Multi-File Read Tool](./tools/multi-file.md):** Documentation for the `read_many_files` tool.
  - **[Shell Tool](./tools/shell.md):** Documentation for the `run_shell_command` tool.
  - **[Web Fetch Tool](./tools/web-fetch.md):** Documentation for the `web_fetch` tool.
  - **[Web Search Tool](./tools/web-search.md):** Documentation for the `google_web_search` tool.
  - **[Memory Tool](./tools/memory.md):** Documentation for the `save_memory` tool.
- **[Contributing & Development Guide](../CONTRIBUTING.md):** Information for contributors and developers, including setup, building, testing, and coding conventions.
- **[NPM Workspaces and Publishing](./npm.md):** Details on how the project's packages are managed and published.
- **[Troubleshooting Guide](./troubleshooting.md):** Find solutions to common problems and FAQs.
- **[Terms of Service and Privacy Notice](./tos-privacy.md):** Information on the terms of service and privacy notices applicable to your use of Gemini CLI.

We hope this documentation helps you make the most of the Gemini CLI!
