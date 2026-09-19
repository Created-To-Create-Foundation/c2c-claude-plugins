# Pluginy Claude dla Created to Create

Marketplace pluginów Claude Code i Cowork dla społeczności [Created to Create](https://createdtocreate.pl). Instalujesz raz, aktualizacje przychodzą same.

| Plugin | Co robi |
|---|---|
| [`c2c-slides`](plugins/c2c-slides/) | Tworzy i edytuje prezentacje Google Slides w stylu C2C na Twoim koncie Google: spójny szablon, tone of voice, wykresy i diagramy w palecie marki. |

## Instalacja (2 minuty)

Wymagania: Claude Desktop (Cowork) lub Claude Code, konto Google, [Node.js 20+](https://nodejs.org/) (jeden instalator, „LTS”).

W Claude wpisz kolejno:

```
/plugin marketplace add GITHUB_ORG/c2c-claude-plugins
/plugin install c2c-slides@c2c
```

Potem poproś Claude: „Przygotuj prezentację na Weekend C2C”. Przy pierwszym użyciu otworzy się przeglądarka z logowaniem do Google. Narzędzie prosi wyłącznie o dostęp do plików, które samo utworzy (uprawnienie `drive.file`), nie widzi reszty Twojego Dysku.

Szczegółowa instrukcja z obrazkami i rozwiązywaniem problemów: [docs/install.md](docs/install.md).

## Dla utrzymujących

- Architektura i decyzje: [docs/architecture.md](docs/architecture.md)
- Konfiguracja Google Cloud (jednorazowo, właściciel): [docs/google-cloud-setup.md](docs/google-cloud-setup.md)
- Dodawanie kolejnego pluginu: [docs/adding-a-plugin.md](docs/adding-a-plugin.md)
- Raporty badawcze z projektowania: [docs/research/](docs/research/)

Licencja: MIT. Znaki i zasoby marki Created to Create pozostają własnością Fundacji Created to Create.
