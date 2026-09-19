# Research Report: Distributable Claude Tool for Google Slides

## Executive Summary

Your constraints (no claude.ai connectors, GitHub distribution with auto-update, non-technical user installation, per-user Google auth) are **technically feasible** but require careful architecture around MCP authentication. Anthropic's recently launched Claude Docs & Slides (Sept 2026) does NOT provide an MCP path for third-party Google Slides integration. You must either build a custom Google Slides MCP server or use the beta Google Slides MCP server.

---

## 1. CLAUDE CODE PLUGINS & MARKETPLACES

### Plugin Structure & MCP Bundling
**Source:** https://code.claude.com/docs/en/plugins.md, https://code.claude.com/docs/en/plugins-reference.md

- **Plugin structure**: Directory with `.claude-plugin/plugin.json` manifest + `skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `.lsp.json`, `monitors/`, `bin/`
- **MCP bundling**: YES — plugins can bundle MCP servers via `.mcp.json` file at plugin root (not inside `.claude-plugin/`)
- **Local stdio MCP in plugins**: YES — `.mcp.json` supports stdio type with `command` and `args`, e.g.:
  ```json
  {
    "mcpServers": {
      "google-slides": {
        "type": "stdio",
        "command": "node",
        "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server.js"],
        "env": { "GOOGLE_CLIENT_ID": "${user_config.google_client_id}" }
      }
    }
  }
  ```
- **Environment variables in plugins**: `${CLAUDE_PLUGIN_ROOT}` (plugin dir), `${CLAUDE_PLUGIN_DATA}` (persistent data), `${user_config.KEY}` (user-provided config)
- **Binaries/scripts**: YES — `.bin/` directory added to PATH; Node/Python/Bash scripts in plugin work. **Permission model**: Bash tools require permission prompts unless pre-approved in `allowed-tools` within skills
- **Non-technical users**: Bash execution in skills triggers permission dialogs unless blocked with `allowed-tools`. This may confuse non-technical users but is unavoidable

### Marketplaces
**Source:** https://code.claude.com/docs/en/plugin-marketplaces.md, https://code.claude.com/docs/en/discover-plugins.md

- **Marketplace format**: `.claude-plugin/marketplace.json` in a GitHub repository (or any Git host, local path, remote URL, npm package)
- **Plugin sources in marketplace**: relative paths, GitHub `owner/repo`, git URLs, npm packages, zip archives, or `command` sources (dynamic output)
- **Installation**: `/plugin marketplace add owner/repo` adds marketplace; `/plugin install plugin-name@marketplace-name` installs plugins
- **Auto-update behavior**: 
  - Enabled by default for official Anthropic marketplaces
  - Can be toggled per marketplace in `/plugin` UI or set in managed settings with `autoUpdate: true`
  - Background refresh happens after startup (up to 10min random delay)
  - Plugins auto-download new versions; runs `/reload-plugins` to activate
- **Plugin caching**: Installed plugins are cached locally; updates checked in background

### Scopes
**Source:** https://code.claude.com/docs/en/settings-reference.md

- **User scope**: `~/.claude/settings.json` — personal across all projects
- **Project scope**: `.claude/settings.json` — shared via git for team
- **Local scope**: `.claude/settings.local.json` — personal, not shared (gitignored)
- **Managed scope**: Organization-deployed, cannot be overridden by users

---

## 2. SKILLS

### SKILL.md Format & Triggering
**Source:** https://code.claude.com/docs/en/skills.md, https://claude.com/docs/skills/overview.md, https://claude.com/docs/skills/how-to.md

**Frontmatter fields (Claude Code):**
```yaml
---
name: my-skill                    # Required, kebab-case
description: "What it does"       # Claude uses to decide when to auto-invoke
disable-model-invocation: true    # Only user can invoke (via /skill-name)
user-invocable: false             # Only Claude can invoke (no manual /invoke)
allowed-tools: Bash(git *)        # Pre-approve specific tool patterns
context: fork                     # Run in isolated subagent (no conversation history)
agent: Explore                    # Which subagent type
background: false                 # Async (vs wait for result)
paths: "src/**" "tests/**"        # Only load for matching files
arguments: [issue, branch]        # Named args: $issue, $branch, or $ARGUMENTS
---
```

**Frontmatter fields (claude.ai standard, Agent Skills spec):**
- `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` ONLY
- Claude Code extensions: `disable-model-invocation`, `user-invocable`, `context`, `agent`, `background`, `paths`, `arguments`, `effort`, `model`, `hooks`, `shell`, `disallowed-tools`

### Skill Triggering & Auto-invocation
- **User invocation**: `/skill-name` or `/plugin-name:skill-name` (skills in plugins use namespace)
- **Model auto-invocation**: Claude automatically loads skill if task matches `description`
- **Invocation control**: 
  - `disable-model-invocation: true` → only user can invoke
  - `user-invocable: false` → only model can invoke (not user)
- **Permission prompts**: Bash tools in skills trigger permission dialogs unless `allowed-tools` pre-approves them

### Skill Directory Layout
```
~/.claude/skills/my-skill/
├── SKILL.md                 # Required
├── scripts/                 # Optional: executables (Python, JavaScript, Bash)
├── references/              # Optional: documentation
└── assets/                  # Optional: templates, data files
```

### Agent Skills Open Standard
**Source:** https://agentskills.io

- Skills follow the **Agent Skills specification** — platform-agnostic standard
- Supported on: Claude Code, claude.ai web, Cowork, Claude Desktop, and third-party platforms
- Only specified frontmatter fields portable; Claude Code extensions stay local

### Skills on claude.ai
- **Upload format**: ZIP containing skill directory, e.g., `my-skill.zip` → `my-skill/SKILL.md` (not files at root)
- **Network calls**: Yes, skills can execute scripts that make HTTP calls
- **MCP in skills**: Not directly; skills invoke MCP servers via Claude's context if a MCP connector is active (not bundled in skill itself)
- **Restrictions**: Code execution must be enabled on account; no hardcoded API keys (security risk)

---

## 3. COWORK (CLAUDE DESKTOP'S AGENTIC WORKSPACE)

**Source:** https://claude.com/docs/cowork/overview.md, https://claude.com/docs/plugins/overview.md

- **What it is**: Agentic workspace for multi-step autonomous tasks; works directly on local files
- **Platforms**: Claude Desktop (macOS, Windows, Linux)
- **Plugin support**: YES — full support for plugins in Cowork (beta feature)
- **MCP support**: YES — Cowork supports remote HTTP/SSE MCP and local stdio MCP (when bundled in plugins)
- **Skills support**: YES — plugins can bundle skills; Cowork loads them
- **Plugin installation in Cowork**: Same as Claude Code: `/plugin install` from UI or command-line `claude plugin install`
- **Cowork vs Claude Code plugins**: Plugins are the same; Cowork loads plugins enabled for the account, synced from claude.ai at session start
- **Plugin scope in Cowork**: Plugins currently saved locally to the machine (organization sharing coming soon per docs)

---

## 4. CLAUDE.AI WEB & MOBILE

**Source:** https://claude.com/docs/skills/overview.md, https://claude.com/docs/plugins/overview.md, https://claude.com/docs/connectors/overview.md, https://claude.com/docs/connectors/custom/remote-mcp.md

### Custom Skills
- **Uploading skills**: YES — Users can upload skill ZIPs via Settings → Capabilities → Skills (Pro, Max, Team, Enterprise)
- **Skill format**: Same as Claude Code (SKILL.md in ZIP; Org admins can provision skills org-wide)
- **Network calls in skills**: YES — scripts in skills can make HTTP/API calls
- **MCP in skills**: Not directly bundled; skills use active MCP connectors if authenticated

### Custom Remote MCP Servers
- **Adding custom MCP servers**: YES on Free/Pro/Max as individual users; Team/Enterprise can configure org-wide via Settings → Connectors → Custom
- **Admin controls**: Team/Enterprise owners can add custom remote MCP servers in Connectors settings; users then authenticate and connect
- **NOT admin-controlled by default**: Free/Pro/Max users can add their own custom MCP URLs
- **Custom MCP on Enterprise**: Team and Enterprise plans can add custom MCP servers, but there is NO managed allowlist of MCP servers that blocks unapproved ones (unlike plugins)

### Claude.ai Web Version (claude.ai/code)
- **Plugin support**: NO — Claude Code web version does NOT support plugins or marketplaces
- **MCP support**: YES — remote HTTP/SSE MCP servers only (no local stdio)

---

## 5. MCP IN CLAUDE CODE

**Source:** https://code.claude.com/docs/en/mcp.md, https://code.claude.com/docs/en/mcp-quickstart.md, https://claude.com/docs/connectors/building/authentication.md

### Project-Scope & User-Scope `.mcp.json`
- **Project scope**: `.mcp.json` in project root — shared via git, team collaboration
- **User scope**: `~/.claude/mcp.json` — personal, all projects
- **Local scope**: `.mcp.json` in local settings — personal, not shared

### OAuth for Remote HTTP MCP Servers
- **Supported OAuth flows**:
  - `oauth_dcr` (Dynamic Client Registration) — Claude registers itself
  - `oauth_cimd` (Client ID Metadata Document) — Claude publishes its client metadata
  - `oauth_anthropic_creds` — Anthropic holds credentials (hosted Claude surfaces)
  - Manual `client_id`/`client_secret` entry (custom connections)

- **Claude Code specifics**: Uses loopback OAuth redirect `http://localhost:<ephemeral-port>/callback`; authorization server must accept port-agnostic `localhost/127.0.0.1` redirects per RFC 8252
- **Browser flow**: YES — Claude Code opens user's browser for OAuth consent; user logs in with their own account
- **Credential storage**: OAuth tokens stored in Claude Code's secure storage per session

