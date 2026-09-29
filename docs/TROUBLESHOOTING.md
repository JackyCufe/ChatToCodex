# Troubleshooting

## `chat-to-codex` is not recognized on Windows

Make sure you extracted the complete repository and ran `install-windows.cmd` from that extracted folder. Do not run `npm link` from a generic user directory.

Run `npm config get prefix`, ensure npm's global executable directory is on PATH, then reopen Command Prompt or PowerShell.

## `Bootstrap failed: 5: Input/output error` on macOS

Update to the latest ChatToCodex version. The installer waits for an older LaunchAgent to retire before bootstrapping the replacement and falls back to `kickstart` when appropriate.

Then retry:

```bash
chat-to-codex resume
chat-to-codex status
```

## Tunnel is not visible in ChatGPT

Check that:

- the Tunnel is associated with the target ChatGPT workspace/account context;
- your account has **Tunnels Read + Use**;
- ChatGPT Developer mode is available/enabled;
- `chat-to-codex status` shows the Host running.

## MCP App cannot scan tools / connect

The Local Host and `tunnel-client` must be online before app discovery. Run:

```text
chat-to-codex doctor
chat-to-codex status
```

If the Tunnel client is disconnected, fix the network/control-plane connection first.

## `Tool ... not found`

Refresh/recreate the MCP App connection after updating ChatToCodex so ChatGPT/Codex rescans the current tool catalog. Current tools are `access_status`, `list_directory`, `read_file`, `write_file`, and `run_command`.

## Proxy/network problems

ChatToCodex's Tunnel client needs outbound HTTPS access to OpenAI. A browser working through a proxy does not always mean a background process inherited the same proxy configuration. Check the Tunnel client diagnostics and your system/proxy environment.
