# Konstytucja c2c-claude-plugins

Zasady nadrzędne dla marketplace'u pluginów Claude społeczności Created to Create i każdego pluginu w `plugins/`. Spec, plan i implementacja, które łamią którąś z zasad, wymagają najpierw zmiany konstytucji.

## Core Principles

### I. Narzędzie dla członka, nie dla programisty
Odbiorcą jest osoba nietechniczna z własnym kontem Google i płatnym Claude (Cowork lub Claude Code). Instalacja to dodanie marketplace'u i jeden klik „Install"; jedyną zależnością systemową może być Node.js LTS. Każdy komunikat błędu mówi użytkownikowi, co ma zrobić, po polsku. Kroki wymagające terminala są dopuszczalne wyłącznie jako ścieżka alternatywna.

### II. Bez konektorów claude.ai
Połączenia z usługami zewnętrznymi (Google i inne) żyją w pluginie: lokalny serwer MCP z własnym przebiegiem OAuth w przeglądarce użytkownika. Rozwiązanie nie może zależeć od konektorów claude.ai ani od ustawień konta Claude, bo u członków na kontach firmowych kontroluje je administrator. Dane logowania trzymamy tylko na komputerze użytkownika.

### III. Najmniejsze uprawnienia Google (NON-NEGOTIABLE)
Jedyny scope Google to `https://www.googleapis.com/auth/drive.file`. Zakresy wrażliwe (`presentations`, `spreadsheets`) i ograniczone (`drive`, `drive.readonly`) są zabronione, bo uruchamiają weryfikację aplikacji i limit użytkowników. Funkcje, których nie da się zrealizować pod `drive.file`, realizujemy inaczej (np. wykresy jako obrazy) albo nie realizujemy. Klient OAuth typu „Aplikacja komputerowa" może być publiczny zgodnie z dokumentacją Google; żadnych innych sekretów w repozytorium.

### IV. Spójność marki wymuszona mechanicznie
Wygląd wynika z szablonu i kodu, nie z dyscypliny modelu. Model dostaje zamknięty katalog typów slajdów (DeckSpec) i nigdy surowego API. Jedno źródło prawdy dla wyglądu: `brand/tokens.json` → katalog layoutów → generowany szablon, używane przez wszystkie renderery. Hierarchia źródeł stylu: kod produkcyjny createdtocreate.pl > dokumentacja strony > brandbook. Nazwy layoutów są kontraktem z istniejącymi prezentacjami: nie zmieniamy ich, tylko dodajemy nowe.

### V. Edycja zachowuje spójność, audyt ją przywraca
Każda operacja na istniejącej prezentacji zmienia treść placeholderów, nie style. Narzędzie audytu wykrywa odstępstwa (obce czcionki, kolory, slajdy poza szablonem) i naprawia to, co da się naprawić automatycznie, resztę raportuje. Kontrola wizualna miniaturami jest częścią przebiegu pracy, nie opcją.

### VI. Ścieżka awaryjna zawsze istnieje
Dla każdej funkcji głównej istnieje droga działająca bez pluginu lub bez Google: ten sam silnik generuje plik `.pptx` z tego samego szablonu. Skille muszą jasno mówić użytkownikowi, kiedy i jak z niej skorzystać.

### VII. Głos marki
Treści dla społeczności: forma „Wy", bez języka sprzedażowego, bez emoji, bez myślnika em-dash, „CREDO" wielkimi literami, Oliwia przed Łukaszem. Słownik i zasady są w skillu `c2c-brand-voice`; każdy nowy plugin tworzący treść dla członków korzysta z tego skillu, nie kopiuje zasad.

## Ograniczenia techniczne

- Dystrybucja wyłącznie przez ten marketplace na GitHubie; artefakty potrzebne w runtime (bundle serwera, szablon, zasoby) są commitowane, użytkownik nic nie buduje.
- Serwer MCP w TypeScript, bez natywnych zależności (tylko czysty JS i WASM), bundlowany do jednego pliku; Node 20+.
- Limity API są częścią projektu: jeden `batchUpdate` na partię żądań, backoff na 429, obrazy przez tymczasowy hosting na Dysku użytkownika sprzątany po wstawieniu.
- Testy jednostkowe dla schematów, geometrii i rendererów; przebieg na żywym koncie Google przed każdym wydaniem (skrypt spike w `docs/architecture.md`).

## Przebieg pracy

1. Nowa funkcja lub plugin zaczyna się od specyfikacji w `specs/NNN-nazwa/` (`/speckit-specify`), potem plan i zadania.
2. Zmiana wyglądu = zmiana tokenów/layoutów + regeneracja szablonu + przebudowa bundle + podbicie wersji pluginu w jednym commicie.
3. Każde wydanie: `npm run typecheck && npm test`, `claude plugin validate`, spike na żywym koncie, wpis w `docs/architecture.md`, wersja w `plugin.json`.
4. Commit i push na `main` tylko na wyraźne polecenie właściciela.

## Governance

Konstytucja ma pierwszeństwo przed CLAUDE.md, dokumentacją i skillami. Zmiana zasady wymaga: opisu powodu w commicie, aktualizacji `docs/architecture.md` i podbicia wersji konstytucji (MAJOR przy usunięciu lub odwróceniu zasady, MINOR przy dodaniu, PATCH przy doprecyzowaniu). Zasada III nie podlega zmianie bez przeglądu konsekwencji weryfikacyjnych Google opisanych w `docs/research/03-google-api-oauth-report.md`.

**Version**: 1.0.0 | **Ratified**: 2026-09-19 | **Last Amended**: 2026-09-19