### Local Stdio MCP Servers
- **Format**: 
  ```json
  {
    "mcpServers": {
      "my-server": {
        "type": "stdio",
        "command": "node",
        "args": ["./server.js"],
        "env": { "KEY": "value" }
      }
    }
  }
  ```
- **Process management**: Claude Code starts/stops stdio servers per session
- **Can it be `npx`/bundled script**: YES — `"command": "npx", "args": ["-y", "@package/server"]` works
- **OAuth in stdio servers**: Stdio servers can open user's browser for OAuth (server initiates browser.open() callback); loopback ports available via `process.env.PORT` or server chooses ephemeral port. User's OS handles browser launch.

### Anthropic Google MCP Servers
- **Official Anthropic MCP servers for Google Workspace**: NOT documented in code.claude.com
- **Google Slides MCP**: Google (NOT Anthropic) offers a beta **Google Slides MCP server** at `https://slidesmcp.googleapis.com/mcp/v1`
  - Requires Google Cloud project + Slides API enabled + OAuth setup
  - Tools: `read_presentation`, `update_presentation`
  - Requires manual OAuth scope configuration in Google Cloud Console

---

## 6. ENTERPRISE/MANAGED SETTINGS

**Source:** https://code.claude.com/docs/en/managed-settings.md, https://code.claude.com/docs/en/settings-reference.md

