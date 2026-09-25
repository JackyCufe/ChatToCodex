# ChatToCodex

ChatToCodex is a headless local MCP bridge. Configure an OpenAI Secure MCP Tunnel once, keep the bridge online, and any ChatGPT conversation that can call the connector can immediately use local development tools within the configured access roots.

## What it does

- No Electron runtime is required.
- Starts a local MCP server and OpenAI `tunnel-client`.
- No per-chat workspace-selection step is required.
- Any ChatGPT conversation using ChatToCodex can call local file and command tools directly with a path or `workdir`.
- Access is bounded by `allowedRoots`; the default is the current user's home directory.
- Supports macOS, Windows, and Linux runtime paths.

## Quick start

```bash
npm install
node src/cli.mjs setup
node src/cli.mjs start
```

You can also provide the connection settings in a local `.env` file:

```env
OPENAI_TUNNEL_ID=tunnel_0123456789abcdef0123456789abcdef
OPENAI_TUNNEL_API_KEY=sk-...
```

`.env` is gitignored and must never be committed. An empty `OPENAI_TUNNEL_API_KEY` falls back to the OS credential store.

## Credentials

ChatToCodex uses OS-protected credential storage when the key is not supplied through `.env`:

- macOS: Keychain
- Windows: DPAPI scoped to the current Windows user
- Linux: Secret Service via `secret-tool`

Legacy `~/.chat-to-codex/credentials.json` is migrated into secure storage and then deleted.

The API key is only for OpenAI `tunnel-client`. The ChatGPT custom MCP app itself uses **No Auth**.

## Windows

Requirements:

1. Node.js 20+.
2. OpenAI `tunnel-client.exe` on `PATH`, or set `TUNNEL_CLIENT_PATH` in `.env`.
3. A valid OpenAI Secure MCP Tunnel ID and Restricted API key with **Tunnels: Read + Use**.

Example PowerShell flow:

```powershell
git clone <your-repo-url>
cd ChatToCodex
npm install
Copy-Item .env.example .env
# Edit .env with your own Tunnel ID / API key
node src/cli.mjs doctor
node src/cli.mjs start
```

`run_command` uses `cmd.exe /d /s /c` on Windows and uses the requested `workdir` directly, so no Unix shell is required.

## Access model

There is no active-workspace prerequisite. File and command tools validate their target against the configured `allowedRoots` on every call. This keeps ChatToCodex always connected while allowing any chat to address any permitted project directly.

## Development

```bash
npm run check
npm test
```

## Origin

This project was created after studying the MIT-licensed Chat On Steroids project and reuses architectural ideas around OpenAI Secure MCP Tunnel lifecycle and local MCP exposure. Any source copied from third-party projects must retain the relevant license notices before redistribution.
