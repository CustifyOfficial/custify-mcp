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
| `list_accounts` | Read | List and filter accounts using tag IDs or Custify's advanced filter system |
| `get_account` | Read | Get full details for a specific account by ID |
| `search_accounts` | Read | Search accounts by name or domain |
| `list_attributes` | Read | Discover all available fields and their types for filtering |

**`list_accounts`** supports `tag_ids` for simple tag filtering and Custify's full filter system for advanced fields. Use `list_tags` with `category: "company"` to resolve account tag names to IDs. Use `list_attributes` with `entity_type: "account"` to discover available fields.

Tag filters use this backend format when passed manually through `filters`:

```json
{
  "fieldName": "tags",
  "fieldType": "Tag",
  "filterType": "is_any_of",
  "filterValue": ["<company_tag_id>"]
}
```

Supported tag `filterType` values are `is_any_of`, `is_all_of`, `is_none_of`, `is_unknown`, and `any_value`. For ID-based tag filters, `filterValue` must be a non-empty array of tag IDs.

**Filter examples:**

| What you want | Filter object |
|---------------|---------------|
| Churned accounts | `{"fieldName": "churned", "fieldType": "Boolean", "filterType": "true"}` |
| Name contains "acme" | `{"fieldName": "name", "fieldType": "String", "filterType": "contains", "filterValue": "acme"}` |
| Has any listed account tag | `{"tag_ids": ["<company_tag_id>"], "tag_match": "any"}` |
| Has all listed account tags | `{"tag_ids": ["<company_tag_id_1>", "<company_tag_id_2>"], "tag_match": "all"}` |
| Has none of the listed account tags | `{"tag_ids": ["<company_tag_id>"], "tag_match": "none_of"}` |
| Health score > 50 | `{"fieldName": "metrics.health_scores.<score_id>", "fieldType": "Number", "filterType": "greater", "filterValue": "50"}` |
| Signed up after a date | `{"fieldName": "signed_up_at", "fieldType": "Date", "filterType": "after", "filterValue": "2024-01-01"}` |
| In a specific segment | `{"fieldName": "buckets", "fieldType": "Segment", "filterType": "is_any_of", "filterValue": ["<segment_id>"]}` |
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
| `list_contacts` | Read | List and filter contacts across all accounts using tag IDs or Custify filters |
| `get_contacts` | Read | List contacts/people linked to one account |
| `get_contact` | Read | Get full contact details by ID |

**`list_contacts`** is the contact equivalent of `list_accounts`. Use `tag_ids` with people tags for simple tag filtering, or pass advanced Custify filters. Use `list_tags` with `category: "people"` to resolve contact tag names to IDs. Use `list_attributes` with `entity_type: "contact"` to discover available contact fields.

**Contact filter examples:**

| What you want | Parameters |
|---------------|------------|
| Contacts tagged "champion" | `{"tag_ids": ["<people_tag_id>"], "tag_match": "any"}` |
| Contacts with no listed tags | `{"tag_ids": ["<people_tag_id>"], "tag_match": "none_of"}` |
| Email contains a domain | `{"filters": [{"fieldName": "email", "fieldType": "String", "filterType": "contains", "filterValue": "@example.com"}]}` |
| Contacts linked to an account | `{"filters": [{"fieldName": "companies", "fieldType": "Company", "filterType": "is_in", "filterValue": "<account_id>"}]}` |

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

### Task Tools

| Tool | Type | Description |
|------|------|-------------|
| `list_tasks` | Read | Query tasks across all accounts with filters and pagination |
| `get_task` | Read | Get full details for a specific task by ID |
| `update_task_status` | Write | Mark a task as `open`, `done`, or `not_relevant` |
| `list_task_filter_values` | Read | Discover assignee, account, and creator IDs (with names) currently used on tasks |
| `list_tags` | Read | Resolve human-readable tag names to tag IDs. Use `category: "task"` to scope to task labels. |

