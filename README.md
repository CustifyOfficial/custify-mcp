# @custify/mcp-server

[![npm version](https://img.shields.io/npm/v/@custify/mcp-server)](https://www.npmjs.com/package/@custify/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

Connect AI tools to your Custify customer success data via the Model Context Protocol.

---

## Quick Start

Get up and running in under 2 minutes.

### 1. Get your API key

Go to **Custify Settings > Developer > API Access** and create or copy your API key.

### 2. Install

```bash
npx @custify/mcp-server
```

### 3. Configure your AI tool

See the [Configuration](#configuration) section below for your specific tool.

---

## Configuration

<details>
<summary><strong>Claude Desktop (STDIO)</strong></summary>

Add the following to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "custify": {
      "command": "npx",
      "args": ["-y", "@custify/mcp-server"],
      "env": {
        "CUSTIFY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

</details>

<details>
<summary><strong>Cursor (STDIO)</strong></summary>

1. Open **Settings > MCP**
2. Click **Add new MCP server**
3. Use the following configuration:

- **Name:** `custify`
- **Command:** `npx -y @custify/mcp-server`
- **Environment Variables:** `CUSTIFY_API_KEY=your-api-key-here`

</details>

<details>
<summary><strong>VS Code (STDIO)</strong></summary>

Add to your `.vscode/mcp.json` in your workspace root:

```json
{
  "servers": {
    "custify": {
      "command": "npx",
      "args": ["-y", "@custify/mcp-server"],
      "env": {
        "CUSTIFY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

```bash
claude mcp add custify -- npx -y @custify/mcp-server \
  --env CUSTIFY_API_KEY=your-api-key-here
```

</details>

<details>
<summary><strong>ChatGPT (Streamable HTTP)</strong></summary>

ChatGPT requires an HTTP-based MCP server. Deploy with Docker:

```bash
docker run -d \
  -p 3000:3000 \
  -e CUSTIFY_API_KEY=your-api-key-here \
  ghcr.io/custify/custify-mcp-server:latest
```

Then configure ChatGPT to connect to your server's URL:

```
https://your-server.example.com/mcp
```

</details>

<details>
<summary><strong>Other MCP Clients</strong></summary>

The Custify MCP server supports two transports:

- **STDIO** (default): Run `npx @custify/mcp-server` with the `CUSTIFY_API_KEY` environment variable set.
- **Streamable HTTP**: Set `MCP_TRANSPORT=streamable-http` and the server will listen on port 3000 (configurable via `PORT`). The MCP endpoint is `/mcp`.

Refer to your MCP client's documentation for how to configure an MCP server using either transport.

</details>

---

## Available Tools

| Tool | Description | Key Parameters | Type |
|------|-------------|----------------|------|
| `list_accounts` | List accounts with optional filters | `segment_id`, `health_score_min`, `health_score_max`, `csm_email`, `lifecycle_stage`, `limit`, `offset` | Read |
| `get_account` | Get detailed account information | `account_id` | Read |
| `search_accounts` | Search accounts by name | `query`, `limit` | Read |
| `get_contacts` | Get contacts for an account | `account_id`, `limit`, `offset` | Read |
| `get_contact` | Get detailed contact information | `contact_id` | Read |
| `get_health_scores` | Get health scores for an account | `account_id` | Read |
| `get_usage_data` | Get usage/event data for an account | `account_id`, `event_name`, `start_date`, `end_date`, `type` | Read |
| `get_usage_trends` | Get health score trends over time | `health_score_id`, `account_id`, `limit` | Read |
| `get_alerts` | Get alerts/signals | `account_id`, `status`, `limit`, `offset` | Read |
| `get_segment_membership` | Get segments an account belongs to | `account_id` | Read |
| `create_note` | Create a note on an account | `account_id`, `body`, `subject` | Write |
| `create_task` | Create a task for an account | `account_id`, `title`, `description`, `due_date`, `assignee_id`, `priority` | Write |
| `run_playbook` | Trigger a playbook on an account | `playbook_id`, `account_id` | Write |
| `update_custom_fields` | Update custom fields on an account or contact | `entity_type`, `entity_id`, `fields` | Write |

---

## Available Resources

| Resource | Description |
|----------|-------------|
| `segments` | List all segments defined in your Custify workspace |
| `playbooks` | List all playbooks available in your Custify workspace |
| `health_score_definitions` | List all health score definitions and their configurations |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CUSTIFY_API_KEY` | Yes | - | Your Custify API key |
| `CUSTIFY_API_URL` | No | `https://api.custify.com` | Custom API base URL |
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `streamable-http` |
| `PORT` | No | `3000` | HTTP server port (only used with `streamable-http` transport) |

---

## Docker

Run the server as a Docker container for HTTP-based MCP clients:

```bash
docker run -d \
  --name custify-mcp \
  -p 3000:3000 \
  -e CUSTIFY_API_KEY=your-api-key-here \
  ghcr.io/custify/custify-mcp-server:latest
```

The MCP endpoint will be available at `http://localhost:3000/mcp` and a health check endpoint at `http://localhost:3000/health`.

---

## Examples

Here are examples of what you can ask your AI tool once the Custify MCP server is connected:

> **"Show me all accounts with declining health scores"**
> The AI will use `list_accounts` with health score filters and `get_health_scores` to identify accounts trending downward.

> **"Create a follow-up task for Acme Corp"**
> The AI will use `search_accounts` to find Acme Corp, then `create_task` with the appropriate account ID, title, and due date.

> **"Which accounts entered the At Risk segment this week?"**
> The AI will use the `segments` resource to find the At Risk segment ID, then `list_accounts` filtered by that segment.

> **"Summarize Acme Corp's last 90 days"**
> The AI will call `get_account`, `get_health_scores`, `get_usage_data`, `get_alerts`, and `get_contacts` to build a comprehensive account summary.

> **"Add a note: Spoke with VP about API latency concerns"**
> The AI will use `search_accounts` to find the right account, then `create_note` with the provided content.

---

## Security

- **Data flow:** Your AI tool communicates with the Custify MCP server, which then makes authenticated API calls to the Custify REST API. No data is stored by the MCP server itself.
- **API key handling:** Your `CUSTIFY_API_KEY` is read from environment variables and is never logged, cached, or exposed through MCP responses. When using STDIO transport, the key stays within your local process. When using HTTP transport, ensure your deployment is behind TLS.
- **Permissions:** The MCP server inherits the permissions of your API key. Use a key scoped to the minimum access level your workflows require. Read-only keys will work for all read tools; write tools require a key with write permissions.
- **No telemetry:** The server does not collect analytics or send data to any third party.

---

## Troubleshooting

**"Error: CUSTIFY_API_KEY environment variable is required"**
Make sure the `CUSTIFY_API_KEY` environment variable is set in your MCP client configuration. Double-check for typos and ensure there are no extra spaces.

**Server not connecting in Claude Desktop**
1. Verify the config file path is correct for your OS.
2. Ensure you have restarted Claude Desktop after editing the configuration.
3. Check that `npx` is available in your system PATH.

**Authentication errors (401)**
Your API key may be invalid or expired. Generate a new key from **Custify Settings > Developer > API Access**.

**Timeout or connection errors**
If using HTTP transport, verify the server is running and accessible. Check that the `PORT` environment variable matches your deployment configuration. For STDIO transport, ensure no firewall or proxy is blocking local process communication.

**Docker container exits immediately**
Check the container logs with `docker logs custify-mcp`. The most common cause is a missing `CUSTIFY_API_KEY` environment variable.

---

## Contributing

Contributions are welcome! To get started:

```bash
git clone https://github.com/custify/custify-mcp-server.git
cd custify-mcp-server
npm install
npm run dev
```

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Submit a pull request

Please open an issue first if you plan a significant change.

---

## License

MIT - see [LICENSE](LICENSE) for details.
