# ChatToCodex

ChatToCodex is a headless local MCP bridge. Configure an OpenAI Secure MCP Tunnel once, keep the bridge online, and choose a workspace only when you actually want a chat to work on a project.

## Current MVP

- No Electron runtime.
- `setup` stores Tunnel ID and API key locally.
- `start` launches a local MCP server plus OpenAI `tunnel-client`.
- The tunnel can stay connected with no workspace selected.
- `workspace <path>` changes the active workspace without restarting the tunnel.
- Core tools are intentionally small in v0.1: workspace status, read file, write file, list directory, run command.

## Usage

```bash
npm install
node src/cli.mjs setup
node src/cli.mjs start
```

In another terminal:

```bash
node src/cli.mjs workspace /path/to/project
node src/cli.mjs status
```

The OpenAI API key used here is the Restricted key with **Tunnels: Read + Use**. It is used only by `tunnel-client`; the ChatGPT custom MCP app itself uses **No Auth**.

## Security note

The first headless MVP stores the tunnel API key in a user-only file (`0600`) under `~/.chat-to-codex/credentials.json`. This removes the Electron dependency but is not yet equivalent to macOS Keychain / Windows Credential Manager / Linux Secret Service. OS-native credential storage is the next hardening step.

## Origin

This project was created after studying the MIT-licensed Chat On Steroids project and reuses architectural ideas around OpenAI Secure MCP Tunnel lifecycle and local MCP exposure. Any source copied from third-party projects must retain the relevant license notices before redistribution.
