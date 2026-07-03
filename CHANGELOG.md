# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `list_notes` tool — list timeline notes for an account, a contact, or across all accounts, with pagination.
- `list_meetings` tool — list past and upcoming meetings for an account or across all accounts, with pagination.

## [1.3.0] - 2026-05-21

### Added
- `update_task_status` tool — mark a task as `open`, `done`, or `not_relevant`.

## [1.2.0] - 2026-05-14

### Added
- `custify://calculated-metrics` resource — calculated metric definitions for companies and people.
- `custify://lifecycles` resource — lifecycle definitions with goals and task templates.
- `custify://tags` resource — tags grouped by category for lookup and context.
- `list_contacts` tool — list and filter contacts across all accounts.
- `add_tag_to_entities` and `remove_tag_from_entities` tools — add or remove existing tags on accounts or contacts.
- `get_account_objectives` tool — list customer objectives for a specific account/company.

### Changed
- `list_accounts` and `list_contacts` now support ergonomic `tag_ids`/`tag_match` filters and validate manual Tag filter payloads.
- Tool descriptions and README guidance were tightened so agents can choose lookup, list, tag, and action tools more reliably.

## [1.1.0] - 2026-04-25

### Added
- `list_tasks` tool — query tasks across accounts with assignee, tag, status, due-date, and priority filters.
- `get_task` tool — fetch a single task by ID.
- `list_task_filter_values` tool — discover assignee, account, and creator IDs in use.
- `list_tags` tool — resolve tag names to IDs (e.g. `"onboarding follow up"` → `tag_id`), scoped by category.
- README: new "Task Tools" section with filter examples and a status reference table.

## [1.0.1] - 2026-03-30

### Fixed
- Updated GitHub repository URLs and Docker image references in README to point at `CustifyOfficial/custify-mcp` and `ghcr.io/custifyofficial/custify-mcp`.

## [1.0.0] - 2026-03-30

### Added
- Initial Custify MCP Server release.
