# ChatToCodex

ChatToCodex is a headless local MCP bridge. Configure an OpenAI Secure MCP Tunnel once, keep the bridge online, and any ChatGPT conversation that can call the connector can immediately use local development tools within the configured access roots.

## V0.2 behavior

- No Electron runtime.
- `setup` stores the Tunnel ID and puts the Tunnel API key in OS-native secure credential storage.
- `start` launches a local MCP server plus OpenAI `tunnel-client`.
- No per-chat workspace selection is required.
- Any ChatGPT conversation using ChatToCodex can call local file/command tools directly with a path or `workdir`.
- Access is bounded by `allowedRoots`. The default is the current user's home directory, so the connector can work across local projects without binding itself to one project instance.

## Usage

```bash
npm install
node src/cli.mjs setup
node src/cli.mjs start
```

After that, a ChatGPT conversation can ask ChatToCodex to operate on an allowed local path directly. For example, the model can call `read_file` with an absolute path or `run_command` with a project directory as `workdir`.

## Credentials

The OpenAI Tunnel API key is stored in:

- macOS: Keychain
- Windows: Credential Manager (CredentialManager PowerShell module)
- Linux: Secret Service via `secret-tool`

Legacy `~/.chat-to-codex/credentials.json` is migrated into secure storage and then deleted.

The API key is only for OpenAI `tunnel-client`. The ChatGPT custom MCP app itself uses **No Auth**.

## Access model

There is no active-workspace prerequisite. File and command tools validate their target against the configured `allowedRoots` on every call. This keeps ChatToCodex always connected while allowing any chat to address any permitted project directly.

## Origin

This project was created after studying the MIT-licensed Chat On Steroids project and reuses architectural ideas around OpenAI Secure MCP Tunnel lifecycle and local MCP exposure. Any source copied from third-party projects must retain the relevant license notices before redistribution.
