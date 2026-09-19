# c2c-claude-plugins

Marketplace pluginów Claude dla społeczności Created to Create. Każdy plugin żyje w `plugins/<nazwa>/`, marketplace w `.claude-plugin/marketplace.json`.

## Plugin `c2c-slides`

Prezentacje Google Slides w stylu C2C. Architektura i decyzje: `docs/architecture.md`. Raporty badawcze (brand, mechanizmy Claude, Google API/OAuth): `docs/research/`.

Zasady niepodlegające dyskusji:
- Jedyny scope Google to `drive.file`. Nie dodawaj `presentations`, `spreadsheets` ani `drive`.
- Wygląd wymusza szablon (`brand/tokens.json` → `server/src/brand/layouts.ts` → `template/c2c-template.pptx`). Model nie dostaje surowego batchUpdate; dostaje typy slajdów z `server/src/spec/deck-spec.ts`.
- Źródło stylu: kod produkcyjny createdtocreate.pl, potem docs strony, na końcu brandbook.
- Tekst po polsku dla użytkownika, bez em-dash, forma „Wy”.

## Praca w repo

```bash
cd plugins/c2c-slides/server
npm install
npm run typecheck && npm test
npm run build:template   # regeneruje template/c2c-template.pptx z layouts.ts
npm run build            # bundluje server/dist (commitowane, użytkownicy nie budują)
```

Po zmianie `layouts.ts` lub `tokens.json` zawsze: `build:template` + `build` + commit obu artefaktów. Zmiana nazwy layoutu (`name`) psuje mapowanie w istniejących prezentacjach; dodawaj nowe layouty zamiast zmieniać nazwy.

Wersję pluginu podbijaj w `plugins/c2c-slides/.claude-plugin/plugin.json`; marketplace odświeża się u użytkowników automatycznie.
