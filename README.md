# @custify/mcp-server

[![npm version](https://img.shields.io/npm/v/@custify/mcp-server)](https://www.npmjs.com/package/@custify/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![GitHub Stars](https://img.shields.io/github/stars/CustifyOfficial/custify-mcp)](https://github.com/CustifyOfficial/custify-mcp)

Connect AI tools to your Custify customer success data via the Model Context Protocol.

Query accounts, health scores, usage data, and more — or create notes, tasks, and trigger playbooks — all from within Claude, Cursor, VS Code, or any MCP-compatible AI tool.

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

### 4. Try it out

Ask your AI assistant:

```
How many churned accounts do I have?
```

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
  ghcr.io/custifyofficial/custify-mcp:latest
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

### Account Tools

| Tool | Type | Description |
|------|------|-------------|
| `list_accounts` | Read | List and filter accounts using Custify's filter system |
| `get_account` | Read | Get full details for a specific account by ID |
| `search_accounts` | Read | Search accounts by name or domain |
| `list_attributes` | Read | Discover all available fields and their types for filtering |

**`list_accounts`** supports Custify's full filter system. Each filter is an object with `fieldName`, `fieldType`, `filterType`, and `filterValue`. Use `list_attributes` first to discover available fields.

**Filter examples:**

| What you want | Filter object |
|---------------|---------------|
| Churned accounts | `{"fieldName": "churned", "fieldType": "Boolean", "filterType": "true"}` |
| Name contains "acme" | `{"fieldName": "name", "fieldType": "String", "filterType": "contains", "filterValue": "acme"}` |
| Health score > 50 | `{"fieldName": "metrics.health_scores.<score_id>", "fieldType": "Number", "filterType": "greater", "filterValue": "50"}` |
| Signed up after a date | `{"fieldName": "signed_up_at", "fieldType": "Date", "filterType": "after", "filterValue": "2024-01-01"}` |
| In a specific segment | `{"fieldName": "...", "fieldType": "Segment", "filterType": "is_any_of", "filterValue": ["<segment_id>"]}` |
| Has any CSM assigned | `{"fieldName": "owners_csm", "fieldType": "User", "filterType": "any_value"}` |

**Available filter types by field type:**

| Field Type | Filter Types |
|------------|-------------|
| Boolean | `true`, `false` |
| Number | `greater`, `lower`, `between`, `is_unknown`, `any_value` |
| String | `contains`, `starts_with`, `ends_with`, `does_not_contain`, `is_unknown`, `any_value` |
| Date | `more_than`, `less_than`, `exactly`, `after`, `before`, `between`, `on`, `last_week`, `this_week`, `last_month`, `this_month`, `last_quarter`, `this_quarter`, `last_year`, `this_year`, `is_unknown`, `any_value` |
| Dropdown | `is_any_of`, `is_all_of`, `is_none_of`, `is_unknown`, `any_value` |
| Segment | `is_any_of`, `is_all_of`, `is_none_of` |
| Tag | `is_any_of`, `is_all_of`, `is_none_of`, `is_unknown`, `any_value` |
| User | `is_in`, `is_not_in`, `is_unknown`, `any_value` |
| Currency | `greater`, `lower`, `between`, `is_unknown`, `any_value` |

### Contact Tools

| Tool | Type | Description |
|------|------|-------------|
| `get_contacts` | Read | List contacts/people for an account |
| `get_contact` | Read | Get full contact details by ID |

### Health & Usage Tools

| Tool | Type | Description |
|------|------|-------------|
| `get_health_scores` | Read | Get all health scores for an account, with score names and values |
| `get_usage_data` | Read | Get product usage and event data for an account |
| `get_usage_trends` | Read | Get health score values over time for trend analysis |

### Alerts & Segments

| Tool | Type | Description |
|------|------|-------------|
| `get_alerts` | Read | Get alerts/signals for an account |
| `get_segment_membership` | Read | Get which segments an account belongs to |

### Action Tools

| Tool | Type | Description |
|------|------|-------------|
| `create_note` | Write | Add a note to an account's timeline |
| `create_task` | Write | Create a task assigned to a CSM |
| `run_playbook` | Write | Trigger a manually-started playbook on an account |
| `update_custom_fields` | Write | Update custom attribute values on an account or contact |

---

## Available Resources

Resources provide read-only context that AI agents can use to understand your Custify workspace:

| Resource | URI | Description |
|----------|-----|-------------|
| Segments | `custify://segments` | All segment definitions with names and IDs |
| Playbooks | `custify://playbooks` | All playbook definitions with names, types, and IDs |
| Health Score Definitions | `custify://health-score-definitions` | All health score configs with names, thresholds, and IDs |

---

## Examples

Here are real-world examples of what you can ask your AI assistant once connected:

### Querying accounts

> **"How many churned accounts do I have?"**
> Uses `list_accounts` with a churned filter to count accounts where churned = true.

> **"Show me all accounts with a health score below 30"**
> Uses `list_attributes` to find the health score field name, then `list_accounts` with a Number filter.

> **"Find all accounts managed by jane@company.com"**
> Uses `list_accounts` with a User filter on the CSM field.

> **"Which accounts signed up this quarter?"**
> Uses `list_accounts` with a Date filter: `filterType: "this_quarter"` on `signed_up_at`.

### Account deep-dives

> **"Give me a full summary of Acme Corp"**
> Uses `search_accounts` to find Acme, then `get_account`, `get_health_scores`, `get_contacts`, `get_usage_data`, and `get_segment_membership` to build a comprehensive briefing.

> **"What segments is Acme Corp in?"**
> Uses `search_accounts` to find the account ID, then `get_segment_membership`.

> **"Show me the health score trend for Acme Corp over the last month"**
> Uses `get_health_scores` to find score IDs, then `get_usage_trends` for historical values.

### Taking actions

> **"Create a follow-up task for Acme Corp: Review onboarding progress, due next Friday"**
> Uses `search_accounts` to find Acme, then `create_task` with title, due date, and account ID.

> **"Add a note to Acme Corp: Spoke with VP of Engineering about API latency concerns"**
> Uses `search_accounts` then `create_note` with the note body.

> **"Run the renewal prep playbook for Acme Corp"**
> Uses the `playbooks` resource to find the playbook ID, `search_accounts` for the account, then `run_playbook`.

### Discovering your data model

> **"What fields can I filter accounts by?"**
> Uses `list_attributes` to return all available fields with their names and types.

> **"What segments do we have?"**
> Reads the `custify://segments` resource.

> **"What playbooks are available?"**
> Reads the `custify://playbooks` resource.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CUSTIFY_API_KEY` | Yes | - | Your Custify API key |
| `CUSTIFY_API_URL` | No | `https://api.custify.com` | Custom API base URL (for different clusters) |
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
  ghcr.io/custifyofficial/custify-mcp:latest
```

The MCP endpoint will be available at `http://localhost:3000/mcp` and a health check endpoint at `http://localhost:3000/health`.

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

**Permission errors (403)**
The endpoint may not be available for API key access. Check that your Custify account has the required permissions.

**Timeout or connection errors**
If using HTTP transport, verify the server is running and accessible. Check that the `PORT` environment variable matches your deployment configuration. For STDIO transport, ensure no firewall or proxy is blocking local process communication.

**Different Custify cluster?**
If your Custify instance is on a different cluster (e.g., EU), set `CUSTIFY_API_URL` to your cluster's API URL.

**Docker container exits immediately**
Check the container logs with `docker logs custify-mcp`. The most common cause is a missing `CUSTIFY_API_KEY` environment variable.

---

## Contributing

Contributions are welcome! To get started:

```bash
git clone https://github.com/CustifyOfficial/custify-mcp.git
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
