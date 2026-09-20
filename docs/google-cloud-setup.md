# Konfiguracja Google Cloud (jednorazowo, właściciel narzędzia)

Cel: jeden projekt Google Cloud należący do Workspace C2C, z klientem OAuth typu „Aplikacja komputerowa” i JEDNYM uprawnieniem `drive.file`. Dzięki temu:
- nie ma weryfikacji zakresów ani limitu 100 użytkowników (scope niewrażliwy),
- tokeny nie wygasają po 7 dniach (aplikacja w trybie produkcyjnym),
- użytkownik nie widzi ekranu „aplikacja niezweryfikowana”.

Czas: około 20 minut.

## 1. Projekt i API

1. https://console.cloud.google.com/ → zaloguj się kontem Workspace C2C → „Nowy projekt”, nazwa `c2c-slides`.
2. „Interfejsy API i usługi” → „Biblioteka” → włącz **Google Slides API** i **Google Drive API**. Bez tego pierwsze wywołanie zwróci `403 accessNotConfigured` z linkiem do włączenia; po włączeniu odczekaj minutę.

## 2. Ekran zgody (Google Auth Platform)

1. „Google Auth Platform” → „Branding”: nazwa aplikacji **C2C Slides**, e-mail pomocy `kontakt@createdtocreate.pl`, logo (opcjonalnie, `plugins/c2c-slides/brand/logos/logo-mark-square-navy-512px.png`), strona główna `https://createdtocreate.pl`, polityka prywatności `https://createdtocreate.pl/polityka-prywatnosci`, regulamin `https://createdtocreate.pl/regulamin`, autoryzowana domena `createdtocreate.pl`.
2. „Odbiorcy” (Audience): typ **Zewnętrzny**. Po zapisaniu kliknij **„Opublikuj aplikację”** (status: W produkcji). Bez tego tokeny użytkowników wygasają po 7 dniach.
   Uwaga przy reużyciu projektu strony: jeśli typ jest **Wewnętrzny**, każdy spoza organizacji Cloud dostanie „Dostęp zablokowany … Błąd 403: org_internal” (zdarzyło się 2026-09-20 przy pierwszym teście). Typ zmienia się w tej samej sekcji; logowanie na stronie pozostaje ograniczone do domeny przez kod aplikacji.
3. „Zakresy dostępu do danych” (Data Access): dodaj wyłącznie `https://www.googleapis.com/auth/drive.file`. Nie dodawaj `presentations`, `spreadsheets` ani `drive`; każdy z nich uruchamia weryfikację i limity.
4. Opcjonalnie: „Weryfikacja marki” (Brand verification), by na ekranie zgody pojawiła się nazwa i logo C2C zamiast identyfikatora projektu. Trwa 2 do 3 dni robocze, wymaga potwierdzenia domeny w Search Console.

## 3. Klient OAuth

1. „Klienci” → „Utwórz klienta” → typ **Aplikacja komputerowa**, nazwa `c2c-slides-desktop`.
2. Pobierz JSON (przycisk pobierania obok klienta). Sekret pokazuje się tylko przy utworzeniu; zapisz plik.
3. Wklej `client_id` i `client_secret` do `plugins/c2c-slides/google/oauth-client.json` (zachowaj strukturę `installed`). Zgodnie z dokumentacją Google dla aplikacji instalowanych sekret nie jest traktowany jako tajny, więc może być w publicznym repozytorium. Utrzymuj minimalny zakres i obserwuj „Interfejsy API i usługi → Panel” pod kątem nietypowego ruchu.
4. Commit i podbicie wersji pluginu.

## 4. Test

W Claude z zainstalowanym pluginem: `c2c_login` → ekran zgody powinien pokazać tylko jedno uprawnienie (pliki utworzone przez aplikację). Potem `c2c_create_deck` z `plugins/c2c-slides/examples/przyklad-weekend.json` i `c2c_thumbnails`.

## Utrzymanie

- Google usuwa klientów OAuth nieużywanych przez 6 miesięcy (można przywrócić w 30 dni). Przy regularnym użyciu społeczności to nie wystąpi.
- Zmiana nazwy aplikacji lub dodanie domen może wymagać ponownej weryfikacji marki.
- Gdy administrator cudzego Workspace pyta o „identyfikator klienta do zaufania”, podaj `client_id` z pliku powyżej.

## Własny klient użytkownika (BYO)

Użytkownik, którego administrator blokuje klienta C2C, może użyć własnego projektu: te same kroki, a pobrany JSON zapisuje jako `oauth-client.json` w katalogu danych pluginu (Mac: `~/.c2c-slides/` lub katalog `CLAUDE_PLUGIN_DATA`) albo ustawia zmienną `C2C_OAUTH_CLIENT_FILE`. Narzędzie użyje go zamiast klienta C2C.
