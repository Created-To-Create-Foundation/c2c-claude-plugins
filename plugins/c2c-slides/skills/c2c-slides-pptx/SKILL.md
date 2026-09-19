---
name: c2c-slides-pptx
description: Ścieżka awaryjna C2C Slides bez połączenia z Google. Generuje plik PowerPoint (.pptx) z szablonem Created to Create, który użytkownik wgrywa na Dysk Google i otwiera w Google Slides. Użyj, gdy narzędzia MCP c2c_* są niedostępne, logowanie do Google jest zablokowane (np. przez administratora Workspace) albo użytkownik pracuje w claude.ai bez pluginu.
---

# C2C Slides · plik .pptx (bez Google)

Ten sam szablon i te same typy slajdów co w pluginie, ale wynik to plik `.pptx` zamiast prezentacji na Dysku. Treść piszesz wg skilli `c2c-slides` (struktura, typy slajdów) i `c2c-brand-voice` (ton).

## Kiedy używać

1. W sesji nie ma narzędzi `c2c_*` (serwer MCP nie wystartował lub plugin jest zablokowany).
2. `c2c_login` kończy się błędem „Access blocked” / `admin_policy_enforced`.
3. Użytkownik chce po prostu plik do wysłania, bez zapisywania na Dysku.

Jeśli narzędzia `c2c_*` są dostępne, użyj `c2c_render_pptx` zamiast tej instrukcji.

## Przebieg

1. Ułóż `DeckSpec` (jak w skillu `c2c-slides`) i zapisz go do pliku JSON, np. `deck.json`.
2. Uruchom renderer. Skrypt leży w jednym z dwóch miejsc; użyj pierwszego, który istnieje:
   - obok tego pliku SKILL.md: `render-pptx.js` (paczka skillu do claude.ai),
   - w pluginie: `${CLAUDE_PLUGIN_ROOT}/server/dist/render-pptx.js`.

   ```bash
   node render-pptx.js deck.json "Weekend C2C 2026.pptx"
   ```

   Wymagany Node.js 20 lub nowszy. Skrypt waliduje DeckSpec i wypisuje ścieżkę gotowego pliku. Błędy walidacji wskazują pole i limit; popraw JSON i uruchom ponownie.
3. Przekaż plik użytkownikowi razem z instrukcją otwarcia w Google Slides:
   - wejdź na drive.google.com, przeciągnij plik `.pptx`,
   - kliknij plik prawym przyciskiem → „Otwórz za pomocą” → „Prezentacje Google”,
   - Google utworzy kopię w formacie Slides; oryginalny `.pptx` można usunąć.
4. Powiedz wprost, czego ta ścieżka nie daje: edycji istniejących prezentacji na Dysku, audytu marki i miniatur do kontroli. Zaproponuj instalację pluginu, gdy będzie to możliwe.

## Ograniczenia

- Zdjęcia muszą być plikami lokalnymi lub publicznymi URL PNG/JPG.
- Czcionki Golos Text i Inter są w Google Fonts; w PowerPoint bez tych czcionek pojawi się zamiennik. Po otwarciu w Google Slides czcionki są poprawne.