**`list_tasks`** uses flat, ergonomic parameters. Filters combine with AND. To resolve a tag name like "onboarding follow up" to an ID, call `list_tags` with `category: "task"`. To resolve an assignee name, call `list_task_filter_values` (returns user IDs with names).

**Filter examples:**

| What you want | Parameters |
|---------------|------------|
| My open tasks due today | `{"assignee_id": "<user_id>", "status": "open", "due": "today"}` |
| Overdue tasks for an account | `{"account_id": "<account_id>", "status": "overdue"}` |
| All tasks tagged "onboarding follow up" | `{"tag_ids": ["<tag_id>"], "status": "open"}` |
| High-priority tasks due this week | `{"priority": "high", "due": "this_week"}` |
| Tasks due in a custom date range | `{"due_after": "2026-04-01", "due_before": "2026-04-30"}` |
| Tasks assigned to a CSM, sorted by due date | `{"assignee_id": "<user_id>", "sort_by": "dueDate", "sort_direction": "asc"}` |

**Available status filter values:**

| Status | Meaning |
|--------|---------|
| `open` | Status is open and not snoozed |
| `done` | Task completed |
| `not_relevant` | Marked as not relevant |
| `overdue` | Open and `dueDate` <= yesterday |
| `on_time` | Open and (no `dueDate` or `dueDate` > yesterday) |
| `outstanding` | Open and `dueDate` <= today |

**`update_task_status`** only writes persisted task statuses: `open`, `done`, and `not_relevant`. Use `list_tasks` first to find the internal `task_id`, then call `update_task_status` with the new status.

**Available `due` shortcuts:** `past_due`, `today`, `this_week`, `this_month`, `later`. For custom ranges, supply **both** `due_after` and `due_before` (ISO dates). The `due` shortcut and the date-range pair are mutually exclusive — passing only one bound of the range is ignored.

### Note & Meeting Tools

| Tool | Type | Description |
|------|------|-------------|
| `list_notes` | Read | List timeline notes for an account, a contact, or across all accounts |
| `list_meetings` | Read | List past and upcoming meetings for an account or across all accounts |

**`list_notes`** returns notes most recent first (sticky notes first when scoped to a single account or contact). Scope with `account_id` **or** `contact_id` (Custify internal IDs), or omit both to list notes across all accounts. Note text is HTML and includes notes added manually, generated by Playbooks, or imported from integrations (see the `source` field, e.g. `salesforce`). Use `create_note` to add a note.

**`list_meetings`** returns meetings imported from Gmail/Outlook calendars, HubSpot, or created via the API — past and upcoming. Scope with `account_id` (Custify internal company ID), or omit it to list meetings across all accounts. Each meeting includes the organizer, participants (matched to Custify contacts where possible), start/end times, and duration. Both tools paginate with `limit` (max 50) and `offset`.

### Objective Tools

| Tool | Type | Description |
|------|------|-------------|
| `get_account_objectives` | Read | Get customer objectives for a specific account, using either the Custify account ID or your external `company_id` |

**`get_account_objectives`** accepts `account_id` (Custify internal company ID) or `external_account_id` (your `company_id`). It supports pagination, sorting, and Custify filter objects for fields such as `objectiveStatus`, `importance`, `risk`, and `dueAt`.

### Action Tools

| Tool | Type | Description |
|------|------|-------------|
| `create_note` | Write | Add a note to an account's timeline |
| `create_task` | Write | Create a task assigned to a CSM |
| `run_playbook` | Write | Trigger a manually-started playbook on an account |
| `update_custom_fields` | Write | Update custom attribute values on an account or contact |
| `add_tag_to_entities` | Write | Add an existing tag to one or more accounts or contacts |
| `remove_tag_from_entities` | Write | Remove an existing tag from one or more accounts or contacts |

**Tag actions** accept `entity_type: "account"` or `entity_type: "contact"`, an array of Custify internal `entity_ids`, and a `tag_id`. Use `list_tags` or the `custify://tags` resource first to resolve tag names to IDs.

