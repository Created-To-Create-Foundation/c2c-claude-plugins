# Dodawanie kolejnego pluginu do marketplace

1. Utwórz katalog `plugins/<nazwa>/` z plikiem `.claude-plugin/plugin.json` (`name`, `version`, `description`, `author`; opcjonalnie `skills`, `commands`, `agents`, `hooks`, `mcpServers`).
2. Skille: `plugins/<nazwa>/skills/<skill>/SKILL.md` z frontmatterem `name` i `description` (opis decyduje, kiedy Claude sam sięgnie po skill).
3. Serwer MCP: `plugins/<nazwa>/.mcp.json`; ścieżki przez `${CLAUDE_PLUGIN_ROOT}`, dane użytkownika przez `${CLAUDE_PLUGIN_DATA}`. Commituj zbudowany bundle, użytkownicy nie budują.
4. Dopisz wpis w `.claude-plugin/marketplace.json` (`plugins[]`): `name` (slug, nigdy go potem nie zmieniaj), `displayName`, `description`, `source: "./plugins/<nazwa>"`, `category`, `keywords`.
5. Sprawdź lokalnie: `claude plugin validate .` oraz `/plugin marketplace add /ścieżka/do/repo` i `/plugin install <nazwa>@c2c`.
6. Wersjonowanie: podbijaj `version` w `plugin.json` przy każdej zmianie; marketplace odświeża się u użytkowników automatycznie.

Zasady wspólne: teksty dla użytkownika po polsku, forma „Wy” w treściach marki, żadnych sekretów w repo poza publicznym klientem OAuth typu Desktop.
