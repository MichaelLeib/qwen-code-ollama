# Troubleshooting Guide

This guide provides solutions to common issues and debugging tips.

## Ollama Issues

### Connection Problems

- **Error: `Connection refused`**
  - **Solution**: Start the Ollama service: `ollama serve`
  - **Verify**: Check if Ollama is running: `curl http://localhost:11434/api/tags`
  - **Alternative**: Try a different port: `OLLAMA_HOST=0.0.0.0:11435 ollama serve`

- **Error: `No models found`**
  - **Solution**: Install models: `ollama pull qwen3-coder:latest`
  - **Verify**: List models: `ollama list`
  - **Recommended models**: 
    - `qwen3-coder:latest` for coding tasks
    - `llama3.2:latest` for general use
    - `codellama:latest` for code generation

### Performance Issues

- **Slow responses**
  - Try smaller models: `ollama pull llama3.2:3b`
  - Check system resources: `htop` or Activity Monitor
  - Ensure GPU acceleration is working: `nvidia-smi` (NVIDIA) or check Activity Monitor (macOS)

- **Out of memory errors**
  - Use quantized models (default in Ollama)
  - Close other memory-intensive applications
  - Use smaller models like `llama3.2:3b`

- **High CPU usage**
  - Enable GPU acceleration if available
  - Reduce parallel requests: `export OLLAMA_NUM_PARALLEL=1`
  - Consider upgrading hardware

### Configuration Issues

- **Model not detected in Qwen Code**
  - Restart Qwen Code: `qwen`
  - Verify model exists: `ollama list`
  - Check endpoint configuration: `echo $OLLAMA_ENDPOINT`

- **Authentication dialog shows cloud options**
  - This is normal - Ollama is the default, but cloud APIs are still supported
  - Select "Ollama" option and configure your endpoint

### Debug Mode

Enable detailed logging:

```bash
export DEBUG_OLLAMA=true
qwen --debug
```

For more Ollama-specific help, see the [Ollama Setup Guide](./ollama-setup.md).

## Authentication (Cloud APIs)

- **Error: `Failed to login. Message: Request contains an invalid argument`**
  - Users with Google Workspace accounts, or users with Google Cloud accounts
    associated with their Gmail accounts may not be able to activate the free
    tier of the Google Code Assist plan.
  - For Google Cloud accounts, you can work around this by setting
    `GOOGLE_CLOUD_PROJECT` to your project ID.
  - You can also grab an API key from [AI Studio](https://aistudio.google.com/app/apikey), which also includes a
    separate free tier.

## Frequently asked questions (FAQs)

- **Q: How do I update Gemini CLI to the latest version?**
  - A: If installed globally via npm, update Gemini CLI using the command `npm install -g @google/gemini-cli@latest`. If run from source, pull the latest changes from the repository and rebuild using `npm run build`.

- **Q: Where are Gemini CLI configuration files stored?**
  - A: The CLI configuration is stored within two `settings.json` files: one in your home directory and one in your project's root directory. In both locations, `settings.json` is found in the `.qwen/` folder. Refer to [CLI Configuration](./cli/configuration.md) for more details.

- **Q: Why don't I see cached token counts in my stats output?**
  - A: Cached token information is only displayed when cached tokens are being used. This feature is available for API key users (Gemini API key or Vertex AI) but not for OAuth users (Google Personal/Enterprise accounts) at this time, as the Code Assist API does not support cached content creation. You can still view your total token usage with the `/stats` command.

## Common error messages and solutions

- **Error: `EADDRINUSE` (Address already in use) when starting an MCP server.**
  - **Cause:** Another process is already using the port the MCP server is trying to bind to.
  - **Solution:**
    Either stop the other process that is using the port or configure the MCP server to use a different port.

- **Error: Command not found (when attempting to run Gemini CLI).**
  - **Cause:** Gemini CLI is not correctly installed or not in your system's PATH.
  - **Solution:**
    1.  Ensure Gemini CLI installation was successful.
    2.  If installed globally, check that your npm global binary directory is in your PATH.
    3.  If running from source, ensure you are using the correct command to invoke it (e.g., `node packages/cli/dist/index.js ...`).

- **Error: `MODULE_NOT_FOUND` or import errors.**
  - **Cause:** Dependencies are not installed correctly, or the project hasn't been built.
  - **Solution:**
    1.  Run `npm install` to ensure all dependencies are present.
    2.  Run `npm run build` to compile the project.

- **Error: "Operation not permitted", "Permission denied", or similar.**
  - **Cause:** If sandboxing is enabled, then the application is likely attempting an operation restricted by your sandbox, such as writing outside the project directory or system temp directory.
  - **Solution:** See [Sandboxing](./cli/configuration.md#sandboxing) for more information, including how to customize your sandbox configuration.

- **CLI is not interactive in "CI" environments**
  - **Issue:** The CLI does not enter interactive mode (no prompt appears) if an environment variable starting with `CI_` (e.g., `CI_TOKEN`) is set. This is because the `is-in-ci` package, used by the underlying UI framework, detects these variables and assumes a non-interactive CI environment.
  - **Cause:** The `is-in-ci` package checks for the presence of `CI`, `CONTINUOUS_INTEGRATION`, or any environment variable with a `CI_` prefix. When any of these are found, it signals that the environment is non-interactive, which prevents the CLI from starting in its interactive mode.
  - **Solution:** If the `CI_` prefixed variable is not needed for the CLI to function, you can temporarily unset it for the command. e.g., `env -u CI_TOKEN gemini`

## Debugging Tips

- **CLI debugging:**
  - Use the `--verbose` flag (if available) with CLI commands for more detailed output.
  - Check the CLI logs, often found in a user-specific configuration or cache directory.

- **Core debugging:**
  - Check the server console output for error messages or stack traces.
  - Increase log verbosity if configurable.
  - Use Node.js debugging tools (e.g., `node --inspect`) if you need to step through server-side code.

- **Tool issues:**
  - If a specific tool is failing, try to isolate the issue by running the simplest possible version of the command or operation the tool performs.
  - For `run_shell_command`, check that the command works directly in your shell first.
  - For file system tools, double-check paths and permissions.

- **Pre-flight checks:**
  - Always run `npm run preflight` before committing code. This can catch many common issues related to formatting, linting, and type errors.

If you encounter an issue not covered here, consider searching the project's issue tracker on GitHub or reporting a new issue with detailed information.