### Plugin/Marketplace Restrictions
- **`blockedMarketplaces`**: Deny-list — prevents users from adding these marketplace sources by name
- **`strictKnownMarketplaces`**: Force users to only use approved marketplaces (all others blocked)
- **`pluginSuggestionMarketplaces`**: Allow-list — controls which marketplace plugins appear as suggestions
- **`enabledPlugins`**: Force-enable or force-disable plugins for all users
- **Enforcement**: Managed settings override user/project/local settings (with few exceptions)

### MCP Restrictions
- **`allowedMcpServers`**: Allow-list — users can only add these MCP servers
- **`deniedMcpServers`**: Deny-list — block these MCP servers
- **`allowManagedMcpServersOnly`**: Force users to use ONLY org-provided managed MCP servers
- **`managedMcpServers`**: Org-provided MCP servers (pre-configured, deployed to all users)
- **`disableClaudeAiConnectors`**: Turn off claude.ai connector fetching (forces use of local MCP only)

### Failure Mode for Locked-Down Orgs
- Users in orgs with `strictKnownMarketplaces` + allowed-list cannot install external plugins
- Users with `allowedMcpServers` allowlist cannot add custom MCP servers outside the list
- Users with `allowManagedMcpServersOnly` can only use org MCP servers
- **BUT**: No documented way to block plugins entirely; restriction is marketplace-based
- **Reality**: Enterprise users CAN be locked down to org-provided plugins/MCP only, but it requires careful managed settings configuration

---

## 7. ANTHROPIC'S GOOGLE SLIDES INTEGRATION PATH

**Source:** https://techweez.com/2026/09/17/claude-docs-slides/, https://developers.google.com/workspace/slides/api/guides/configure-mcp-server, Multiple 2026 news sources

### Claude Docs & Slides (Sept 2026 Beta)
- **What it is**: Anthropic released native Claude Docs and Claude Slides tools in September 2026 (beta)
- **Capability**: Claude can CREATE new Google Slides presentations and save them to Google Drive; can READ existing presentations via Google Drive connector
- **Limitation**: Claude CANNOT EDIT existing presentations (read-only on existing + create-new model)
- **Export**: Presentations exportable as PowerPoint (PPTX) or PDF
- **Usage**: Built into unified Claude chat interface (merged Cowork + Chat + Design)

