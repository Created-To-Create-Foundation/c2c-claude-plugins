# Feature Specification: C2C Slides (plugin c2c-slides)

**Feature Branch**: `001-c2c-slides`

**Created**: 2026-09-19

**Status**: Implemented (v0.1.0), spisane po budowie jako punkt odniesienia dla kolejnych zmian

**Input**: User description: "Narzędzie do Claude, dzięki któremu członkowie C2C tworzą i edytują prezentacje Google Slides na swoich kontach Google, spójne wizualnie i w tonie marki, z wykresami i diagramami w stylu C2C, bez ręcznego dbania o to przez użytkownika. Bez konektorów claude.ai, dystrybucja i aktualizacje przez GitHub, instalacja dla osoby nietechnicznej."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nowa prezentacja z rozmowy (Priority: P1)

Członek społeczności opisuje w Cowork lub Claude Code temat, publiczność i okazję. Claude proponuje konspekt, po akceptacji tworzy prezentację na Dysku Google użytkownika w szablonie C2C, sprawdza miniatury i oddaje link.

**Why this priority**: To jest podstawowa wartość narzędzia; bez tego nic innego nie ma sensu.

**Independent Test**: Z czystego konta: instalacja pluginu, logowanie Google, polecenie „przygotuj 8 slajdów na webinar o X" kończy się linkiem do prezentacji, której każdy slajd używa layoutu C2C.

**Acceptance Scenarios**:

1. **Given** zainstalowany plugin i brak logowania, **When** użytkownik prosi o prezentację, **Then** Claude najpierw uruchamia logowanie Google (jedno uprawnienie `drive.file`), a po nim tworzy prezentację.
2. **Given** zaakceptowany konspekt, **When** Claude wywołuje utworzenie prezentacji, **Then** w Dysku pojawia się plik, a wszystkie slajdy mają layouty z prefiksem „C2C ·" i tekst w placeholderach szablonu.
3. **Given** utworzona prezentacja, **When** Claude pobiera miniatury, **Then** ogląda je i poprawia slajdy z przepełnionym tekstem przed oddaniem linku.

---

### User Story 2 - Edycja z zachowaniem spójności (Priority: P2)

Użytkownik wraca do prezentacji (własnej lub wskazanej w oknie Google) i prosi o zmiany: tekst, kolejność, nowe slajdy, wykres. Zmiany nie naruszają szablonu, a audyt wykrywa i naprawia ręczne odstępstwa.

**Why this priority**: Prezentacje żyją; bez bezpiecznej edycji użytkownicy wrócą do ręcznego formatowania.

**Independent Test**: W prezentacji z szablonu ręcznie zmieniamy czcionkę i kolor tytułu; polecenie „sprawdź spójność i napraw" przywraca styl szablonu i raportuje slajdy spoza szablonu.

**Acceptance Scenarios**:

1. **Given** prezentacja utworzona narzędziem, **When** użytkownik prosi o zmianę tytułu slajdu, **Then** zmienia się tylko tekst placeholdera, style pozostają z szablonu.
2. **Given** prezentacja spoza narzędzia, **When** użytkownik podaje link, **Then** Claude otwiera okno wyboru pliku Google, a po wskazaniu pliku odczytuje jego konspekt.
3. **Given** prezentacja spoza szablonu C2C, **When** użytkownik prosi o „przemalowanie", **Then** Claude tworzy nową prezentację C2C z przeniesioną treścią i informuje, że stara pozostaje bez zmian.

---

### User Story 3 - Ścieżka awaryjna bez Google (Priority: P3)

Użytkownik, którego administrator Google Workspace blokuje aplikacje zewnętrzne, albo pracujący bez pluginu, dostaje plik `.pptx` z tego samego szablonu i instrukcję otwarcia w Google Slides.

**Why this priority**: Dotyczy mniejszości członków, ale bez tego część społeczności zostaje bez narzędzia.

**Independent Test**: Ten sam DeckSpec wyrenderowany do `.pptx`, wgrany na Dysk i otwarty w Slides, daje prezentację z tymi samymi layoutami i treścią.

**Acceptance Scenarios**:

1. **Given** błąd `admin_policy_enforced` przy logowaniu, **When** Claude go otrzymuje, **Then** wyjaśnia przyczynę i proponuje plik `.pptx` albo prywatne konto Google.
2. **Given** brak narzędzi MCP w sesji, **When** użytkownik prosi o prezentację, **Then** skill awaryjny generuje `.pptx` skryptem i podaje kroki wgrania na Dysk.

---

### Edge Cases

