# ChatToCodex

ChatToCodex turns a ChatGPT custom MCP plugin into an **always-available local coding bridge**. You configure it once; after that, any ChatGPT conversation that calls ChatToCodex can use permitted local file and shell tools without first opening Electron, selecting a project instance, or starting a terminal process manually.

## How the formal version works

```text
ChatGPT conversation
        ↓
ChatToCodex plugin / MCP app
        ↓
OpenAI Secure MCP Tunnel
        ↓
ChatToCodex Local Host (runs in the background)
        ↓
local files / shell / repositories
```

The Local Host is what makes the plugin feel immediate. It starts with your user session and waits for ChatGPT calls; being online does **not** mean ChatGPT is continuously operating the computer. Local tools run only when a conversation actually invokes them.

## One-time installation

Clone/install the package, then expose the CLI (during development, `npm link` is convenient):

```bash
npm install
npm link
chat-to-codex install
```

`install` does two things:

1. Ensures the OpenAI Tunnel ID and Tunnel API key are configured.
2. Installs and starts the local background host.

Background-host implementation:

- **macOS:** per-user LaunchAgent (`launchd`)
- **Windows:** per-user Task Scheduler task at logon
- **Linux:** `systemd --user` service

After that, add/refresh the ChatToCodex custom MCP app in ChatGPT once, select the same OpenAI Secure MCP Tunnel, and use **No Auth** for the MCP app. From then on, normal use happens entirely from ChatGPT.

## Normal commands

```bash
chat-to-codex status
chat-to-codex pause
chat-to-codex resume
chat-to-codex uninstall
```

- `pause` immediately stops the background host and blocks local access.
- `resume` restores the background host.
- `uninstall` removes only the background host; configuration and credentials remain.

For development only:

```bash
chat-to-codex setup
chat-to-codex start
chat-to-codex doctor
```

`start` runs the Local Host in the current terminal instead of using the OS background service.

## Credentials and `.env`

ChatToCodex prefers a non-empty `.env` value when supplied:

```env
OPENAI_TUNNEL_ID=tunnel_0123456789abcdef0123456789abcdef
OPENAI_TUNNEL_API_KEY=sk-...
```

`.env` is gitignored and must never be committed. If the API-key entry is blank or absent, ChatToCodex uses the OS-protected credential store:

- macOS: Keychain
- Windows: DPAPI scoped to the current Windows user
- Linux: Secret Service (`secret-tool`)

The Tunnel API key is only passed to OpenAI `tunnel-client`; the ChatGPT MCP app itself remains **No Auth**.

## Local access model

There is no per-chat active-workspace prerequisite. Every tool call validates its target against `allowedRoots`. The default is the current user's home directory, allowing different conversations to work on different permitted projects without switching a global project instance.

## Windows

Requirements:

1. Current Node.js (20+ recommended).
2. OpenAI `tunnel-client.exe` on `PATH`, or `TUNNEL_CLIENT_PATH` set in `.env`.
3. A valid OpenAI Secure MCP Tunnel ID and Restricted API key with **Tunnels: Read + Use**.

PowerShell example:

```powershell
git clone https://github.com/JackyCufe/ChatToCodex.git
cd ChatToCodex
npm install
npm link
chat-to-codex install
```

On Windows, shell commands use `cmd.exe /d /s /c`, the API key can be protected with Windows DPAPI, and the Local Host is registered as a per-user logon task.

## ChatGPT Plugin

ChatToCodex also ships as a ChatGPT Plugin package. The Plugin provides the ChatGPT-side identity, onboarding workflow, and instructions for using the local MCP app.

Private test plugin:

- Plugin ID: `plugins_6aba29bdb3bc8191a036251ed71a7ef4`
- Version: `0.1.0`
- Plugin page: `https://chatgpt.com/plugins/plugins_6aba29bdb3bc8191a036251ed71a7ef4`

The Plugin source lives under `plugin/chat-to-codex/`.

### Why one Tunnel-binding step still exists

OpenAI Secure MCP Tunnel is a private per-user/per-workspace transport. A portable Plugin package cannot embed one shared Tunnel ID for every customer. Each customer therefore performs one first-time binding in ChatGPT: create/connect the **ChatToCodex** MCP app, choose **Tunnel**, select their own Tunnel ID, and use **No Auth**. After that, the Plugin can be invoked from supported conversations while the Local Host remains available in the background.

This is different from a public hosted MCP plugin, which requires a stable public HTTPS MCP endpoint. ChatToCodex intentionally keeps the coding runtime on the user's own machine.

## Diagnostics

```bash
chat-to-codex doctor
chat-to-codex status
```

`doctor` checks Tunnel configuration, secure credential storage, `tunnel-client`, access roots, and background-host state.

## Development

```bash
npm run check
npm test
```

## Origin

This project was created after studying the MIT-licensed Chat On Steroids project and reuses architectural ideas around OpenAI Secure MCP Tunnel lifecycle and local MCP exposure. Any source copied or adapted from third-party projects must retain the relevant license notices before redistribution.
