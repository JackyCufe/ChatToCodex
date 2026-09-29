# ChatToCodex

Use ChatGPT or Codex conversations to work with coding projects on your own computer through an OpenAI Secure MCP Tunnel.

ChatToCodex runs a small local MCP Host on your Mac or Windows PC. After one-time setup, supported ChatGPT/Codex conversations can list/read/write files and run commands inside the local roots you allow.

> ChatToCodex is an independent open-source project. It is not made, sponsored, or endorsed by OpenAI.

## What you get

- Local MCP tools: `access_status`, `list_directory`, `read_file`, `write_file`, `run_command`.
- No Electron app required.
- No per-chat workspace-selection step: each tool call can address an explicit permitted path.
- macOS background Host through LaunchAgent.
- Windows background Host through Task Scheduler.
- API keys stored with macOS Keychain or Windows DPAPI instead of committed to the repository.
- `pause` / `resume` controls when the local bridge is available.

## Before you install

Read [Requirements](docs/REQUIREMENTS.md).

At a minimum you need:

1. Node.js 20+ and npm.
2. OpenAI `tunnel-client`.
3. An OpenAI Secure MCP Tunnel ID.
4. A Restricted runtime API key with the Tunnel permissions required to run the client.
5. ChatGPT Developer mode / developer-mode MCP App access for the account or workspace you want to use.

OpenAI's Secure MCP Tunnel is an outbound connection for private MCP servers: the local server does not need a public inbound port. The Tunnel runtime must remain healthy while ChatGPT/Codex discovers or calls the MCP tools.

## Installation

### macOS

```bash
git clone https://github.com/JackyCufe/ChatToCodex.git
cd ChatToCodex
npm install
npm link
chat-to-codex install
```

Then follow the complete [macOS installation guide](docs/INSTALL_MAC.md).

### Windows

Download/clone the repository and extract it completely. From the ChatToCodex folder run:

```cmd
install-windows.cmd
```

Then:

```cmd
chat-to-codex install
```

See the complete [Windows installation guide](docs/INSTALL_WINDOWS.md).

## Where do I get the Tunnel ID and API key?

Use OpenAI Platform's Secure MCP Tunnel settings:

1. Create a Tunnel for the computer you are connecting.
2. Copy its `tunnel_id` (`tunnel_...`).
3. Create a Restricted runtime API key for the local `tunnel-client`.
4. Make sure the relevant account/role has the required Tunnel permissions.
5. Run `chat-to-codex install` and enter those two values locally.

Do **not** commit the API key. Do **not** paste the runtime API key into the ChatGPT MCP App authentication field.

See [Requirements](docs/REQUIREMENTS.md) for the permission breakdown.

## Connect ChatGPT / Codex

First make sure the local Host is running:

```bash
chat-to-codex doctor
chat-to-codex status
```

Then in ChatGPT Developer mode:

1. Open Plugins and create a developer-mode MCP App.
2. Choose **Tunnel**.
3. Select your Tunnel or paste your `tunnel_id`.
4. Recommended app name: **ChatToCodex Core**.
5. Use **No Auth** for the ChatToCodex MCP App.
6. Create the connection and review the discovered tools.

After the connection exists, add/select it in a supported ChatGPT/Codex conversation and try a harmless read or `git status` first.

## Normal commands

```bash
chat-to-codex status
chat-to-codex doctor
chat-to-codex pause
chat-to-codex resume
chat-to-codex uninstall
```

`uninstall` removes the background Host but keeps the local configuration/credential data unless you remove those separately.

## Security model

By default, ChatToCodex permits paths under the current user's home directory. Every filesystem/command request is checked against configured `allowedRoots`.

The Local Host being online does not mean ChatGPT is continuously operating your computer. Tools execute when a supported conversation invokes them. Use `chat-to-codex pause` whenever you want the bridge offline.

Treat `write_file` and `run_command` as powerful local capabilities. Review the requested action before allowing destructive work.

## Documentation

- [Requirements](docs/REQUIREMENTS.md)
- [Install on macOS](docs/INSTALL_MAC.md)
- [Install on Windows](docs/INSTALL_WINDOWS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Development

```bash
npm run check
npm test
npm run test:package
```

The package test verifies that the CLI and Windows installers are included while the real `.env` is excluded.

## Plugin package

This repository also contains the ChatToCodex skill/plugin source under `plugin/chat-to-codex/` for development/testing. The GitHub repository being public does **not** automatically publish that plugin to OpenAI's public Plugin Directory.

Secure MCP Tunnel is intended for private MCP connectivity. Users create/connect their own developer-mode MCP App to their own Tunnel.

## License

ChatToCodex is released under the [MIT License](LICENSE). See [Third-party notices](THIRD_PARTY_NOTICES.md).
