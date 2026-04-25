# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
