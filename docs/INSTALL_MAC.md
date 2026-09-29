# Install on macOS

## 1. Prepare OpenAI Secure MCP Tunnel

Open OpenAI Platform Tunnel settings and create a Tunnel for this Mac. Give it a recognizable name such as `ChatToCodex-Jacky-Mac`.

Copy the generated `tunnel_id`.

Create a Restricted API key that has the Tunnel permissions needed to run the client (**Tunnels Read + Use**). Store the key somewhere safe until installation is complete.

## 2. Install ChatToCodex

Clone or download this repository, then open Terminal in the ChatToCodex folder:

```bash
npm install
npm link
chat-to-codex install
```

Enter your own Tunnel ID and runtime API key when prompted. The API key input is hidden and is stored in macOS Keychain.

## 3. Confirm the Local Host is online

```bash
chat-to-codex doctor
chat-to-codex status
```

Look for:

- `configured: true`
- background host installed and running
- local access enabled
- your expected Tunnel ID

Keep ChatToCodex running while you create the MCP App. App discovery depends on a healthy `tunnel-client` connection.

## 4. Create the ChatGPT MCP App

In ChatGPT:

1. Enable Developer mode if required.
2. Open **Plugins** and select the plus button to create a developer-mode app.
3. Choose **Tunnel** as the connection method.
4. Select your Tunnel, or paste its `tunnel_id`.
5. Name the app `ChatToCodex Core` (recommended for clarity).
6. Use **No Auth** for this local ChatToCodex MCP server.
7. Create the connection and review the discovered tools.

The runtime API key stays on your Mac. Do not paste it into the MCP App.

## 5. Test

Start a new supported ChatGPT/Codex conversation with the MCP connection available and ask it to:

- list a folder inside your home directory;
- read a harmless text file;
- run `git status` in a test repository.

ChatToCodex exposes tools including `access_status`, `list_directory`, `read_file`, `write_file`, and `run_command`.

## 6. Pause or resume local access

```bash
chat-to-codex pause
chat-to-codex resume
chat-to-codex status
```

Pausing stops the background Host. Resume restores it.
