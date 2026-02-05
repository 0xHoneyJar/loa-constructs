# Changelog

All notable changes to the Artisan pack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-02-05

### Changed

- Hoisted MCP server definition to network-level registry (`.claude/mcp-registry.yaml`)
- Replaced `mcp_servers` (provider) with `mcp_dependencies` (consumer) — Artisan is now a peer consumer alongside Observer and Crucible
- All 9 Agentation MCP scopes declared as `mcp_dependencies.required_scopes`

## [1.2.0] - 2026-02-05

### Added

- MCP manifest standard with `tools`, `mcp_servers`, `mcp_dependencies` fields
- Agentation v2 MCP integration for `iterating-visuals` and `decomposing-feel`
- NL triggers, examples, and domain hints for all 14 skills
- `agent-browser` tool dependency declaration

## [1.1.0] - 2026-01-15

### Added

- Initial pack with 10 design skills
- `rams` and `next-best-practices` skills
- Taste system contexts

## [1.0.0] - 2025-12-31

### Added

- Initial release with core design skills
