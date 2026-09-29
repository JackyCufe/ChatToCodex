# 配置 Tunnel、API Key 和 ChatGPT MCP App

本指南带你完成 ChatToCodex 首次连接。文中的 **Channel ID** 如果你指的是 OpenAI Secure MCP Tunnel 的标识，官方名称是 **Tunnel ID**，格式为 `tunnel_` 加 32 位小写十六进制字符。请使用 Tunnel ID，不要与 API Key 混淆。

> ChatToCodex 是独立开源项目，并非 OpenAI 官方产品。ChatGPT 的 MCP App、Developer mode 和 Secure MCP Tunnel 可用性取决于账号、套餐和工作区管理员设置。界面名称也可能随 ChatGPT 更新而变化。

## 你需要准备什么

- 已安装 Node.js 20+、npm 和 OpenAI `tunnel-client`。
- 一个可使用 Secure MCP Tunnel 的 OpenAI Platform 组织。
- 一个有权限创建或使用开发者 MCP App 的 ChatGPT 账号/工作区。
- 创建 Tunnel 所需的 **Tunnels Read + Manage** 权限；运行 Tunnel 和连接时需要 **Tunnels Read + Use** 权限。

## 1. 创建 Tunnel 并复制 Tunnel ID

1. 登录 [OpenAI Platform](https://platform.openai.com/) 并打开 Secure MCP Tunnel 设置。
2. 创建一个 Tunnel，名称可以写成 `ChatToCodex-你的电脑名称`，方便以后辨认。
3. 创建完成后复制它的 **Tunnel ID**。它看起来像这样：

   ```text
   tunnel_0123456789abcdef0123456789abcdef
   ```

4. 把 Tunnel ID 暂时放在自己安全的位置。它不是 API Key，但仍建议只用于你自己的配置。

> 截图待补：Platform 中 Tunnel 设置入口、创建 Tunnel 的页面、Tunnel ID 所在位置。

## 2. 创建 Restricted runtime API Key

1. 在 OpenAI Platform 的 API Keys 页面创建一个新的 **Restricted** API Key。
2. 为本机 `tunnel-client` 授予运行 Tunnel 所需权限：**Tunnels Read** 和 **Tunnels Use**。
3. 创建后立即复制并妥善保管。完整 Key 通常只会显示一次；如果丢失，请创建新 Key。
4. 这个 Key 是本机 Tunnel runtime 使用的凭据。**不要把它填进 ChatGPT MCP App，也不要提交到 Git、截图或公开聊天中。**

> 截图待补：Restricted API Key 创建页面及权限选择。请遮住 Key 的完整值、账号敏感信息和其他凭据。

权限名或 Platform 页面若有变化，请以当前 OpenAI Platform 中显示的 Tunnel 权限说明为准；不要为了让连接成功而给 Key 添加无关权限。

## 3. 在本机配置并启动 ChatToCodex

在 ChatToCodex 仓库目录打开 Terminal，运行：

```bash
npm install
npm link
chat-to-codex install
```

安装程序会依次提示：

1. **Tunnel ID**：粘贴刚才复制的 `tunnel_...` 值。
2. **Tunnel API key**：粘贴 Restricted runtime API Key。在交互式终端中输入时字符不会回显；请直接在可信的本机 Terminal 中操作，不要把 Key 写进命令、脚本或共享日志。

ChatToCodex 会把 Tunnel ID 保存在本机配置中，并将 API Key 存入 macOS Keychain 或 Windows Credential/DPAPI 存储。安装过程会设置本机后台 Host；macOS 使用 LaunchAgent。

随后检查状态：

```bash
chat-to-codex doctor
chat-to-codex status
```

继续之前，确认诊断显示 Tunnel ID 有效、API Key 已存储、后台 Host 已安装并运行。创建 MCP App 和扫描工具时，本机 Host 与 `tunnel-client` 必须保持在线。

> 截图待补：安装时输入 Tunnel ID 的提示、隐藏 API Key 的提示、`doctor` 和 `status` 的成功示例。示例输出中的 Tunnel ID 可打码。

## 4. 在 ChatGPT 创建 MCP App

使用 ChatGPT 网页版，并确认账号/工作区已允许 Developer mode 和自定义 MCP App。若看不到相关选项，请联系工作区管理员或确认当前套餐是否支持。

1. 打开 ChatGPT **Settings（设置）**，进入 **Apps（应用）**；也可以从工作区设置中的 **Apps → Create（创建）**进入，具体入口可能因工作区而异。
2. 启用或选择 Developer mode，然后选择创建自定义 App/MCP App。
3. 输入名称，例如 `ChatToCodex Core`。
4. 连接方式选择 **Tunnel**。
5. 选择刚创建的 Tunnel，或粘贴本机配置使用的同一个 **Tunnel ID**。
6. 对 ChatToCodex MCP App 选择 **No Auth**（无身份验证）。Tunnel runtime API Key 已由本机 `tunnel-client` 使用，不要放进此处。
7. 选择 **Scan Tools**。等待扫描完成，检查发现的工具，然后创建 App。

ChatToCodex 会提供本地文件和命令工具，例如 `access_status`、`list_directory`、`read_file`、`write_file` 和 `run_command`。请在启用前检查工作区显示的工具权限。

> 截图待补：Developer mode、创建 MCP App、Tunnel 连接方式、选择 Tunnel、No Auth、Scan Tools 结果。截图中请遮住 ID、Key、邮箱和组织信息。

## 5. 在对话中连接并做安全验证

1. 在 ChatGPT 网页版开启一个新对话。
2. 从工具/App 选择器中选择 `ChatToCodex Core`。如果刚创建的 App 尚未出现在列表，先检查它是否已创建/启用，并确认 Tunnel 在线。
3. 先执行低风险检查，例如调用 `access_status`、列出你明确允许访问的测试目录，或在测试仓库中运行 `git status`。
4. 只有在确认目标路径和内容后，再测试写入或命令执行。

`write_file` 和 `run_command` 可以更改本机文件或运行命令。不要在不理解目标和影响时批准操作；需要让本机 Host 离线时运行：

```bash
chat-to-codex pause
```

恢复连接：

```bash
chat-to-codex resume
```

## 常见问题

### 安装时提示 Tunnel ID 无效

确认复制的是 Tunnel ID（以 `tunnel_` 开头），不是 Tunnel 名称或 API Key；检查是否完整复制，没有多余空格。

### `doctor` 显示 API key 未存储

重新运行 `chat-to-codex install` 并输入有效的 Restricted runtime API Key。若 Key 已撤销或权限不足，请在 Platform 创建/配置新的 Key。

### Scan Tools 找不到工具

先运行 `chat-to-codex doctor` 和 `chat-to-codex status`，确认 Host 在线、Tunnel ID 与 ChatGPT 中选择的 Tunnel 相同，并检查 API Key 是否有 Tunnels Read + Use 权限。

### 找不到 Developer mode 或创建 App 的入口

Developer mode 和自定义 MCP App 会受套餐、工作区管理员策略和账号权限影响。请使用 ChatGPT 网页版，并联系管理员确认权限；当前可用条件请查看 [OpenAI Developer mode and MCP apps 文档](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)。

## 官方参考

- [OpenAI：Developer mode and MCP apps in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)
- [OpenAI Platform](https://platform.openai.com/)
- [ChatToCodex macOS 安装指南](INSTALL_MAC.md)
