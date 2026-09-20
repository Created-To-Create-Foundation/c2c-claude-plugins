# Instalacja C2C Slides krok po kroku

Instrukcja dla osób, które nie programują. Zajmie około 5 minut.

## Czego potrzebujesz

1. **Claude** w jednej z wersji: aplikacja Claude Desktop z trybem Cowork (Mac lub Windows) albo Claude Code w terminalu. Plan Pro, Max, Team lub Enterprise.
2. **Konto Google fundacji** w domenie `createdtocreate.pl`. Narzędzie nie działa z prywatnym Gmailem ani z kontami innych firm.
3. **Node.js** w wersji 20 lub nowszej. To środowisko, w którym działa narzędzie. Pobierz instalator „LTS” ze strony https://nodejs.org/ i przejdź przez kreator, klikając „Dalej”. Sprawdzenie: w terminalu (Mac: Terminal, Windows: PowerShell) wpisz `node -v`; powinna pojawić się wersja, np. `v22.11.0`.

## Krok 1 i 2. Dodaj marketplace C2C i zainstaluj plugin

**Claude Desktop (Cowork):** Ustawienia → Plugins → przycisk **Add** → **Add marketplace** → wpisz `Created-To-Create-Foundation/c2c-claude-plugins` (lub pełny adres `https://github.com/Created-To-Create-Foundation/c2c-claude-plugins`). Na liście pojawi się „C2C Slides”; kliknij **Install**. Plugin działa w zadaniach Cowork, nie w zwykłym czacie.

**Claude Code (terminal):** w oknie rozmowy wpisz kolejno:

```
/plugin marketplace add Created-To-Create-Foundation/c2c-claude-plugins
/plugin install c2c-slides@c2c
```

Wybierz zakres „User” (dla siebie, we wszystkich projektach). Po instalacji Claude załaduje narzędzia `c2c_*`. Jeśli ich nie widać, wpisz `/reload-plugins` albo uruchom Claude ponownie.

## Krok 3. Połącz z Google

Napisz do Claude: „Połącz mnie z Google dla C2C Slides”. Otworzy się przeglądarka:

1. Wybierz konto fundacji (@createdtocreate.pl). Jeśli w przeglądarce jesteś zalogowany na inne konto Google, kliknij „Użyj innego konta”.
2. Zobaczysz ekran zgody z nazwą aplikacji i jednym uprawnieniem: „Wyświetlanie i zarządzanie plikami na Dysku Google utworzonymi przez tę aplikację lub otwartymi w niej”. Kliknij „Zezwól” (lub „Kontynuuj”).
3. Karta pokaże „Połączono z Google”. Wróć do Claude.

Logowanie zapisuje się na Twoim komputerze. Powtarzasz je tylko, gdy je odwołasz albo zmienisz komputer.

## Krok 4. Pierwsza prezentacja

Napisz na przykład: „Przygotuj 10-slajdową prezentację na webinar o sukcesji pokoleniowej w firmie rodzinnej, dla członków C2C”. Claude zaproponuje konspekt, po Twojej akceptacji utworzy prezentację na Twoim Dysku i poda link.

Co możesz potem powiedzieć:
- „Zmień tytuł trzeciego slajdu na …”
- „Dodaj po slajdzie z agendą wykres z tymi danymi: …”
- „Sprawdź, czy prezentacja jest spójna z marką” (audyt i naprawa)
- „Wyeksportuj do PDF”
- „Popraw tę prezentację: <link>” (dla prezentacji, której narzędzie nie tworzyło, otworzy się okno wyboru pliku Google)

## Aktualizacje

Automatyczne. Claude sprawdza marketplace przy uruchomieniu i pobiera nową wersję pluginu. Nic nie kopiujesz. W Cowork możesz też kliknąć **Update** przy marketplace „c2c” na stronie Plugins.

## Rozwiązywanie problemów

**„Dostęp zablokowany: aplikacji można używać tylko w organizacji” (błąd 403: org_internal).** W przeglądarce wybrano inne konto niż fundacyjne. Wróć do okna Google, kliknij „Użyj innego konta” i zaloguj się adresem @createdtocreate.pl. Jeśli nie masz takiego konta, napisz do Oliwii lub Łukasza.

**Narzędzia `c2c_*` nie pojawiają się.** Sprawdź `node -v` (wymagane 20+). Uruchom `/reload-plugins`. W Claude Code: `/mcp` pokaże status serwera „c2c-slides” i ewentualny błąd.

**Zapomniałem, gdzie jest prezentacja.** Powiedz „pokaż moje prezentacje C2C”; narzędzie wypisze pliki, które utworzyło.

**Nie mogę zainstalować pluginu w firmowym Claude.** Administrator mógł ograniczyć marketplace’y. Poproś o dopuszczenie marketplace „Created-To-Create-Foundation/c2c-claude-plugins” albo użyj ścieżki awaryjnej: skill `c2c-slides-pptx` (plik .pptx), który da się wgrać także w claude.ai (Ustawienia → Możliwości → Skille).

**Chcę odłączyć Google.** Powiedz „odłącz C2C Slides od Google” albo usuń dostęp na https://myaccount.google.com/permissions.