---

## Available Resources

Resources provide read-only context that AI agents can use to understand your Custify workspace:

| Resource | URI | Description |
|----------|-----|-------------|
| Segments | `custify://segments` | All segment definitions with names and IDs |
| Playbooks | `custify://playbooks` | All playbook definitions with names, types, and IDs |
| Health Score Definitions | `custify://health-score-definitions` | All health score configs with names, thresholds, and IDs |
| Calculated Metrics | `custify://calculated-metrics` | All calculated metric definitions for companies and people |
| Lifecycles | `custify://lifecycles` | All lifecycle definitions with goals and task templates |
| Tags | `custify://tags` | All tags grouped by category |

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

> **"Show accounts tagged renewal risk"**
> Uses `list_tags` with `category: "company"` to resolve the tag ID, then `list_accounts` with `tag_ids`.

### Querying contacts

> **"Show contacts tagged champion"**
> Uses `list_tags` with `category: "people"` to resolve the tag ID, then `list_contacts` with `tag_ids`.

> **"Find contacts with example.com email addresses"**
> Uses `list_contacts` with a String filter on `email`.

### Account deep-dives

> **"Give me a full summary of Acme Corp"**
> Uses `search_accounts` to find Acme, then `get_account`, `get_health_scores`, `get_contacts`, `get_usage_data`, and `get_segment_membership` to build a comprehensive briefing.

> **"What segments is Acme Corp in?"**
> Uses `search_accounts` to find the account ID, then `get_segment_membership`.

> **"Show me the health score trend for Acme Corp over the last month"**
> Uses `get_health_scores` to find score IDs, then `get_usage_trends` for historical values.

### Querying tasks

> **"What's on my plate today?"**
> Uses `list_tasks` with `assignee_id` (your user ID) and `due: "today"` to pull a daily task list.

> **"Show me all overdue tasks tagged 'onboarding follow up' assigned to Jane"**
> Uses `list_tags` with `category: "task"` to resolve the tag name to an ID, `list_task_filter_values` to resolve Jane's user ID, then `list_tasks` with `tag_ids`, `assignee_id`, and `status: "overdue"`.

> **"What's open for Acme Corp?"**
> Uses `search_accounts` to find the account ID, then `list_tasks` with `account_id` and `status: "open"`.

> **"Mark the onboarding review task as done"**
> Uses `list_tasks` to find the matching task ID, then `update_task_status` with `status: "done"`. Use `status: "open"` to reopen a task or `status: "not_relevant"` to mark it as not relevant.

### Querying objectives

> **"What objectives are open for Acme Corp?"**
> Uses `search_accounts` to find the account ID, then `get_account_objectives`.

### Taking actions

> **"Create a follow-up task for Acme Corp: Review onboarding progress, due next Friday"**
> Uses `search_accounts` to find Acme, then `create_task` with title, due date, and account ID.

> **"Add a note to Acme Corp: Spoke with VP of Engineering about API latency concerns"**
> Uses `search_accounts` then `create_note` with the note body.

> **"Run the renewal prep playbook for Acme Corp"**
> Uses the `playbooks` resource to find the playbook ID, `search_accounts` for the account, then `run_playbook`.

> **"Tag Acme Corp as renewal risk"**
> Uses `search_accounts` to find the account ID, `list_tags` or `custify://tags` to find the tag ID, then `add_tag_to_entities`.

### Discovering your data model

> **"What fields can I filter accounts by?"**
> Uses `list_attributes` to return all available fields with their names and types.

> **"What segments do we have?"**
> Reads the `custify://segments` resource.

> **"What playbooks are available?"**
> Reads the `custify://playbooks` resource.

> **"What calculated metrics and lifecycle stages do we have?"**
> Reads the `custify://calculated-metrics` and `custify://lifecycles` resources.

> **"What tags can I use on accounts and contacts?"**
> Reads the `custify://tags` resource.

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