### Google Slides MCP Server
- **Source**: Google (beta, not Anthropic)
- **URL**: `https://slidesmcp.googleapis.com/mcp/v1`
- **Setup**: Requires Google Cloud project, Slides API, OAuth with specific scopes
- **Tools**: `read_presentation` (read), `update_presentation` (write/mutate)
- **Auth**: OAuth 2.0; users must authenticate with their Google account
- **Status**: Beta; requires membership in Google Workspace Developer Preview Program

### No Official "Anthropic Google Slides Skill"
- **Conclusion**: Anthropic has NOT documented a reusable skill or pre-built MCP plugin for Google Slides
- **Your option**: Build custom Google Slides MCP server (or wrap Google's beta one) + distribute via plugin marketplace

---

## RECOMMENDATIONS FOR YOUR TOOL

### Architecture

1. **Build a local stdio MCP server** (Node.js or Python) that:
   - Opens user's browser for Google OAuth (each user logs in with their own account)
   - Stores OAuth tokens in `${CLAUDE_PLUGIN_DATA}` directory (plugin-scoped persistent storage)
   - Implements Google Slides API calls (create, read, update presentations)

2. **Package as a Claude Code plugin** containing:
   - `.mcp.json` with stdio MCP configuration
   - `bin/` with MCP server executable (or `scripts/` with `npx` command)
   - `skills/` with SKILL.md guiding users on how to create presentations
   - `plugin.json` manifest

3. **Distribute via GitHub marketplace**:
   - Create public GitHub repo with plugin structure
   - Add `.claude-plugin/marketplace.json` listing your plugin
   - Users add marketplace: `/plugin marketplace add your-org/repo`
   - Users install: `/plugin install your-plugin@your-marketplace-name`
   - Auto-updates enabled by default for GitHub sources

### Key Constraints Met

- ✅ **No claude.ai connectors**: Uses local stdio MCP server in plugin
- ✅ **GitHub distribution**: Plugin marketplace on GitHub with auto-updates
- ✅ **Non-technical install**: `/plugin marketplace add` + `/plugin install` (simple CLI commands)
- ✅ **Per-user Google auth**: Each user authenticates with their own Google account via browser OAuth

### Caveats

1. **Permission dialogs**: Non-technical users will see permission prompts for Bash/tool execution unless you pre-approve all tools in skills' `allowed-tools`
2. **Google Slides MCP complexity**: You must implement Google Slides API calls yourself or wrap Google's beta MCP; Google's requires Google Cloud setup
3. **Enterprise blockers**: In locked-down orgs with marketplace restrictions, your plugin may not install unless admin allowlists your marketplace
4. **Stdio server startup**: Users must have Node.js or Python available; consider packaging with `npx` for ease

---

## VERIFICATION NOTES

- **Plugin/marketplace docs**: Verified in official https://code.claude.com/docs/en/plugins.md, https://code.claude.com/docs/en/plugin-marketplaces.md
- **MCP in plugins**: Confirmed in https://code.claude.com/docs/en/plugins-reference.md (`.mcp.json` support documented)
- **OAuth for MCP**: Detailed in https://claude.com/docs/connectors/building/authentication.md
- **Google Slides integration**: NOT found in official Anthropic docs; sourced from Google Developers + 2026 news coverage of Anthropic's Sept 2026 release
- **Cowork plugin support**: https://claude.com/docs/plugins/overview.md explicitly states "Full plugin support in Cowork"
- **Enterprise settings**: https://code.claude.com/docs/en/settings-reference.md covers all `blockedMarketplaces`, `allowedMcpServers`, etc.

---

## FLAGGED UNKNOWNS

1. **Google Slides MCP server availability**: Documentation at https://developers.google.com/workspace/slides/api/guides/configure-mcp-server exists but requires Google Cloud Developer Preview membership; not clear if public/open
2. **Stdio MCP server OAuth browser launch**: Documented for "MCP servers can open browser" but exact mechanics of loopback + token storage in plugin context not explicitly detailed (inferred from RFC 8252 + Claude Code OAuth docs)
3. **Plugin auto-update on user launch**: Docs say "background refresh" after startup; unclear if it blocks session start or runs async (likely async based on "up to 10min delay" language)
4. **Skills on claude.ai**: Docs say "Skills" are available but fewer docs than Claude Code; unclear which frontmatter fields are truly required on web vs Code
5. **Claude Desktop Extensions (.mcpb/.dxt)**: Documented as enterprise feature but sparse detail on how end-users install them (likely via MDM or organization-provided installers)