---
name: c2c-slides
description: Tworzy i edytuje prezentacje Google Slides w stylu Created to Create (C2C) przez narzędzia MCP c2c_*. Użyj, gdy członek społeczności C2C prosi o prezentację, slajdy, deck na konferencję, webinar lub materiał dla uczestników, albo chce poprawić/uspójnić istniejącą prezentację. Also triggers on "presentation", "slides", "deck", "Google Slides" in a C2C context.
---

# C2C Slides

Budujesz prezentacje Google Slides, których wygląd wymusza szablon Created to Create. Nie projektujesz slajdów; wybierasz typy slajdów z katalogu i piszesz treść w tonie C2C (skill `c2c-brand-voice`). Kolory, czcionki, układ i wykresy są mechaniczne, więc nie proś użytkownika o decyzje wizualne.

## Przebieg: nowa prezentacja

1. Ustal w jednym pytaniu (jeśli nie wiadomo): cel i publiczność, okazja (konferencja, webinar, materiał do wysyłki), czas trwania lub liczba slajdów, język (domyślnie polski), materiały źródłowe.
2. Wywołaj `c2c_catalog` raz na sesję, aby mieć aktualną listę typów slajdów, ich pól i limitów.
3. Zaproponuj konspekt (lista slajdów: typ + tytuł, po jednej linii) i poproś o akceptację. Reguła długości: około 1 slajd na minutę wystąpienia; materiał do wysyłki może być gęstszy.
4. Zbuduj `DeckSpec` i wywołaj `c2c_create_deck`. Przed tym `c2c_auth_status`; jeśli użytkownik nie jest zalogowany, `c2c_login` (otworzy przeglądarkę; powiedz mu, żeby zalogował się swoim kontem Google).
5. Wywołaj `c2c_thumbnails` i OBEJRZYJ miniatury (narzędzie Read na ścieżkach PNG). Szukaj: tekst wychodzący poza pole, puste placeholdery, zbyt długie tytuły, nieczytelne wykresy. Popraw przez `c2c_update_slide` (teksty) albo usuń i dodaj slajd ponownie (`c2c_delete_slides` + `c2c_add_slides`).
6. Oddaj użytkownikowi link do prezentacji i krótko powiedz, co zawiera. Zaproponuj eksport PDF (`c2c_export`), jeśli materiał ma być wysłany uczestnikom.

## Przebieg: edycja istniejącej prezentacji

- Prezentacja utworzona tym narzędziem: `c2c_get_deck` → zmiany przez `c2c_update_slide`, `c2c_add_slides`, `c2c_delete_slides`, `c2c_move_slides`. Na koniec `c2c_audit_deck` z `fix: true` i miniatury.
- Prezentacja, której narzędzie nie zna (użytkownik podaje link): najpierw `c2c_pick_presentation`. Użytkownik wskaże plik w oknie Google; dopiero wtedy masz do niego dostęp. Potem jak wyżej.
- Prezentacja spoza szablonu C2C (`isC2C: false` w `c2c_get_deck`): nie da się jej „przemalować” w miejscu. Zrób nową: z konspektu (`texts`, `otherTexts`) ułóż `DeckSpec`, utwórz nową prezentację, pokaż użytkownikowi obie i zapytaj, czy stara ma zostać.

## Zasady budowy DeckSpec

