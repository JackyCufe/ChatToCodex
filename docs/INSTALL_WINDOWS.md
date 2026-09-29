# Install on Windows

## 1. Prepare OpenAI Secure MCP Tunnel

Create a Tunnel in OpenAI Platform Tunnel settings for this Windows computer and copy its `tunnel_id`.

Create a Restricted runtime API key with **Tunnels Read + Use**. Keep the key private.

## 2. Extract ChatToCodex completely

Do not run npm commands from `C:\\Users\\<name>` unless that directory is actually the ChatToCodex project.

Extract the ZIP to a folder such as:

```text
C:\Users\<name>\ChatToCodex
```

## 3. Run the Windows installer

From the extracted folder, run:

```cmd
install-windows.cmd
```

or PowerShell:

```powershell
.\install-windows.ps1
```

The installer automatically changes to its own directory, installs dependencies, registers the `chat-to-codex` command, and verifies that it is on PATH.

## 4. Configure and start the Local Host

```cmd
chat-to-codex install
```

Enter your own Tunnel ID and runtime API key. The API key is protected with Windows DPAPI for the current Windows user.

Then verify:

```cmd
chat-to-codex doctor
chat-to-codex status
```

## 5. Create the ChatGPT MCP App

While the Local Host is running:

1. Enable ChatGPT Developer mode if required.
2. Open Plugins and create a developer-mode app.
3. Choose **Tunnel**.
4. Select/paste your own Tunnel ID.
5. Recommended name: `ChatToCodex Core`.
6. Use **No Auth** for the MCP App.
7. Create it and review the discovered tools.

Do not paste the runtime API key into the ChatGPT MCP App.

## 6. Test

Try a harmless read first, then a command such as `git status` in a test repository.

If `chat-to-codex` is not found after installation, run:

```cmd
npm config get prefix
```

Add npm's global executable directory to your user PATH, reopen the terminal, and run `chat-to-codex help`.