- Tekst dłuższy niż pole: limity długości w DeckSpec, kontrola miniaturami, podział na kolejne slajdy.
- Zdjęcie w innej proporcji niż pole: kadrowanie „cover" przed wstawieniem.
- Token Google wygasł lub został odwołany: komunikat i ponowne logowanie, bez utraty prezentacji.
- Wykres z więcej niż 5 seriami lub 12 kategoriami: odrzucony przez schemat z czytelnym komunikatem.
- Prezentacja ze starszą wersją szablonu (brak nowego layoutu): błąd wskazujący, by utworzyć nową prezentację lub dodać slajd innego typu.
- Limit API (429): ponowienie z backoffem, prezentacja nigdy nie zostaje na wpół zbudowana (sprzątanie po błędzie).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST tworzyć nową prezentację Google Slides na Dysku zalogowanego użytkownika z szablonu C2C, wypełniając wyłącznie placeholdery layoutów i elementy natywne generowane przez narzędzie.
- **FR-002**: System MUST udostępniać modelowi zamknięty katalog typów slajdów (okładka, sekcja, teza, punkty, dwie kolumny, tekst ze zdjęciem, karty 3/4, liczby, agenda, tabela, cytat, wykres, diagram, zdjęcie, osoby, zamknięcie) z limitami długości; model MUST NOT mieć dostępu do surowych żądań API.
- **FR-003**: System MUST logować użytkownika do Google w jego przeglądarce, prosząc wyłącznie o scope `drive.file`, i przechowywać tokeny tylko lokalnie.
- **FR-004**: System MUST umożliwiać wskazanie istniejącej prezentacji przez okno wyboru plików Google i pracę na niej w granicach `drive.file`.
- **FR-005**: System MUST edytować istniejące prezentacje z szablonu: zmiana tekstów, dodawanie, przenoszenie, usuwanie slajdów, notatki prelegenta.
- **FR-006**: System MUST audytować prezentację (layouty spoza szablonu, obce czcionki i kolory, schemat kolorów motywu) i naprawiać odstępstwa w placeholderach przez jawne przywrócenie stylu z definicji layoutu.
- **FR-007**: System MUST renderować wykresy (słupkowy, kolumnowy, liniowy, pierścieniowy, skumulowany) w palecie marki bez wrażliwych scope'ów, z etykietami jako edytowalnym tekstem w czcionkach marki, i zapisywać specyfikację wykresu w opisie obrazu.
- **FR-008**: System MUST budować diagramy (proces, oś czasu, filary z ikonami marki, macierz 2×2) i tabele z elementów natywnych w stylu marki.
- **FR-009**: System MUST dostarczać miniatury slajdów do kontroli wizualnej oraz eksport do PDF i PPTX.
- **FR-010**: System MUST generować ten sam DeckSpec do pliku `.pptx` z tym samym szablonem, także bez połączenia z Google.
- **FR-011**: Skille MUST prowadzić model przez przebieg: konspekt → akceptacja → utworzenie → miniatury → poprawki → link, i egzekwować ton marki (skill `c2c-brand-voice`).
- **FR-012**: Plugin MUST instalować się z marketplace'u GitHub w Cowork i Claude Code bez kroków budowania; aktualizacje przychodzą z marketplace'u.

### Key Entities

- **DeckSpec**: tytuł i lista slajdów typowanych; jedyny format, w jakim model opisuje prezentację.
- **Layout C2C**: nazwany layout szablonu z placeholderami (klucz, rodzaj, geometria, styl) i obszarem na treść natywną; kontrakt między szablonem, rendererem Slides i rendererem `.pptx`.
- **Tokeny brandu**: kolory, czcionki, skala typograficzna, palety wykresów, zasoby (logotypy, ikony, tła).
- **Prezentacja**: plik Google Slides utworzony przez narzędzie lub wskazany przez użytkownika; identyfikowana przez ID/URL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Osoba nietechniczna instaluje plugin i tworzy pierwszą prezentację w mniej niż 10 minut, wykonując najwyżej 3 kroki poza rozmową (dodanie marketplace'u, instalacja, logowanie Google).
- **SC-002**: 100% slajdów utworzonych narzędziem używa layoutów C2C; audyt na świeżo utworzonej prezentacji zgłasza 0 problemów.
- **SC-003**: Prezentacja 20 do 25 slajdów powstaje w mniej niż 60 s od akceptacji konspektu (zmierzono 35 s dla 23 slajdów).
- **SC-004**: Ręczna zmiana czcionki lub koloru w placeholderze jest wykrywana i naprawiana przez audyt w 100% przypadków testowych.
- **SC-005**: Logowanie Google nie pokazuje ekranu „aplikacja niezweryfikowana" ani nie wymaga dopisania użytkownika do listy testerów.

## Assumptions

- Użytkownik ma płatny plan Claude z dostępem do pluginów (Cowork lub Claude Code) oraz Node.js 20+.
- Konto Google użytkownika nie ma blokady aplikacji zewnętrznych; w przeciwnym razie obowiązuje User Story 3.
- Szablon jest wgrywany na Dysk jako `.pptx` i konwertowany, bo API nie tworzy layoutów; nazwy layoutów są stabilne.
- Zdjęcia dostarcza użytkownik (plik lokalny lub publiczny URL); narzędzie nie generuje zdjęć.
- Weryfikacja marki w Google (nazwa i logo na ekranie zgody) jest opcjonalna i poza zakresem tej specyfikacji.
