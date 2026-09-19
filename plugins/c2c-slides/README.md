# c2c-slides

Plugin Claude (Claude Code i Cowork): prezentacje Google Slides w stylu Created to Create.

- **Skille:** `c2c-slides` (przebieg pracy i DeckSpec), `c2c-brand-voice` (ton i słownik), `c2c-slides-pptx` (ścieżka awaryjna bez Google).
- **Serwer MCP** (`server/`): narzędzia `c2c_*` (logowanie Google `drive.file`, tworzenie i edycja prezentacji z szablonu, miniatury, audyt marki, eksport, render .pptx).
- **Szablon** (`template/c2c-template.pptx`): generowany z `server/src/brand/layouts.ts` i `brand/tokens.json`; wgrywany na Dysk użytkownika z konwersją do Google Slides.
- **Zasoby marki** (`brand/`): tokeny, logotypy, ikony (lucide, 3 kolory), tła gradientowe.

Instalacja użytkownika: [../../docs/install.md](../../docs/install.md). Konfiguracja Google Cloud: [../../docs/google-cloud-setup.md](../../docs/google-cloud-setup.md). Architektura: [../../docs/architecture.md](../../docs/architecture.md).

## Rozwój

```bash
cd server
npm install
npm run typecheck && npm test
npm run build:template     # po zmianach w layouts.ts / tokens.json
npm run build              # dist/index.js (MCP) + dist/render-pptx.js (CLI)
node ../scripts/build-skill-zip.mjs   # paczka skillu .pptx do claude.ai
```

Test bez Google: `node server/dist/render-pptx.js examples/przyklad-weekend.json /tmp/przyklad.pptx`.
