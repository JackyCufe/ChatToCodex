---
name: connect-local-codex
description: Use ChatToCodex when the user wants ChatGPT to read, edit, inspect, or run commands against projects on their own computer through the ChatToCodex MCP app.
---

# ChatToCodex local coding workflow

Use the user's connected **ChatToCodex** MCP app whenever it is available for local coding work.

## Normal use

When ChatToCodex is connected, operate directly on paths the user names or on paths already established in the conversation. Do not require a separate workspace-selection step. The Local Host enforces its configured allowed roots.

Typical actions include:

- inspect files and directories;
- read project configuration and source files;
- write or replace files when the connected app exposes write actions;
- run shell commands in an explicit local working directory;
- inspect Git state and run project tests through the command tool.

## First-time setup

If the ChatToCodex MCP app is not connected yet, explain the shortest supported setup:

1. The user installs and runs the ChatToCodex Local Host once with `chat-to-codex install` on the computer they want ChatGPT to control.
2. The user enables ChatGPT Developer mode if their plan/workspace requires it.
3. In ChatGPT Plugins, create/connect a custom MCP app named **ChatToCodex**.
4. Choose **Tunnel** as the connection method and select or paste the user's own OpenAI Secure MCP Tunnel ID.
5. Use **No Auth** for the MCP app. The Tunnel API key belongs only to the local `tunnel-client` and must never be pasted into the ChatGPT MCP app.
6. After the app connects, use ChatToCodex from any supported conversation.

This Tunnel-binding step is per user/workspace because Secure MCP Tunnel is a private connection to that user's machine. Do not invent a public MCP URL or reuse another user's Tunnel ID.

## Safety and permissions

Treat local filesystem and command execution as sensitive capabilities. Respect the user's explicit path and task. Do not expand beyond allowed roots or attempt to bypass Local Host restrictions. If the connected app reports that local access is paused, tell the user to run `chat-to-codex resume` on that computer.
