# Requirements

Before installing ChatToCodex, make sure the target computer and OpenAI account meet these requirements.

## Computer

- macOS or Windows. macOS is currently the most thoroughly validated platform; Windows support is included and should be tested on the target machine before relying on it for production work.
- Node.js 20 or newer, including npm.
- OpenAI `tunnel-client` installed and reachable on `PATH`, or configured with `TUNNEL_CLIENT_PATH`.
- Outbound HTTPS access to `api.openai.com:443`.
- A local user account that can install a per-user background service:
  - macOS: LaunchAgent (`launchd`)
  - Windows: Task Scheduler

## OpenAI

You need an OpenAI Platform organization/account that can use Secure MCP Tunnel and a ChatGPT workspace/account that can create a developer-mode MCP app.

For Tunnel permissions:

- Create/edit a Tunnel: **Tunnels Read + Manage**.
- Run `tunnel-client` and select a Tunnel while creating an app: **Tunnels Read + Use**.

You also need ChatGPT Developer mode enabled when required by your plan/workspace.

## Credentials you will create

You need two values. Keep them separate:

1. **Tunnel ID** — looks like `tunnel_0123456789abcdef0123456789abcdef`.
2. **Tunnel runtime API key** — a Restricted API key used by the local `tunnel-client`.

Never commit the API key to Git. Never paste the runtime API key into the ChatGPT MCP App authentication field. ChatToCodex stores it in the operating system credential store when you run the installer.
