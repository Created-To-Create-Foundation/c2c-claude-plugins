# Research report: Google Slides brand-enforcement tool for many independent users (checked Sept 2026)

Legend: **[V]** = verified against current official Google docs (URL given); **[C]** = community/third-party source or Google issue tracker; **[I]** = my inference, needs a test.

---

## A. Google Slides API — brand-consistency mechanics

### A1. Masters, layouts, themes

- **[V] No request type creates or deletes masters/layouts, and there is no "apply theme"/"import theme" request.** The `batchUpdate` Request union has 43 members (createSlide, createShape, createImage, createSheetsChart, updateTextStyle, updatePageProperties, updateSlideProperties, table ops, groupObjects, comments preview…) — none of them create a master/layout or change the theme. https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
- **[V] `SlideProperties.layoutObjectId` and `masterObjectId` are read-only**, so you cannot re-point an existing slide to a different layout/master via the API. `notesMaster` is read-only. https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations.pages and https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations#Presentation
- **[V] Partial exception — theme colors:** `PageProperties.colorScheme`: "Only the concrete colors of the first 12 ThemeColorTypes are editable. In addition, only the color scheme on Master pages can be updated." So `updatePageProperties` with `objectId = <masterId>` and `fields: "colorScheme"` can rewrite the brand palette of an existing deck's master. https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations.pages
- **[I, strong]** Page elements can be added to masters/layouts by passing the master/layout objectId as `elementProperties.pageObjectId` (the field is documented as "the object ID of the page where the element is located", with no slide-only restriction; Apps Script's `Master` class exposes `insertShape/insertImage/insertTextBox` on the same backend). Apps Script cannot create new masters/layouts nor modify placeholders/color scheme via `Master`. https://developers.google.com/apps-script/reference/slides/master
- **[V] Practical "apply theme" = copy a template deck with Drive `files.copy`**; the Slides docs themselves point to Drive for copying. `createSlide` then uses `slideLayoutReference` (by `predefinedLayout` or `layoutId`) + `placeholderIdMappings` so you know the placeholder IDs up front. https://developers.google.com/workspace/slides/api/guides/presentations · https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
- **[V] Changing the theme of an existing user deck is UI-only:** Slide → Change theme → Import theme (from a Google Slides or PowerPoint file). https://support.google.com/docs/answer/1705254 — **[I]** API path for a legacy deck is: copy the branded template, then re-create content slide-by-slide; or apply only what the API allows (master color scheme + fonts via updateTextStyle).

### A2. Placeholders and text style inheritance

- **[V]** Unset `TextStyle` fields are inherited from the parent placeholder (non-list paragraphs inherit from the level-0 list style of the parent placeholder; list paragraphs from the matching nesting level). For shapes with no parent placeholder, unset fields fall back to editor defaults. https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations.pages/text
- **[V] Reset to inherited:** in `UpdateTextStyleRequest`, "to reset a property, include its field name in the field mask but leave the field itself unset"; also "if the value for a particular style matches that of the parent, that style will be set to inherit." https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
- **[V]** `insertText`: "Text styles for inserted text will be determined automatically, generally preserving the styling of neighboring text." **[I]** Into an empty layout placeholder this yields the master/layout style — the standard way brand typography is inherited.
- **[V]** `replaceAllText` returns 400 if given a notes-master page ID (masters have some restrictions).

### A3. Charts and images

- **[V] Native charts = Sheets charts only:** `createSheetsChart` (`LINKED` or `NOT_LINKED_IMAGE`, default not linked), `refreshSheetsChart`, `replaceAllShapesWithSheetsChart`. https://developers.google.com/workspace/slides/api/guides/add-chart
- **[V] Scope trap:** `createSheetsChart` "requires at least one of the spreadsheets.readonly, spreadsheets, drive.readonly, or drive OAuth scopes" — **`drive.file` alone is not enough**, so native charts force a sensitive (spreadsheets) or restricted (drive) scope. https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
- **[V] Sheets charts are fully styleable via Sheets API `ChartSpec`:** `fontName`, `titleTextFormat`, `backgroundColorStyle`, per-series `colorStyle`, axis `format`, data-label `textFormat`, `legendPosition`. https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/charts
- **[V] `createImage` requirements:** URL must be **publicly accessible**, ≤ 2 kB long; image < 50 MB, ≤ 25 megapixels; formats **PNG, JPEG, GIF only** (no SVG, no EMF/WMF). "The image is fetched once at insertion time and a copy is stored." https://developers.google.com/workspace/slides/api/guides/add-image
- **[C] Private Drive images do not work even with `drive` scope** — error "The provided image should be publicly accessible…"; open feature request with no Google fix: https://github.com/googleapis/googleapis/discussions/866 and https://github.com/googleapis/google-api-python-client/issues/2215
- **[C/I] Workaround used in the wild:** upload PNG to the user's Drive (app-created ⇒ allowed under `drive.file`), grant `anyone` reader permission, insert via `https://drive.google.com/uc?id=FILE_ID&export=download`, then remove the permission (safe because the image is copied at insertion). Caveat: Slides stores the source URL and shows it to collaborators, so never embed access tokens in URLs. Alternative: signed GCS URL (15-min TTL) as the official guide suggests.

### A4. Diagrams, shapes, tables, fonts

- **[V]** No SVG import. Shapes/lines/connectors/groups/tables: `createShape`, `createLine`, `updateLineCategory`, `rerouteLine`, `groupObjects`, `createTable`, `updateTableCellProperties`, `updateTableBorderProperties`, `mergeTableCells`… https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
- **[V] Fonts:** `TextStyle.fontFamily` "can be any font from the Font menu in Slides **or from Google Fonts**. If the font name is unrecognized, the text is rendered in Arial." `weightedFontFamily` supports weights 100–900. https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations.pages/text — **[V]** Golos Text is on Google Fonts: https://fonts.google.com/specimen/Golos+Text — **[I]** no UI "add font" step is required by the docs; verify rendering with a thumbnail test. Fonts may still substitute on PPTX export/offline machines.

### A5. Notes, thumbnails, export, quotas

- **[V] Speaker notes:** `notesPage.notesProperties.speakerNotesObjectId`; "Inserting text using this object ID will automatically create the shape." https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations.pages
- **[V] Thumbnails:** `presentations.pages.getThumbnail`, sizes LARGE (1600 px), MEDIUM (800), SMALL (200), PNG; URL lifetime 30 min; counts as an "expensive read". https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations.pages/getThumbnail
- **[V] Slides quotas:** reads 3,000/min/project, 600/min/user; expensive reads 300/min/project, 60/min/user; **writes 600/min/project, 60/min/user** (each `batchUpdate` = 1 write). 429 → exponential backoff. https://developers.google.com/workspace/slides/api/limits
- **[V] Drive quotas (new unit-based model):** 1,000,000 units/min/project, 325,000 units/min/user; 400M units/day before charges; reads ~5 units, list 100, download 200, edit 50. https://developers.google.com/workspace/drive/api/guides/limits
- **[V] Export via Drive `files.export`:** PPTX, ODP, PDF, TXT only (no per-slide PNG — use getThumbnail). https://developers.google.com/workspace/drive/api/guides/ref-export-formats
- **[V] Import:** upload .pptx/.odp with `mimeType: application/vnd.google-apps.presentation` converts to Slides. https://developers.google.com/workspace/drive/api/guides/manage-uploads — **[C]** 100 MB conversion cap.

### A6. Theme import / template galleries

- **[V]** Workspace **custom template gallery** is an admin-enabled feature (Business Standard/Plus, Enterprise, Education, Nonprofits…), scoped to one organization — useless for personal Gmail users and other companies' accounts. https://knowledge.workspace.google.com/admin/drive/turn-custom-drive-templates-on-or-off-for-users
- **[V]** "Import theme" is UI-only (A1).

---

## B. Google OAuth for a distributed desktop tool

### B1. Desktop (installed) OAuth client

- **[V]** Google: installed apps get "a client ID and, in some cases, a client secret, which you embed in the source code of your application. (In this context, the client secret is obviously not treated as a secret.)" https://developers.google.com/identity/protocols/oauth2 — loopback `http://127.0.0.1:port` redirect + PKCE recommended. https://developers.google.com/identity/protocols/oauth2/native-app
- **[V] 2025 changes:** client secrets shown only at creation; OAuth clients inactive 6 months are auto-deleted (restorable 30 days). https://developers.googleblog.com/en/usability-and-safety-updates-to-google-auth-platform/
- **[I] Risks of a public client_id/secret in GitHub:** anyone can impersonate your consent screen for phishing, burn your per-project quota and your 100-user cap, or get your project flagged/suspended under https://developers.google.com/identity/protocols/oauth2/policies. Acceptable-in-practice pattern (gcloud, md2googleslides, gws all do variants), but the abuse surface is real; keep scopes minimal.

### B2. Testing vs Production; unverified apps

- **[V] Testing:** ≤ 100 test users, added manually by the project owner; "Authorizations by a test user will expire seven days from the time of consent" (refresh tokens die weekly unless only basic profile scopes). https://support.google.com/cloud/answer/15549945 and https://developers.google.com/identity/protocols/oauth2#expiration
- **[V] Production, unverified, sensitive/restricted scopes:** unverified-app screen before consent + **100 new-user lifetime cap per project that "cannot be reset"**; exhausting it disables sign-in. Cap does not apply to *approved* scopes. https://support.google.com/cloud/answer/7454865 · https://support.google.com/cloud/answer/13463817
- **[V]** Users **can** click through (Advanced → "Go to <app> (unsafe)"): Apps Script docs say the flow "allows these users to authorize unverified apps and use them, but only after confirming they understand the risks." https://developers.google.com/apps-script/guides/client-verification (also referenced for the Keep API at https://developers.google.com/workspace/keep/api/troubleshoot-authentication-authorization)
- **[V] If you request only non-sensitive scopes (e.g. `drive.file`), no scope verification is required** and no user cap applies; only optional brand verification (2–3 business days) to show name/logo. https://support.google.com/cloud/answer/9110914 · https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

### B3. Scope classification (official Slides scopes page)

| Scope | Class |
|---|---|
| `drive.file` | Non-sensitive / recommended |
| `presentations`, `presentations.readonly` | **Sensitive** |
| `spreadsheets`, `spreadsheets.readonly` | **Sensitive** |
| `drive`, `drive.readonly` | **Restricted** |

**[V]** https://developers.google.com/workspace/slides/api/scopes · https://developers.google.com/workspace/sheets/api/scopes · https://developers.google.com/workspace/drive/api/guides/api-specific-auth

- **[V] Slides API works with `drive.file` alone** (it is listed as a valid Slides API scope): `presentations.create`, `.get`, `.batchUpdate`, `getThumbnail` on files the app created or the user picked. `drive.file` = files "you open with an app or that the user shares with an app while using the Google Picker API".
- **[C] `files.copy` of a template the app didn't create fails under `drive.file` with 404** even if the source is "anyone with link" — Google issue "files.copy method fails with drive.file Scope (404 File Not Found)": https://issuetracker.google.com/issues/396344374 (community thread: https://groups.google.com/g/google-apps-script-community/c/UjNvjioZgOo). **[I]** Treat as: with drive.file you can only copy a file the user has previously picked/opened with the app.
- **[V] Google Picker for desktop apps (GA):** append `prompt=consent&trigger_onepick=true` (optional `allow_multiple`, `mimetypes`, `file_ids`) to the normal OAuth URL; Picker opens in the system browser; redirect returns `code` **and `picked_file_ids`**. Restriction: **only `drive.file`, cannot be combined with any other scope**; Desktop client type. https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker · https://developers.google.com/workspace/drive/picker/guides/overview-desktop — **[I]** this is the clean way for a CLI to get access to (a) the shared brand template, (b) a user's existing deck, without sensitive scopes.

### B4. Verification process

- **[V] Requirements:** privacy policy hosted on the same domain as the homepage and linked on the consent screen; public homepage describing the app; authorized domain verified in Search Console; **unlisted YouTube demo video** showing the OAuth flow and scope use; per-scope justification. https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification · https://support.google.com/cloud/answer/13461325
- **[V] Timelines:** brand 2–3 business days; sensitive "typically 3–5 business days" (sensitive-scope page) / "10 business days" (FAQ); restricted ≈ 6 weeks. Not guaranteed. https://support.google.com/cloud/answer/13463817
- **[V] CASA (restricted scopes):** required "if you store or transmit restricted scope data on servers"; assurance levels AL1/AL2; annual revalidation; "Google does not charge the developer any fees… cost agreed between developer and assessor". https://support.google.com/cloud/answer/13465431 — **[C]** market prices ≈ $540 (Tier 2, Google-negotiated rate) to ~$4,500 (Tier 3 pentest). https://www.switchlabs.dev/post/casa-tier-2-tier-3-security-review-providers-pricing-and-the-cheapest-option — **[I]** a purely local CLI may avoid CASA but still needs the multi-week restricted review, so avoid `drive`/`drive.readonly` entirely.
- **[V]** Re-verification is triggered if you add redirect URIs / origins or rename the product. https://support.google.com/cloud/answer/7454865

### B5. Internal user type

- **[V]** Internal is only for projects inside a Google Cloud Organization and limits auth to that org's members — not applicable to a mixed community. https://support.google.com/cloud/answer/15549945

### B6. Users on other companies' Workspace accounts

- **[V]** Admins: Security → API controls → App access control; per-app Trusted / Limited / Specific Google data / Blocked; "unconfigured third-party apps" default is *Allow all*, but many orgs set *Block all* or *Basic info only*; admins can set a custom block message. https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data
- **[C]** User sees "Access blocked: Your institution's administrator needs to review <app>" (error `400: admin_policy_enforced`) with a "request access" affordance; the only legitimate path is the admin trusting your client ID. https://developers.google.com/workspace/classroom/best-practices/access-control-enhancements
- **[V]** Refresh tokens also die with `admin_policy_enforced` if policy changes later. https://developers.google.com/identity/protocols/oauth2#expiration

### B7. Alternative auth paths

- **(a) Each user creates own Cloud project + OAuth client — [V] steps:** create project → enable Slides (+Drive) API → configure Auth Platform (External, Testing) → add self as test user → create Desktop client → download JSON → run tool. ~8–10 console steps; token expires every 7 days in Testing unless they publish to Production (then they hit the unverified screen). **[V]** `gws auth setup` automates this but *requires the gcloud CLI installed* (creates project, enables APIs, creates client, sets consent screen to testing, adds test user). https://github.com/googleworkspace/cli
- **(b) Apps Script:** **[V]** a container-bound script is copied with the presentation ("If they make a copy of the container file, they become the owner of the copy and can see and run a copy of the script"). https://developers.google.com/apps-script/guides/bound — **[V]** scripts with sensitive scopes still need OAuth verification unless owner and users share a Workspace domain; otherwise users get the unverified screen and the user cap applies; verification requires switching to a standard Cloud project. https://developers.google.com/apps-script/guides/client-verification — **[V]** Marketplace: public listing requires OAuth verification + Marketplace review (days); private listing only within your own Workspace org; no "unlisted" option documented. https://developers.google.com/workspace/marketplace/how-to-publish · https://developers.google.com/workspace/marketplace/about-app-review
- **(c) `gcloud auth application-default login`:** **[V]** gcloud's own client cannot add Drive/Slides scopes — "This app is blocked / Access blocked: Authorization Error… you might be attempting to use scopes that aren't supported by the default ADC setup"; fix is your own client via `--client-id-file` + `--scopes`. https://docs.cloud.google.com/docs/authentication/troubleshoot-adc · https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/login → not a shortcut.
- **(d) Google Workspace CLI `gws`:** **[V]** github.com/googleworkspace/cli — 31,053★, actively pushed (Sept 2026), Rust, "experimental… **not an officially supported Google product**", breaking changes before v1.0; install via GitHub binaries, `npm i -g @googleworkspace/cli`, `brew install googleworkspace-cli`, cargo, nix; commands generated from Discovery so **Slides is supported** (`gws slides presentations create/get/batchUpdate`, `pages get/getThumbnail`; bundled skill `skills/gws-slides/SKILL.md`); **requires the user's own OAuth client** (`~/.config/gws/client_secret.json`) or `gws auth setup` via gcloud; credentials AES-256-GCM encrypted at rest. README notes Testing-mode consent is limited to ~25 scopes and that users must be added as test users or login fails with "Access blocked".
- **(e) Official Google Workspace MCP servers:** **[V]** remote servers in **Developer Preview** — Slides at `https://slidesmcp.googleapis.com/mcp/v1` (also Drive, Docs, Sheets, Gmail, Calendar, Chat, People). Tools: `read_presentation`, `update_presentation`. Auth: OAuth 2.0 with **your own Cloud project and a Web-type OAuth client**, scopes `drive.readonly`, `drive.file`, `presentations`, `presentations.readonly`; clients: Claude (Pro/Max/Team/Enterprise custom connectors), Antigravity, any Streamable-HTTP MCP client. Same consent-screen/verification constraints apply. https://developers.google.com/workspace/slides/api/guides/configure-mcp-server · https://developers.google.com/workspace/guides/configure-mcp-servers — **[V]** github.com/googleworkspace/mcp does not exist (404); google/mcp (4,589★) is Google's MCP index repo; googleworkspace/developer-mcp is archived.

### B8. Community-owned Drive + service account (trade-off note)

- **[I]** A service account as member of a **shared drive** (Workspace-only feature) lets the tool write decks without any per-user OAuth or verification, and files stay community-owned. Costs: the SA key cannot be shipped in a public repo (a real secret), so you need a small backend/proxy; users lose "my own Drive" ownership; `createImage` still needs public URLs; the restricted-scope exemption "service accounts accessing only owned data" applies. https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

---

## C. Existing tools / prior art

### C1. Open-source MCP servers with Slides support (stars from GitHub API, 19 Sept 2026)

| Repo | ★ | Auth | Themes/templates |
|---|---|---|---|
| taylorwilsdon/google_workspace_mcp | 3,191 | own OAuth client (OAuth 2.0/2.1, SA-DWD); `uvx workspace-mcp`; MIT; paid hosted option $5/mo | 7 Slides tools (create, batchUpdate, thumbnails, comments); no theme handling |
| piotr-agier/google-drive-mcp | 219 | own OAuth client | Slides among Drive/Docs/Sheets; no theme handling |
| matteoantoci/google-slides-mcp | 188 | own Desktop client, creds in OS keychain; Claude Code plugin install | 5 tools (create/get/batch_update/get_page/summarize); no theme handling |
| dguido/google-workspace-mcp | 38 (archived) | own client | — |
| jemmanuele/gslide-mcp | 2 | — | "tailored for Claude Code" |

None expose template/layout/theme enforcement — they're thin wrappers over `batchUpdate`; brand logic would have to live in your skill/tool layer. https://github.com/taylorwilsdon/google_workspace_mcp · https://github.com/matteoantoci/google-slides-mcp · https://github.com/piotr-agier/google-drive-mcp

### C2. Markdown/PPTX → Slides

- **[V] md2googleslides:** 4,730★, **archived 18 Nov 2025 (read-only)**; requires the user's own OAuth client JSON in `~/.md2googleslides`; explicitly does *not* manage themes ("set a base theme… on Google Slides directly"; `--style` is only code highlighting). https://github.com/googleworkspace/md2googleslides
- **[V] PPTX import path:** Drive upload with conversion MIME (A5); **[C]** fidelity risks: font substitution to Arial for non-Google fonts, complex multi-master hierarchies flattened, SmartArt/animation loss; 100 MB cap. Useful fallback (python-pptx → convert) because the *converted file is app-created ⇒ accessible under `drive.file`*. **[I]** Test whether your brand master survives conversion before relying on it.
- Marp/reveal produce HTML/PDF — no Slides route except via PPTX export.

### C3. Branded charts as images

- **[V] QuickChart:** Chart.js JSON → PNG/SVG/WebP/PDF by GET/POST; open source (GPLv3), self-hostable via Docker; https://quickchart.io/documentation/ · https://github.com/typpo/quickchart — **[C]** public free tier ≈ 60 charts/min and ~1,000/month (community/pricing pages). Output URL is public → directly usable with `createImage` (short-lived `/chart/create` URLs recommended; `createImage` copies the bytes at insertion).
- Local rendering (matplotlib/vega-lite → PNG) is fine for quality but needs hosting: public URL required (A3); Drive temp-share workaround **[C/I]**; signed GCS URL **[V, official suggestion]**.

---

## Implications for architecture (≤15 bullets)

1. **Brand = a template deck, not API theme calls.** The only mechanically enforceable brand is the master/layout set in a *template presentation*; the API can copy it (Drive `files.copy`), create slides from its layouts, and insert into placeholders so text inherits master styling. It cannot create/modify layouts or re-theme a deck, except editing the master's 12 theme colors and adding elements to masters/layouts.
2. **"Surviving user edits"** works via inheritance: keep text in layout placeholders, never set explicit `fontFamily`/colors on slide text (they become overrides); an audit pass can reset overrides with `updateTextStyle` (field in mask, value unset) and re-assert master `colorScheme`; slides can't be re-bound to a layout, so off-layout slides must be re-created.
3. **Least-friction OAuth = `drive.file` only**: no scope verification, no 100-user cap, tokens don't expire in 7 days once Production, users never see the "unsafe" screen. Cost: the tool can only touch files it created or the user *picked*.
4. **Use the desktop Picker flow (`trigger_onepick=true`, GA) to get the brand template and users' existing decks into `drive.file` scope** — but that OAuth request must contain *only* `drive.file`, so run it as a separate auth step from any other scopes.
5. **Avoid `presentations`/`spreadsheets` (sensitive) unless you commit to verification** (privacy policy + homepage on a verified domain, demo video, 3–10 business days) — otherwise a 100-user lifetime cap you cannot reset.
6. **Never request `drive`/`drive.readonly`** (restricted; weeks of review, possible CASA at $500–4,500/yr).
7. **Native Sheets charts force sensitive scopes** (`createSheetsChart` needs spreadsheets.* or drive.*). Under a `drive.file`-only design, render charts to PNG (QuickChart/self-hosted/matplotlib) and use `createImage`.
8. **Images need a public URL**; plan a hosting primitive: temp public share of an app-created Drive file, a signed bucket URL, or QuickChart short URLs. Never put tokens in image URLs (stored with the deck).
9. **A single shared Desktop client ID/secret in the public repo is what Google's own installed-app doc describes**; accept it, but pin minimal scopes, monitor the project, and keep the client active (6-month auto-delete).
10. **Provide the "bring your own client" fallback** (drop a `client_secret.json`, same as gws/md2googleslides) for users whose Workspace admin blocks your client ID, and document the `admin_policy_enforced` / "Access blocked: administrator needs to review" experience with the request-access flow.
11. **Fonts:** any Google Fonts family name works via `fontFamily` (unknown → Arial); set brand fonts in the template master, not per-run; use `getThumbnail` (LARGE, 1600 px) as automatic visual QA — budget 60 expensive reads/min/user.
12. **Write budget is 60 batchUpdates/min/user** — batch aggressively (one `batchUpdate` per deck build) and retry on 429 with backoff.
13. **Fallback when the tool can't run locally:** (a) template + bound Apps Script menu (copied with the template, per-user authorization, unverified screen but click-through), (b) python-pptx → Drive conversion upload (app-created, `drive.file`-compatible; validate master fidelity), (c) Google's remote Slides MCP server — still requires your own verified OAuth web client and paid Claude plans, so it does not remove the OAuth problem.
14. **Personal Gmail users have no template-gallery or admin-trust mechanism**; the template must be shared as a public/anyone-with-link deck and picked via the Picker (or copied by the user via the `/copy` link and then picked).
15. **Prior art (gws 31k★, taylorwilsdon MCP 3.2k★, md2googleslides archived) all punt on auth (bring your own client) and on themes** — your differentiator is the template-copy + placeholder-only + audit/reset loop, which is achievable entirely within `drive.file`.