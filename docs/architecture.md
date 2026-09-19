# Architektura c2c-slides

Decyzja z 2026-09-19 (po analizie trzech podejść; raporty w `docs/research/`): plugin Claude Code/Cowork z lokalnym serwerem MCP i szablonem, dystrybuowany przez marketplace na GitHubie, z fallbackiem `.pptx`.

## Dlaczego tak

| Wymaganie | Rozwiązanie |
|---|---|
| Bez konektorów claude.ai | Połączenie z Google żyje w serwerze MCP pluginu (stdio, lokalnie), z OAuth PKCE w przeglądarce użytkownika. |
| Instalacja raz, aktualizacje same | Marketplace `.claude-plugin/marketplace.json` w repo; Claude odświeża go automatycznie. Bundle `server/dist` jest commitowany, użytkownik nic nie buduje. |
| Nietechniczny użytkownik | Dwie komendy `/plugin`, jedno logowanie Google, Node.js jako jedyna zależność. |
| Każdy na swoim koncie Google | Klient OAuth typu Desktop z jednym scope `drive.file`: bez weryfikacji zakresów, bez limitu użytkowników, tokeny trwałe. |
| Spójność mechaniczna | Szablon z masterem i layoutami; model widzi tylko typy slajdów (DeckSpec); tekst trafia do placeholderów i dziedziczy style; audyt resetuje nadpisania. |
| Edycja zachowuje spójność | `c2c_update_slide` zmienia tylko tekst placeholderów; `c2c_audit_deck --fix` przywraca style; slajdy poza layoutami są raportowane do odtworzenia. |

## Przepływ tworzenia prezentacji

1. Skill `c2c-slides` prowadzi rozmowę i buduje `DeckSpec` (zod, `server/src/spec/deck-spec.ts`).
2. `c2c_create_deck`: upload `template/c2c-template.pptx` na Dysk z konwersją do Google Slides (plik utworzony przez aplikację, więc dostępny pod `drive.file`).
3. Layouty odczytane z prezentacji są mapowane na katalog `layouts.ts` po nazwie, a placeholdery po geometrii (`slides/layout-map.ts`), bo konwersja nie gwarantuje indeksów.
4. Kompozytor (`render/compose.ts`) zamienia każdy slajd na: teksty placeholderów, obrazy do placeholderów (kadrowane przez resvg-wasm) i prymitywy natywne (tabele, diagramy, etykiety wykresów).
5. Wykresy: znaki (słupki, linie, pierścień) renderowane jako PNG bez tekstu; etykiety osi, wartości i legenda są natywnymi polami tekstowymi w czcionkach marki. Spec wykresu zapisany w alt-text obrazu do późniejszej edycji.
6. Obrazy trafiają do Slides przez tymczasowy folder na Dysku użytkownika udostępniony „każdy z linkiem” i usuwany po wstawieniu (Slides kopiuje bajty; API wymaga publicznego URL).
7. Jeden `batchUpdate` na około 300 żądań; notatki prelegenta w drugim przebiegu. Miniatury (`getThumbnail`) służą Claude do kontroli wizualnej.

## Jedno źródło prawdy dla wyglądu

`brand/tokens.json` (kolory, fonty, skala, palety wykresów) → `server/src/brand/layouts.ts` (18 layoutów w calach) → używane równolegle przez:
- `template/build-template.ts` (pptxgenjs `defineSlideMaster` + patch `theme1.xml`: kolory i czcionki motywu),
- renderer Google Slides (mapowanie placeholderów, contentArea dla treści natywnej),
- renderer `.pptx` (`pptx/renderer.ts`) dla ścieżki awaryjnej.

Zmiana wyglądu = zmiana tokenów/layoutów + `npm run build:template` + `npm run build`. Nazwy layoutów (`name`) są kontraktem z istniejącymi prezentacjami: nie zmieniać, tylko dodawać.

## Ograniczenia Google Slides, które akceptujemy