- Struktura: `cover` → (`section` → 2 do 5 slajdów treści)* → `closing`. Rytm jasne/ciemne około 60/40; ciemne są `cover`, `section`, `numbers`, `quote` (domyślnie), `closing`, `diagram` z `surface: "dark"`.
- Jeden przekaz na slajd. Tytuł 2 do 6 słów, zdaniowa wielkość liter, bez kropki (wyjątek: `statement`, gdzie tytuł jest pełnym zdaniem). Maksymalnie 7 punktów, każdy do 12 słów. Jeśli treści jest więcej, dodaj slajd.
- `eyebrow` to krótki kontekst (np. „Weekend C2C 2026”, „Moduł 2”), nie drugi tytuł. Renderer zamienia go na wersaliki.
- Karty (`cards`): tytuł karty to 1 do 2 krótkie słowa (przy 4 kartach maksymalnie 14 znaków, bo pole jest wąskie), treść do 2 zdań.
- Liczby: `numbers` do 3 wartości; wartość krótka („1,5 mln zł”, „87%”), etykieta pełnym zdaniem lub frazą.
- Wykresy: `chart` z maksymalnie 5 seriami i 12 kategoriami; jedną serię wyróżnij `highlightSeries`, gdy chodzi o porównanie „my vs reszta”. Do struktury procentowej użyj `donut` (do 5 kategorii). Zawsze podaj `source`, jeśli dane są zewnętrzne.
- Diagramy: `process` (kroki), `timeline` (daty/etapy), `pillars` (filary, z ikoną z listy `icons` w katalogu), `matrix` (2x2). Nie opisuj diagramu w punktach na tym samym slajdzie.
- Zdjęcia: tylko pliki, które użytkownik wskazał (ścieżka lokalna) albo publiczne URL PNG/JPG. Nie wymyślaj URL. Renderer kadruje do proporcji pola.
- `notes` (notatki prelegenta): 2 do 5 zdań w tonie C2C, w formie „Wy”, bez języka sprzedażowego. Dodawaj je, gdy prezentacja jest na wystąpienie.
- Nazwa prezentacji (`title`): „Weekend C2C 2026 · Skup się!” albo „C2C · Temat · data”, bez emoji.

## Przykład DeckSpec (skrót)

```json
{
  "title": "Weekend C2C 2026 · Zarządzaj uwagą",
  "slides": [
    { "type": "cover", "title": "Zarządzaj uwagą w rodzinie, organizacji i wierze", "subtitle": "Weekend Created to Create 2026", "meta": "9-11 października 2026 · Hotel Ostoja Chobienice" },
    { "type": "section", "number": "01", "title": "Możliwości przybywa, uwaga nie" },
    { "type": "statement", "eyebrow": "Punkt wyjścia", "title": "Możliwości stale przybywa, ale Wasza uwaga pozostaje ograniczona.", "lead": "Skupcie ją na tym, co naprawdę buduje Waszą rodzinę, firmę i wiarę." },
    { "type": "bullets", "eyebrow": "Trzy dni razem", "title": "Z czym wyjedziecie", "bullets": ["Mapa priorytetów Waszej rodziny na 12 miesięcy", { "text": "Rytuały uwagi", "sub": ["w małżeństwie", "z dziećmi", "w firmie"] }] },
    { "type": "chart", "eyebrow": "Dane", "title": "Gdzie ucieka uwaga założycieli", "chart": { "type": "bar", "categories": ["Operacje", "Komunikatory", "Spotkania", "Rodzina"], "series": [{ "name": "Godziny tygodniowo", "values": [22, 14, 11, 6] }], "highlightSeries": 0 }, "source": "ankieta C2C, 2026" },
    { "type": "diagram", "eyebrow": "Metoda", "title": "Cztery filary uwagi", "diagram": { "type": "pillars", "pillars": [{ "title": "Uczniostwo", "icon": "compass" }, { "title": "Silne małżeństwo", "icon": "heart" }, { "title": "Mądre rodzicielstwo", "icon": "sprout" }, { "title": "Duży biznes", "icon": "presentation" }] } },
    { "type": "quote", "quote": "Te tematy nie mają odpowiedzi w internecie. Mają je tylko we wspólnocie rodzin, które zadają je razem.", "attribution": "Oliwia i Łukasz" },
    { "type": "closing", "subtitle": "Spotkajmy się już niedługo", "contacts": ["kontakt@createdtocreate.pl", "createdtocreate.pl"] }
  ]
}
```

## Gdy Google nie działa

- Błąd `admin_policy_enforced` lub „Access blocked”: administrator Google Workspace użytkownika blokuje aplikacje zewnętrzne. Powiedz o tym wprost i zaproponuj: (a) prywatne konto Google, (b) prośbę do administratora o zaufanie aplikacji „C2C Slides”, (c) plik .pptx przez `c2c_render_pptx`, który użytkownik wgra na Dysk i otworzy w Slides.
- Brak narzędzi `c2c_*` w sesji (serwer MCP nie wystartował): zobacz skill `c2c-slides-pptx`.

## Czego nie robić

- Nie proponuj kolorów, czcionek ani „ładniejszego układu”; szablon jest zamknięty.
- Nie wstawiaj emoji, myślników em-dash, języka sprzedażowego ani formy „Ty” (szczegóły w `c2c-brand-voice`).
- Nie twórz kilku prezentacji „na próbę”; jedna, potem poprawki.