- API nie tworzy ani nie zmienia layoutów i motywu; stąd szablon jako `.pptx` i konwersja. Zmiana istniejącej prezentacji spoza szablonu = odtworzenie treści w nowej.
- Brak letter-spacing (eyebrow bez rozstrzelenia) i gradientu na tekście (złote cyfry pełnym kolorem).
- Zaokrąglenie narożników ROUND_RECTANGLE nie jest sterowalne, dlatego duże karty mają proste rogi, małe elementy zaokrąglone.
- Obrazy tylko PNG/JPEG/GIF z publicznego URL; natywne wykresy Arkuszy wymagałyby wrażliwego scope, więc renderujemy własne.
- Limity: 60 zapisów `batchUpdate` na minutę na użytkownika, 60 miniatur na minutę.

## Ścieżki awaryjne

- **Blokada admina Workspace** (`admin_policy_enforced`): własny klient OAuth użytkownika (`oauth-client.json` w katalogu danych) albo `.pptx`.
- **Brak pluginów** (claude.ai web, zablokowany firmowy Claude Code): skill `c2c-slides-pptx` jako `.zip` (`scripts/build-skill-zip.mjs`) z samodzielnym `render-pptx.js`; użytkownik wgrywa `.pptx` na Dysk i otwiera w Slides.
- **Opcja na później:** zdalny serwer MCP hostowany przez C2C (działa jako custom connector w claude.ai). Odrzucona w v1 z powodu kosztu utrzymania i przechowywania tokenów użytkowników.

## Zweryfikowane na żywym koncie Google (2026-09-19, konto Workspace C2C, scope tylko drive.file)

1. Konwersja `.pptx` → Slides zachowuje 18 layoutów C2C (nazwy, placeholdery, tła PNG, kolory motywu); Golos Text i Inter renderują się poprawnie, w tym polskie znaki.
2. Pełny przebieg pod `drive.file`: upload z konwersją, `batchUpdate` (23 slajdy w ok. 35 s), tymczasowy hosting obrazów na Dysku (`uc?export=download`), `getThumbnail`, `files.export` do PDF (ok. 6 s), `about.get` (e-mail konta).
3. Operacje na istniejącej prezentacji: edycja tekstów placeholderów, dodawanie, przenoszenie i usuwanie slajdów, notatki prelegenta.
4. Audyt: wykrywa ręczną zmianę czcionki i koloru w placeholderze i przywraca styl z definicji layoutu (jawnie, bo konwersja zapisuje style w tekście, więc „reset do dziedziczonego" zdejmowałby pogrubienie).
5. Odrzucenia API, na które trafiliśmy i które kod omija: półprzezroczyste obramowania tabel (tylko 0 lub 1), stylowanie pustej komórki, indeksy zakresów po `createParagraphBullets` (Slides usuwa wiodące tabulatory), brak stylu poziomu 2 list z szablonu (rozmiar ustawiany jawnie na 0,9×).

6. Picker desktopowy (`trigger_onepick=true`): wskazanie prezentacji w oknie Google daje dostęp pod `drive.file`; konspekt odczytany.
7. Cowork (Claude Desktop): plugin wgrany z paczki .zip (Settings → Plugins → Add), serwer stdio wystartował z Node hosta i użył tokenów z katalogu `~/.c2c-slides` (zmienna `CLAUDE_PLUGIN_DATA` nie została rozwinięta w Cowork; kod ma na to fallback).
8. Claude Code: instalacja z marketplace'u przez CLI i wywołanie narzędzi w świeżej sesji headless.

## Struktura repo

```
.claude-plugin/marketplace.json      marketplace "c2c" (kolejne pluginy: plugins/<nazwa>/)
plugins/c2c-slides/
  .claude-plugin/plugin.json          manifest
  .mcp.json                           serwer MCP: node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js
  skills/{c2c-slides,c2c-brand-voice,c2c-slides-pptx}/SKILL.md
  brand/  tokens.json, logos/, icons/{gold,warm-white,navy}, backgrounds/
  template/c2c-template.pptx          artefakt generowany
  google/oauth-client.json            publiczny klient Desktop (do uzupełnienia)
  examples/przyklad-weekend.json      pełny DeckSpec (24 slajdy, wszystkie typy)
  server/src/                         TypeScript; server/dist/ bundle (commit)
  scripts/build-skill-zip.mjs         paczka skillu .pptx
docs/  install.md, google-cloud-setup.md, adding-a-plugin.md, research/
```
