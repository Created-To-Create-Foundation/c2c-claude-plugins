# Created to Create (C2C) – Brand specification for a Google Slides theme + tone-of-voice guide

Sources read (read-only, nothing modified):
- PRIMARY: `/Users/lukaszsiminski/www/c2c-website` – `CLAUDE.md`, `AGENTS.md`, `docs/c2c-brand-system-v2.md`, `docs/c2c-design-language-v1.md` (v1.6), `docs/c2c-master-dokument-projektu-v3.md`, `docs/c2c-persona-glowna-v2.md`, `docs/c2c-warianty-copy.md`, `app/globals.css`, `app/layout.tsx`, `package.json`, `components.json`, all `components/sections/**`, `components/ui/**`, `components/brand/EditionLockup.tsx`, `components/layout/**`, `lib/weekend*.ts`, `app/**/page.tsx`, `.claude/memory/{MEMORY,DECISIONS,CONTEXT,PATTERNS}.md`, `discovery/03_strategy/decisions/DEC-003/004/006/012`, `specs/005-weekend-skup-sie/content.md`, `tests/unit/weekend-copy-sweep.test.ts`, `public/**` (logos, images, dimensions via `sips`).
- SECONDARY: `/Users/lukaszsiminski/Documents/Created to Create/Brandbook/{GPT,Claud}` – READMEs, `asset-manifest.csv`, `manifest-ikon.csv`, `README-IKONY.txt`, all SVGs inspected, PNG dimensions measured, both PDFs text-extracted with `pypdf` (`pdftotext` not installed; pypdf worked, full text read: Claud 9 pages, GPT 14 pages).
- No `tailwind.config.*` exists (Tailwind v4, CSS-first). `content/blog/` is empty. Fonts are loaded via `next/font/google`, not from `public/`.

Authority rule (stated in both brandbooks themselves): "W razie wątpliwości decyduje kod produkcyjny strony" – `app/globals.css` + implemented components win over docs, and docs win over the brandbook folders.

---

## 1. Color system

### 1.1 Base palette (5 + 1 helper) – `app/globals.css`
| Token | Hex | RGB | Brand name | Role |
|---|---|---|---|---|
| `--color-c2c-primary` | `#222A3F` | 34/42/63 | Deep Navy | Main brand color. Dark surfaces, body text on light. |
| `--color-c2c-accent` | `#A37A5C` | 163/122/92 | Burnished Gold | Accent only: eyebrows, labels, dividers, icons, rings, numerals. |
| `--color-c2c-action` | `#447CD9` | 68/124/217 | CTA Blue | In production: ONLY focus rings (3px outline, 2px offset). Not a button color on the live site. |
| `--color-c2c-surface` | `#FFF8F2` | 255/248/242 | Warm White | Default light background; text on dark. Never pure white as dominant background. |
| `--color-c2c-cream` | `#ECD3BE` | 236/211/190 | Warm Cream | Gradient stop; secondary text on dark (`text-c2c-cream`); tint fills at 25% alpha. Never a full section background. |
| `--color-c2c-navy-deep` | `#1D2E60` | 29/46/96 | Navy Deep | Only as gradient stop with Deep Navy. Never standalone. |

Derived/implementation colors that appear in production code (allowed as "system" colors, not brand colors):
- `#8B6248` (mid-brown) and `#6B4936` (dark brown) – stops of `--gradient-credo-letter`.
- `#0D1428` (near-black navy) – photo scrims / heavy shadows (`rgba(13,20,40,x)`), image placeholders.
- `#3A4664` – 1px hairline divider inside dark cards (`WeekendCard`).
- `#1D1D1B` – print black for the technical logo variant.
- `#FFFFFF` – hover text on secondary-on-dark buttons; heading text over photo cards (`text-white`, `text-white/85`).
- Destructive (shadcn): `#B91C1C` on light, `#EF4444` on dark. No success/warning colors defined anywhere.

Text tokens:
- `--text-primary-on-light: #222A3F`, `--text-primary-on-dark: #FFF8F2`
- `--text-muted-on-light: rgba(34,42,63,0.68)` (raised from 0.6 for AA ≈ 4.9:1), `--text-muted-on-dark: rgba(255,248,242,0.7)`
- `--text-accent: #A37A5C`
- Borders: `--border: rgba(163,122,92,0.2)`, inputs `rgba(163,122,92,0.3)`; dark mode borders `rgba(255,248,242,0.15)`.

### 1.2 Gradients (brand DNA) – production values (`globals.css`)
```
--gradient-atmospheric-dark:  linear-gradient(165deg, #1D2E60 0%, #222A3F 100%)         /* hero, dark sections, dark cards, footers of premium docs */
--gradient-atmospheric-light: linear-gradient(180deg, #FFF8F2 0%, #ECD3BE 100%)         /* light premium sections, mission/CREDO blocks, documents */
--gradient-secondary-button:  linear-gradient(80deg,  #A37A5C 0%, #ECD3BE 50%, #A37A5C 100%)  /* "Burnished Premium": gold filled CTA on dark, gradient rings, gold "!" */
--gradient-primary-button:    linear-gradient(80deg,  #222A3F 0%, #1D2E60 50%, #222A3F 100%)  /* navy filled CTA on light */
--gradient-credo-letter:      linear-gradient(165deg, #A37A5C 0%, #8B6248 50%, #6B4936 100%)  /* huge CREDO display letters (text-clipped) */
--gradient-separator:         linear-gradient(165deg, #A37A5C 0%, #ECD3BE 100%)         /* short accent divider (4px x 80px, rounded) */
--gradient-display-on-dark:   linear-gradient(165deg, #FFF8F2 0%, #ECD3BE 45%, #A37A5C 100%) /* display numerals / display H2 on dark (text-clipped) */
```
The docs' "three atmospheric gradients" are the first three. Older docs (`CLAUDE.md`, brand-system v2, master doc) still list the pre-v1.1 values (180deg, `#222A3F→#1D2E60`; 2-stop `#ECD3BE→#A37A5C`) – production is authoritative.
Decorative gradients used in code: gold glow `radial-gradient(circle, #a37a5c 0%, transparent 70%)` at opacity 0.2–0.25 with heavy blur (top-right of dark sections/cards); cream glow on light `radial-gradient(ellipse at 50% 0%, rgba(236,211,190,0.45) 0%, rgba(255,248,242,0) 60%)`; photo scrim `linear-gradient(to top, rgba(13,20,40,0.92) 0%, rgba(13,20,40,0.55) 40%, rgba(13,20,40,0.15) 72%, transparent 100%)`; hero photo overlay left→right `#222a3f` 85% → 60% → 25%.

### 1.3 Hard rules (from CLAUDE.md, brand-system v2, DEC-006 – all consistent)
- Burnished Gold NEVER as body text 16px (3.6:1 on Warm White). Only accents, ≥14px bold labels, icons, lines, or gradient stop. Gold eyebrow on light is a documented, accepted AA-compromise (3.6:1).
- CTA Blue NEVER as links in body text; docs say "only buttons 14px+ bold", but the production site uses it only for focus rings (design-language v1 §7: "Not as primary button background in MVP"). For slides: reserve CTA Blue for tiny functional accents (e.g. a highlighted data series) or drop it.
- Warm Cream NEVER as a full section background – only gradient stop, small tints (`rgba(236,211,190,0.25)`), or text on dark.
- Navy Deep never standalone.
- No additional greys or neutrals ("paleta jest zdyscyplinowana"). No pure white as dominant background. No neon, glass, 3D, multicolor gradients.
- Body text is always Deep Navy (on light) or Warm White (on dark).

### 1.4 Surface usage (dark vs light)
- Site rhythm: dark hero → light sections (Atmospheric Light) → dark bands for high-emphasis moments (Benefits cards, event cards, Newsletter, Enrollment, Contact, "Dla kogo") → light footer (`#FFF8F2` flat). Roughly 60% light / 40% dark.
- On dark: headings `#FFF8F2`, lead `#ECD3BE`, body `rgba(255,248,242,0.7)`, eyebrow gold, cards `bg-black/15–20` + `ring-1 rgba(163,122,92,0.2–0.4)`, shadows `0 30px 60px -12px rgba(13,20,40,0.5), 0 12px 24px -8px rgba(13,20,40,0.3)`.
- On light: headings/body `#222A3F`, muted `rgba(34,42,63,0.68)`, eyebrow gold, cards `#FFF8F2` or `white/40–50` + `ring-1 rgba(163,122,92,0.25)`, light shadows; "institutional frame" = 1px `rgba(163,122,92,0.25)` border, transparent fill, 16px radius.

### 1.5 Measured WCAG contrast (computed)
| Pair | Ratio |
|---|---|
| `#222A3F` on `#FFF8F2` | 13.57 |
| `#FFF8F2` on `#222A3F` | 13.57 |
| `#ECD3BE` on `#222A3F` | 9.94 |
| `#A37A5C` on `#FFF8F2` | 3.63 (fails AA text, passes AA large/graphics) |
| `#A37A5C` on `#222A3F` | 3.74 (AA large only; docs claim ~5.5 – that is wrong) |
| `#447CD9` on `#FFF8F2` | 3.89 · on `#222A3F` 3.49 |
| `#8B6248` on `#FFF8F2` | 5.07 (AA) · `#6B4936` on `#FFF8F2` 7.59 (AAA) |
| `#1D2E60` vs `#222A3F` | 1.10 (indistinguishable – never pair) |
| `#ECD3BE` on `#FFF8F2` | 1.36 (invisible – cream needs a navy stroke on light) |

### 1.6 Chart palette proposal (derived, nothing outside tokens except where flagged)
Categorical, light slide (Warm White / Atmospheric Light), in series order:
1. Deep Navy `#222A3F` (13.6:1)
2. Burnished Gold `#A37A5C` (3.6:1 – OK for bars/areas ≥3:1 graphics rule; add data labels in navy)
3. Dark Brown `#6B4936` (7.6:1) – from credo gradient
4. CTA Blue `#447CD9` (3.9:1) – cool counterpoint, use as 4th series only
5. Warm Cream `#ECD3BE` with 1px Deep Navy stroke (fill alone is 1.36:1)
Avoid Mid-brown `#8B6248` next to gold (1.4:1 between them). Max 5 series; beyond that use one hue + labels.

Categorical, dark slide (Atmospheric Dark):
1. Warm White `#FFF8F2` (13.6:1)
2. Burnished Gold `#A37A5C` (3.7:1 – graphics OK)
3. Warm Cream `#ECD3BE` (9.9:1)
4. CTA Blue `#447CD9` (3.5:1 – graphics OK)
5. Warm White at 45% alpha ≈ muted series
Never use Navy Deep, `#6B4936` or `#8B6248` on dark (1.1–2.7:1).

Sequential (heatmaps, single-metric intensity) – the warm ramp already implied by the gradient tokens: `#FFF8F2 → #ECD3BE → #A37A5C → #8B6248 → #6B4936` (light bg) or reverse it ending in `#FFF8F2` on dark. Alternative cool ramp: `#ECD3BE → #A37A5C → #222A3F` is NOT recommended (muddy midpoint).
Diverging: `#6B4936 / #A37A5C` ←→ `#FFF8F2` (mid, on light use `#ECD3BE` mid) ←→ `#447CD9 / #222A3F`.
Chart chrome: gridlines `rgba(163,122,92,0.15)` on light, `rgba(255,248,242,0.15)` on dark; axis labels Inter 11–12px muted token; data labels Inter 14 SemiBold `tabular-nums`; flat fills only (gradients are reserved for surfaces/CTAs/display type); no 3D, no shadows, no rounded bar caps beyond 4px; single highlighted series = gold, rest = navy/white at reduced alpha.

---

## 2. Typography

Fonts (Google Fonts, loaded in `app/layout.tsx`): **Golos Text** weights 400/500/600/700, subsets latin + latin-ext (Polish diacritics required); **Inter** weights 400/500/600, normal + italic, latin + latin-ext. Quote font token maps to Inter (`--font-quote: var(--font-body-loaded)`), but the implemented Founders pull-quote actually uses Golos Text italic.

Documented scale (brand-system v2 / globals.css) – the base spec:
| Element | Font | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|---|
| H1 | Golos Text | 48px | 700 | -0.02em | 1.1 |
| H2 | Golos Text | 36px | 700 | -0.02em | 1.15 |
| H3 | Golos Text | 28px | 600 | -0.01em | 1.2 |
| Lead/Subtitle | Inter (in practice often Golos Text 500) | 20px (site: 18px) | 400/500 | 0 | 1.5 |
| Body Large | Inter | 18px | 400 | 0 | 1.6 |
| Body | Inter | 16px | 400 | 0 | 1.6 (site: 1.625 `leading-relaxed`) |
| Body Small | Inter | 14–15px | 400 | 0 | 1.5 |
| Caption | Inter | 12px | 400 | 0.01em | 1.5 |
| Eyebrow / Label | Inter | 11px | 600 | 0.15em, UPPERCASE | 1 |
| Section label / numerals "01" | Inter | 12px | 600 | 0.15–0.25em, UPPERCASE | 1 |
| Button | Inter | 14px | 600 | site: 0 / sentence case (doc said 0.05em uppercase; production dropped it) | 1.2 |
| Quote | Inter Italic (doc) / Golos Text italic (site) | 24px (doc) / 17–20px (site) | 400 | 0 | 1.4–1.6 |

Production sizes actually used (fluid clamps, desktop end):
- Hero H1 36→48px; page H1 up to 56px; section H2 32→44px (bigger than doc's 36); H3 in cards 20–24px Golos 700; display numerals/event titles 40→72px; edition hero lockup up to 88px; huge decorative CREDO letters 64→112px (text-clipped gradient); watermark numerals 176px at `text-white/6` or gold at 5% opacity.
- Heading colour: `#222A3F` on light, `#FFF8F2` on dark; display headings on dark may use `--gradient-display-on-dark` text clip.
- Heading accent device: one italic word in the heading with a 2px gold underline at 70–85% opacity, offset 8px (e.g. "Społeczność, która *tworzy razem*.").
- Emphasis inside quotes: `font-semibold not-italic` (bold upright inside italic paragraph).
- Numbers/times/prices: `tabular-nums`.
- Max paragraph width ≈ 62–65 characters (`max-w-[62ch]`, 640px).

Uppercase rules: ONLY eyebrows, section labels, footer column headers, cadence labels ("CO MIESIĄC"), attribution line under quote ("- OLIWIA I ŁUKASZ" via CSS uppercase), and the wordmark. Headings, buttons and body are sentence case. "CREDO" is always capitals as a word.

Google Slides caveats (see §7): Slides has no letter-spacing control and no gradient text fill.

---

## 3. Layout & visual language

Style direction: **"Editorial Institutional"** = Editorial Magazine + Swiss Modernism 2.0. References: Condé Nast Traveler, Monocle, FT Weekend, Aesop, Loża Przedsiębiorców; YPO × Loża × Faith Driven Entrepreneur. Character words (brandbook): Spokojny, Dorosły, Ciepły, Stanowczy, Klasyczny z głębią. Tone manifesto: "luksus to typografia, oddech i ciężar słowa" – no glass, no ornament glyphs (✻ ✦ ❋), no drop caps, no spring physics, no neon.

Spacing (8px grid): tokens `--space-1..10` = 4/8/12/16/24/32/48/64/96/128px. Section padding-y 64/80/96px (mobile/tablet/desktop), container max 1280px (some sections 1100–1180px), container padding-x 24/32/48px, block gap 24/32/48px, eyebrow→H→lead gap 16–24px. 12-column grid. Asymmetric two-column grids common: `1.1fr 1fr`, `1.4fr 1fr`, `1.5fr 1fr`, `1fr 1.25fr`.

Radius: `--radius-sm` 4, `--radius-md` 8, `--radius-button` 12, `--radius-lg` 16, `--radius-xl` 24, full 9999. In production: buttons/inputs 12px; cards 16–24px (`rounded-2xl`/`rounded-3xl` = 16/24); photos 16–24px; avatars circles; pills (nav CTA, badges, cadence chips) full.

Shadows (subtle, editorial): sm `0 1px 2px rgba(34,42,63,.06)`, md `0 4px 12px rgba(34,42,63,.08)`, lg `0 12px 32px rgba(34,42,63,.12)`, xl `0 24px 64px rgba(34,42,63,.16)`. Dark cards: `0 30px 60px -12px rgba(13,20,40,.5), 0 12px 24px -8px rgba(13,20,40,.3)`. Rule: buttons compress on hover, cards lift. Light buttons have NO shadow.

Dividers:
- Short accent: 4px × 80px, `rounded-full`, fill `--gradient-separator` (hero) or solid gold 2px × 32px growing to 80px on hover (CREDO). Older spec: 1px × 64px gold @40%.
- Full-width subtle: 1px `rgba(163,122,92,0.15–0.25)`; inside dark cards `#3A4664`.
- Vertical timeline spine: 1px `rgba(163,122,92,0.25–0.5)` with spark markers.
- Left "edition" bar: 4px solid gold (`border-l-4`) beside event lockups and announcement text.
- Column separators between CREDO blocks: 1px `rgba(163,122,92,0.18)`.

Components to translate into slide masters:
- Eyebrow (gold caps) → H2 → lead (Golos 500, 18px) → body (muted) is the universal section header stack; often centered with `max-w 720px`, otherwise left.
- Editorial numbering "01 / 02 …" gold 12px caps tracking 0.25em above card titles; numbered circles 32–40px (gold fill or gold gradient, navy digit, `ring-4` navy on dark) for process steps.
- Cards on dark (Benefits): Atmospheric Dark fill, 24px radius, gold ring @30%, padding 32–40px, number + Golos 24px title (Warm White) + muted body.
- Cards on light (Speakers, Venue): `white/50` or `rgba(163,122,92,0.08)` fill, gold ring/border @25–30%, 16–24px radius.
- Chips/tags: 1px gold border @40%, 6px radius, 12px medium navy text (pillars); badges pill `rgba(163,122,92,0.16)` fill with 14px lucide icon.
- Bullet lists: lucide icon 18–20px gold stroke 1.75–2.25 (Check for checklists; content icons for meta) + 16px text; no default dots.
- Pull quote: lucide `Quote` 36px gold @70% above, italic Golos 17–20px navy, attribution gold caps 12px "- Oliwia i Łukasz".
- Event/edition lockup: eyebrow (event name · date) → title with gold-gradient "!" → subtitle sentence case in cream, all behind a 4px gold left bar. "Skup się! / Zarządzaj uwagą w rodzinie, organizacji i wierze." is the current edition.
- Meta block (date/place): bordered `rgba(163,122,92,0.4)` box on `bg-black/20`, 26px gold icon, 10px caps gold label ("TERMIN", "MIEJSCE"), 18px Golos bold value.
- Price/agenda lists: rows `divide-y rgba(163,122,92,0.15–0.25)`, label left, value right in cream `tabular-nums` semibold.
- Buttons: Primary-on-dark = gold 3-stop gradient fill, navy text; Secondary-on-dark = 2px gradient gold ring, cream text; Primary-on-light = navy gradient fill, warm-white text; Secondary-on-light = navy ring, navy text. 14px Inter 600, padding 16/32, radius 12, trailing "→" arrow; one filled primary per section.

Imagery / photography: warm golden-hour light, observational, real interaction; families with parents ~35–45 and school-age children, premium but not ostentatious settings (manor house, garden dinner, hotel Ostoja Chobienice); wardrobe naturally in navy/camel/cream (on-palette). Treatment: plain (no duotone), optional 3–5% grain, navy scrim when text sits on top (`#222a3f` 55–85%), corner radius 16–24px, thin gold ring @25–40%, aspect 4:5 (portraits), 3:2 (events), 9:16 (event card figures), 3:4 (founders). Forbidden: sterile stock, "smiling people in an office", over-posing, artificial luxury, logo over undarkened photo. Current hero/family images are AI-generated; founders, speakers and hotel are real photos (hotel photos belong to the hotel; speaker portraits require consent for reuse outside the event).

Patterns: design-language v1 says "no decorative background patterns", but production added two very subtle ones: (a) spark micro-pattern – gold spark tile 28px, layer opacity 0.4, masked with a radial ellipse behind section headers (Benefits, HowWeOperate); (b) placeholder dot grid – 32px, r 1.25, gold @0.18 (`manifest-community-placeholder.svg`). Brandbook GPT ships `pattern-editorial-dots.svg` (96px tile, r 2.5, gold @0.22 on Warm White). Rule of thumb for slides: patterns only as a barely-visible texture (effective alpha ≤ 0.1), masked/fading, never across a whole text slide.

The "spark" symbol (sygnet): a four-armed curved star ("czteroramienna iskra / rombus"), 1:1, viewBox 119.2. Two constructions exist: 4 separate filled arms (logo, favicon) and a single-path filled/outlined marker (`icon-spark-marker`, `logo-spark-outline`). Colours: navy on light, warm white on dark, gold as accent marker. Uses on site: timeline markers (24–28px), background micro-pattern, favicon (navy square + warm-white spark). Never rotate, never recolour outside palette.

Logo variants (website `public/logo/`, brandbook mirrors):
- Horizontal wordmark "CREATED TO CREATE" with spark at left, viewBox 1349×120 (aspect ≈11.2:1), wide tracking (~0.2em), in `#222A3F` (primary, light bg), `#FFF8F2` (dark bg), `#FFF` (technical), `#1D1D1B` (print black); brandbook GPT adds a gold `#A37A5C` version (not used on site – accent use only).
- Two-line lockup (spark left, "CREATED / TO CREATE" stacked), viewBox 554.3×120 (≈4.6:1), warm white only – used in the site header at 28px height.
- Square mark: navy square, warm-white spark (favicon/avatar); GPT adds rounded (rx 18) avatar version.
- Rules: min height 24px (mark), 32px (mark + wordmark) [brandbook GPT says 180px screen / 42mm print for full logo, 24px/7mm symbol – conflict, see §8]; clear space ≥ cap height of "CREATED" [GPT: ≥ arm height of the spark – conflict]; preferred backgrounds Warm White or Atmospheric Dark; never on a photo without darkening; never rotate/stretch/recolour/outline.
- Which logo where: light slide → `logo-c2c-222a3f.svg`; dark/gradient slide → `logo-c2c-fff8f2.svg` (or two-line warm-white for compact corners); pure white only for third-party/partner contexts; black only for mono print.

Motion (for reference/animations in Slides keep minimal): easing `cubic-bezier(0.22,1,0.36,1)`, reveal 400ms opacity + 16px translate; no page-load animation.

---

## 4. Iconography

- Website icon set: **lucide-react** (`lucide-react ^1.14.0`, `components.json` iconLibrary "lucide"). Icons in use: ArrowLeft, ArrowUpRight, Baby, CalendarDays, Check/CheckIcon, ChevronDown, Clock, Compass, ExternalLink, Handshake, Heart, HeartHandshake, Lightbulb, Mail, MapPin, Menu, Play, Podcast, Presentation, Quote, ShieldCheck, Sparkles, Sprout, Users, Video, X/XIcon, plus sonner toast icons (CircleCheck, Info, TriangleAlert, OctagonX, Loader2). Social icons (LinkedIn, Instagram, Facebook) are hand-inlined filled SVG paths, `currentColor`, 18px.
- Stroke weights by size: 14–18px → 2 / 2.25 (checks); 20–26px → 1.75 (content/meta bullets); 28–40px → 1.5 (feature icons: Compass/Users/Sprout at 36, Mail/Video at 40, Quote at 36); decorative 40px Podcast at 1.25 and 25% opacity. Round caps/joins (lucide default).
- Colour: almost always `var(--color-c2c-accent)` gold, regardless of background; navy for nav (Menu/X in warm white on dark header), currentColor in footer (navy/70).
- Icon containers: 44px square `rounded-xl` with `rgba(163,122,92,0.15)` fill for feature lists on dark.
- Brandbook icon sets: Claud `04-icons/` = 33 SVG + 33 PNG 512px (29 lucide in `#222A3F` stroke 2, + spark-marker gold, 3 social navy); GPT `03_Ikony/` = 34 icons × 3 colours (gold/navy/warm-white), SVG (lucide 24-grid, stroke 1.75, width attr 256) + PNG 512, includes `brand-spark` (4-arm filled) and `spark-marker` (single path). Both are faithful lucide exports and fully usable for Slides as PNG/SVG. Prefer the GPT set (3 colours, stroke 1.75 matches site usage at 20–26px); use Claud's stroke-2 set for very small sizes. Slides target sizes: 24/32/40pt, gold on both surfaces; warm white on dark when the icon is the main content.

---

## 5. Tone of voice

Audience (P1 "Marek i Anna Kowalscy"): 35–47, married 7–15 years, 2–4 school-age children, founder/CEO with ≥1.5–2 mln zł net annual profit (typically 2–3 mln, wealth 5–15 mln), often already in Loża/EO/YPO; conscious Christians (Catholic or Protestant) "z konsekwencjami w codzienności", not hermetic. Marek decides rationally, Anna emotionally and for the children – copy must speak to the whole family at once. They "smell theatre": premium quality + full transparency (costs, process, faces) are the two trust pillars. Anti-audience: solo freelancers, low-profit SMEs, corporate managers, singles, under-33 couples, 50+ with adult children, culturally-only religious.

Voice principles (DEC-003 "Premium look + Honest content"):
- Aspirational aesthetic, honest text: never fake scale, openly say we are starting ("Weekend C2C to kameralne spotkanie dla kilkunastu rodzin").
- "Pewny, ciepły, konkretny" – short but not harsh sentences; ambition visible but rooted in responsibility for family, faith and people. "Stanowczy + dorosły + ciepły. Bez sentymentalizmu, bez ekskluzywnego snobizmu."
- Editorial register ("bliżej *List Otwarty* niż *landing page*"); no sales, no scarcity, no FOMO ("Factual copy, no scarcity language" is a code comment on the announcement bar).
- Concrete facts over adjectives: dates, place, agenda, prices, where the money goes ("15% ceny zasila fundusz na dalsze działanie fundacji non-profit").
- Whole family as subject; both spouses equal; children are participants, not "parked with animators".

Grammar & address:
- Second person plural "Wy / Wasza rodzina / Wasza firma" everywhere in body copy; verbs in 2nd pl. ("Poznacie / Otrzymacie / Spędzicie / Wrócicie"); never "Ty" (a hard rule enforced by DEC-012 and copy review; site-wide).
- Questions in FAQ in plural or impersonal ("Czy możemy przyjechać z dziećmi?", "Czy można przyjechać bez współmałżonka?").
- "My" = the founders/community ("Piszemy tylko gdy mamy do przekazania coś wartościowego").
- CTA buttons: short imperatives, mostly singular ("Dołącz do C2C", "Zapisz się do newslettera", "Zapisz rodzinę na Weekend C2C", "Poznaj szczegóły", "Umów rozmowę", "Dowiedz się więcej o społeczności") with plural where the reader is the family ("Zobaczcie pełną agendę", "Dołączcie do Weekendu C2C", "Zgłoście swoją rodzinę", "Poznajcie prelegentów", "Poznajcie Ostoję Chobienice"); "Jestem zainteresowany" is the canonical event-interest CTA. Buttons end with "→" arrow when they lead somewhere.
- Typography of text: NO em-dash (U+2014) in user-facing text; use spaced hyphen " - " (master doc rule, applied throughout). Polish quotes „…”. Middle dot "·" as meta separator ("9-11 października 2026 · Hotel Ostoja Chobienice"). Date ranges with plain hyphen "9-11". Times "12:00-13:00". Prices "4 450 zł" (space-grouped, `formatPln`). Weekday-first day labels "Piątek - 9 października".

Capitalisation & naming:
- "CREDO" always in capitals; never "kredo". CREDO letters: C Creating Value & Growth · R Relations · E Entrepreneurship · D Discipleship · O Ownership. Implemented Polish lines (production `Credo.tsx`, newer than CLAUDE.md): "Tworzymy wartość dla innych i ciągle się rozwijamy" / "Stawiamy relacje oparte na miłości w centrum wszystkiego co robimy" / "Wykorzystujemy talent przedsiębiorczości jako narzędzie zmiany" / "Naśladujemy Jezusa, czyniąc uczniami innych przedsiębiorców" / "Bierzemy odpowiedzialność za swoje życie i tych, których prowadzimy". (CLAUDE.md older variant: "…zgodnego z wolą Boga", "…narzędzie zmiany świata", "…czyniąc też uczniów innych", "…za to, co nam powierzone".) Section header: "NASZE WARTOŚCI / Pięć wartości, które nas jednoczą".
- Founders: always "Oliwia i Łukasz Simińscy" – Oliwia first, never "Łukasz i Oliwia". Descriptor: "Małżeństwo. Rodzice. Przedsiębiorcy. Założyciele Created to Create." "Założyciele" capitalised as a role.
- Organisation: public brand = "Created to Create" (full) or "C2C" (abbr.); descriptor "Chrześcijańska Społeczność Przedsiębiorczych Rodzin"; "Społeczność"/"wspólnota". Legal name "Fundacja Created to Create" ONLY in legal contexts (privacy policy, consents, footer registry line "Fundacja Created to Create · KRS 0001264904 · NIP 7822974134 · REGON 545650470", email footers). Registered address only in policy/regulations/email footers – never in site footer. The word "stowarzyszenie" is obsolete (it is a foundation).
- "C2C" allowed in: nav, event names ("Weekendy C2C", "Weekend C2C 2026", "Wakacje C2C", "Wakacyjny wyjazd rodzinny C2C"), breadcrumbs, short titles, button labels; NOT in section headings or first body paragraphs.
- Event names: "Weekend Created to Create 2026" (formal) / "Weekend C2C" (short); edition title "Skup się!" + subtitle "Zarządzaj uwagą w rodzinie, organizacji i wierze."; umbrella "Trzy dni razem. Wiara, rodzina, biznes i społeczność."; "Wakacyjne wyjazdy rodzinne" (Filar IV). Four pillars: "Uczniostwo · Silne małżeństwo · Mądre rodzicielstwo · Duży biznes".
- Mission (verbatim, no quotation marks when used as heading): "Tworzymy rodziny wykorzystujące talent przedsiębiorczości, by budować silne relacje, firmy i społeczność uczniów Jezusa." Tagline/H1: "Tworzymy rodziny, które budują świat" (no trailing period in production).

Słownik C2C – verbatim from CLAUDE.md:
UŻYWAMY: "CREDO" (zawsze WIELKIMI literami); "rodziny przedsiębiorcze" (NIE "rodziny przedsiębiorców"); "Weekendy C2C" (Filar I); "Wakacyjne wyjazdy rodzinne" (Filar IV); "Blog" (NIE "Treści"); "Wy", "Wasza rodzina" (druga osoba liczby mnogiej, NIE "Ty"); "Założyciele" (Oliwia pierwsza); "newsletter" (NIE "list"); "Jestem zainteresowany" (CTA wydarzeń); "Twórz razem z nami" (newsletter nagłówek).
UNIKAMY: "manifest" (zarezerwowane dla innych kontekstów); "filozofia" (akademickie); "kredo" (małymi literami — myli się z modlitwą); "Treści" (jako nazwa publiczna); "konferencje" (zbyt korpo); "klient", "uczestnik" (oddziela); "limitowana oferta", "tylko 999 zł", "promocja" (sprzedażowy ton); Emoji w treści głównej; "premium hotel" (jako frazę marketingową); "ród" (staroświeckie); "pierwszy" w opisach wydarzeń (niepotrzebnie podkreśla nowość); "międzypokoleniowy" (kojarzy się z dziadkami); "intensywny" (sztuczne).
Master doc additions: also use "nasze wartości", "społeczność", "wspólnota", "non-profit"; avoid "list" as newsletter synonym, "Powiadom mnie"/"Zostaw email" as event CTA; preferred phrases: "rodziny w środku drogi", "pokolenie, które buduje świadomie", "już osiągnęliście wiele", "premium z transparentnością", "stworzeni, by tworzyć", "spotkajmy się już niedługo", "twórz razem z nami". DEC-012: "sukcesja pokoleniowa" replaces "sukcesja międzypokoleniowa"; prefer "osoby / rodziny / Wy" over "uczestnik". Production regression test bans "bez zobowiązań", "nie pobieramy żadnych płatności", "lista zainteresowanych". Persona doc bans "młodzi przedsiębiorcy", "doświadczeni liderzy". Brandbook GPT "unikamy" examples: "Ekskluzywny klub sukcesu", "Odblokuj swój potencjał", "Najlepsi z najlepszych", "Luksus bez kompromisów". Note: "manifest" is banned as a public word even though the code section is called Manifest; the public eyebrow is "Nasza misja".

Faith references: Christ-centred and explicit but dosed. Jesus is named in the mission and CREDO ("społeczność uczniów Jezusa", "Naśladujemy Jezusa", "Wspólnie szukamy, jak naśladować Jezusa", "żywa relacja z Jezusem", "wiara bez maski"). Faith always appears integrated with business/marriage/children ("bez oddzielania jej od biznesu, małżeństwa, wychowania dzieci i codziennych decyzji"), never as a separate pious layer. Biblical quotes are rare and must "earn their place" (Inter Italic quote style reserved for them); no quote in every section, no sentimentality, no "religious pressure" signals; ecumenical (Catholic/Protestant), agenda uses neutral-Catholic vocabulary ("Msza święta", "Wieczór uwielbienia", "Modlitwa", "świadectwo", "wielbienie"). Faith words: "uczniostwo", "formacja duchowa", "wzrost duchowy", "wiara w biznesie", "zgodnie z wolą Boga".

Sample sentences that exemplify the voice (verbatim from production):
- "Tworzymy rodziny, które budują świat" / "Społeczność, gdzie przedsiębiorcze rodziny rosną razem - w wierze, relacjach i biznesie."
- "Tutaj nie musicie tłumaczyć, kim jesteście. Inne przedsiębiorcze rodziny znają cenę tego, co budujecie - w firmie, w domu, w wierze."
- "Cała rodzina rośnie razem, nie obok siebie."
- "Wasza firma rośnie. Wasza rodzina się zmienia. Każdego dnia tworzycie coś, co ma znaczenie - w pracy, w domu, w decyzjach zgodnych z tym, w co wierzycie."
- "Piszemy tylko gdy mamy do przekazania coś wartościowego. Maksymalnie raz w miesiącu."
- "Możliwości stale przybywa, ale Wasza uwaga pozostaje ograniczona. Skupcie ją na tym, co naprawdę buduje Waszą rodzinę, firmę i wiarę."
- "Przesłanie formularza oznacza deklarację udziału i nie jest zakupem."
- "Te tematy nie mają odpowiedzi w internecie. Mają je tylko we wspólnocie rodzin, które zadają je razem. - Oliwia i Łukasz"
- "Pierwszym krokiem jest rozmowa. Napiszcie lub umówmy się na 30 minut online - poznamy Waszą historię i opowiemy o C2C."
- "Małe, moderowane grupy mastermind do 8 osób - prywatna rada nadzorcza Waszej rodziny."
- "Bezpieczeństwo dzieci traktujemy priorytetowo - opiekunowie są weryfikowani…"
- Headline pattern: short, 2–6 words, often a full-stop: "Spotkajmy się już niedługo", "Z czym wyjedziecie?", "Dla kogo jest Weekend C2C?", "Tylko dla *społeczności* C2C.", "Co możemy *wspólnie stworzyć?*"

Forbidden (summary): "Ty"; sales/scarcity/FOMO; emoji; em-dashes; corporate jargon ("konferencja", "klient", "uczestnik", "intensywny"); faking numbers or scale; "manifest/filozofia"; lowercase "kredo"; Łukasz before Oliwia; "Fundacja …" in marketing copy; address in public footers; sentimentality and "ekskluzywny snobizm"; Biblical quotes everywhere.

---

## 6. Existing reusable assets (absolute paths, dimensions)

Website (`/Users/lukaszsiminski/www/c2c-website/public/`):
- `logo/logo-c2c-222a3f.svg` – horizontal, navy, viewBox 1349×120 (primary on light)
- `logo/logo-c2c-fff8f2.svg` – horizontal, warm white (on dark)
- `logo/logo-c2c-fff.svg` – horizontal, pure white (technical)
- `logo/logo-c2c-1d1d1b.svg` – horizontal, print black
- `logo/logo-c2c-two-lines-fff8f2.svg` – two-line lockup, warm white, viewBox 554.3×120 (header; file carries stray off-canvas navy rect + unused clip paths – prefer the brandbook PNG/SVG copy for clean embedding)
- `logo/logo-favicon.svg` – square mark 119.2×119.2, navy bg + warm-white spark
- `images/logo-spark.svg` – outline spark 119.24, navy stroke (hairline, stroke-width unset = 1 unit; thicken before use)
- `images/noise.svg` – feTurbulence grain filter (200×200)
- `images/manifest-community-placeholder.svg` – Atmospheric Light + dot grid placeholder 1440×1080
- Photos: `images/c2c-hero-background.jpg` 2880×1607 (AI garden dinner, pre-tinted navy); `images/c2c-founders.jpg` 1086×1448 (real portrait Oliwia + Łukasz); `images/manifest-community.png` 1448×1086; `images/weekend/rodzina.jpg` 1448×1086 (AI family, golden hour, on-palette); `images/weekend/{wiara,wiedza,dzialanie}.jpg` 1448×1086; `images/weekend/relacje.jpg` 1672×941; `images/weekend/dzieci-1.jpg` 1600×1200; `images/weekend/dzieci-2.jpg` 1200×1600; `images/weekend/dla-kogo.avif` 1600×1201; `images/how-1..4.jpg` 768×1376 (portrait); `images/c2c-tenerife.jpg` 1116×2000; `images/newsletter-background.jpg` 2400×1018; `images/weekend/hotel/ostoja-{basen,folwark,stajnia,rzadcowka}.avif` (hotel's own photos – licence check); `images/weekend/speakers/*.avif` (personal portraits – consent); `videos/weekend-c2c-invitation.mp4` + `weekend-c2c-poster.webp` 640×1138. `*-original.png` files are gitignored masters.

Brandbook Claud (`/Users/lukaszsiminski/Documents/Created to Create/Brandbook/Claud/`) – generated 2026-08-10 from production tokens, 4.8 MB:
- `01-logo/svg/logo-horizontal-{deep-navy,warm-white,white,black}.svg`, `logo-two-lines-warm-white.svg`, `logo-mark-square-navy.svg`, `logo-spark-outline-navy.svg`; PNG transparent: horizontals 1200×107 and 2400×213, two-lines 1200/2400×520, mark & spark-outline 512 and 1024 px
- `02-colors/{svg,png}/color-*.{svg,png}` – 6 swatches 800×800
- `03-gradients/{svg,png}/gradient-{atmospheric-dark,atmospheric-light,secondary-button,primary-button,credo-letter,separator,display-on-dark}` – 1600×900, production angles/stops (ideal 16:9 slide backgrounds)
- `04-icons/{svg,png}/icon-*.{svg,png}` – 33 icons, navy stroke 2, PNG 512 transparent; `icon-spark-marker-gold`, `icon-social-{linkedin,instagram,facebook}`
- `brandbook-created-to-create.pdf` (9 pp A4), `README.md`

Brandbook GPT (`/Users/lukaszsiminski/Documents/Created to Create/Brandbook/GPT/`) – 2026-08-10, 11 MB:
- `01_SVG/logo-horizontal-{navy,warm-white,white,gold}.svg` (1349×120), `logo-compact-{navy,warm-white}.svg` (554.3×120 two-line), `symbol-spark-{gold,navy,warm-white}.svg` (119.2), `symbol-avatar-on-navy.svg` (rounded rx18), `background-atmospheric-{dark,light}.svg` (1920×1080; dark one is 45° not 165°), `palette-primary.svg` (1600×360 strip), `pattern-editorial-dots.svg` (1200×800, 96px tile), `social-cover-template.svg` (1600×900, uses Arial placeholder text), `social-quote-template.svg` (1080×1080, Arial placeholder)
- `02_PNG/`: logos horizontal 2400×213, compact 1400×303, symbols 1024², avatar 1024², backgrounds 1920×1080, pattern 1800×1200, palette 2400×540, social cover 1600×900, quote 1080²; `Fotografia/fotografia-hero-1920x1080.png` (darkened hero), `fotografia-community-1600x1200.png`, `fotografia-founders-1080x1350.png`
- `03_Ikony/01_SVG/{gold,navy,warm-white}/icon-*.svg` (34 each, stroke 1.75) + `02_PNG/.../*-512px.png`; `manifest-ikon.csv`, `README-IKONY.txt`
- `Brandbook_Created_to_Create_2026.pdf` (14 pp), `README.txt`, `asset-manifest.csv`

Best picks for slides: Claud gradients PNG 1600×900 (backgrounds), GPT `symbol-spark-*` 1024 PNG (marks), Claud horizontal logo PNG 2400 navy/warm-white, GPT icons gold+warm-white 512 PNG, GPT `pattern-editorial-dots` (at ≤40% layer opacity), website `rodzina.jpg`/`dzieci-*`/`relacje.jpg` for imagery.

---

## 7. Gaps and proposals (what a slide system needs that neither source defines)

1. Slide canvas & grid – not defined. Proposal: 16:9, 960×540 pt; margins 48pt (= desktop container padding), 12-col grid with 16pt gutters, 8pt baseline; safe footer band 32pt.
2. Slide type scale – web px don't map 1:1. Proposal (pt): Cover title 44–48 Golos 700 (-2% tracking if possible), Section title 36, Slide H2 28–32, H3 20–24 Golos 600, lead 18–20 Golos 500, body 14–16 Inter 400 (line 1.5), bullets 14–16, caption 10–11 Inter, eyebrow 11 Inter 600 caps, quote 22–24 italic, big number 64–96 Golos 700 gold/gradient.
3. Google Slides limitations: no letter-spacing → eyebrow tracking (0.15em) cannot be set natively; accept untracked caps, or reserve tracked eyebrows/wordmark for imported PNG/SVG. No gradient text → display numerals/gold "!" must be solid gold `#A37A5C` (or cream on dark) or pre-rendered images. Gradient shape fills ARE supported (set angle 165°/180°/80° manually or use the 1600×900 gradient PNGs as slide backgrounds). Fonts: Golos Text and Inter are both in the Google Fonts catalog (add via "More fonts"); confirm latin-ext rendering of ą/ę/ł/ś/ź/ż in Golos Text; fallback if missing: Inter Bold for headings.
4. Slide layouts (none defined). Proposal derived from site sections: Cover (Atmospheric Dark + gold separator 4×80 + two-line logo + H1 + cream lead, mirrors GPT `social-cover-template`); Section divider (dark, giant watermark numeral at 6% white, eyebrow "01", H2); Statement/Mission (Atmospheric Light, eyebrow + one Golos H2 ≤ 3 lines, optional pillar chips); Two-column text+photo (1.1fr/1fr, photo 4:5 radius 16 gold ring); 3-up / 4-up cards (dark cards with 01–04 numerals on light bg, or institutional-frame cards); Timeline/agenda (gold spine + spark markers, cadence labels caps gold); Quote (Quote icon, Golos italic, gold caps attribution); Speaker/people (4:5 photo card, name Golos 20, role gold 14, bio muted); Numbers/KPI (big gold numeral + caption); Pricing/table; Chart; Photo full-bleed with navy scrim and bottom text; Contact/Closing (dark, "Co możemy wspólnie stworzyć?", emails, logo warm white). Alternate dark/light roughly 40/60 as on the site.
5. Table styling (none on site). Proposal: header row eyebrow style (Inter 11–12 600 caps, gold) with 1px gold @25% rule below; body Inter 14–16 navy/warm-white; row separators 1px `rgba(163,122,92,0.15)`; no vertical rules, no heavy fills; optional highlight row fill `rgba(236,211,190,0.25)` on light / `rgba(0,0,0,0.2)` on dark; numeric columns right-aligned `tabular-nums`; totals row Golos 600. Mirrors the production price list and agenda list.
6. Chart styling – see §1.6 (categorical/sequential/diverging, chrome). Also: legends as eyebrow-style caps, gold; single-metric charts use gold vs navy/white muted; donut/pie ≤ 4 slices with navy/gold/cream/blue; line charts 2pt stroke, markers 6pt; always label values directly when ≤ 8 points.
7. Status/semantic colours (only destructive exists). Proposal: success = Deep Navy check icon with gold ring (avoid green); warning/info = gold text on cream tint; error = `#B91C1C` on light / `#EF4444` on dark. Do not introduce green/red palettes for charts (use annotations instead).
8. Page furniture – not defined. Proposal: footer left = small horizontal logo (24pt tall, navy on light / warm-white on dark), footer right = page number Inter 10 muted; optional slide eyebrow top-left. Legal line (KRS/NIP/REGON) only on closing/legal slides.
9. Bilingual use – CREDO letters are English words with Polish descriptions; keep English acronym labels in Golos 600 small caps-like size 14 (tracking 0.05em) as on site.
10. Speaker notes / presenter voice – not covered; apply the same Wy-address, no sales language, concrete facts.

---

## 8. Conflicts: brandbook folders vs website (website wins)

- Logo minimum size: GPT PDF "Ekran 180 px, Druk 42 mm, Symbol 24 px / 7 mm" vs website/Claud "24px (sygnet), 32px (sygnet + wordmark)". Use website; treat 180px as a sensible practical minimum for the full horizontal logo on slides anyway (wordmark legibility).
- Clear space: GPT "równe wysokości ramienia symbolu" vs website "≥ wysokość liter CREATED". Use website.
- Logo colour variants: GPT shows "Granat na Warm Cream" and "Warm White na Burnished Gold" and ships `logo-horizontal-gold`. Website forbids Cream as a full background and never uses a gold logo or gold background → do not use these variants.
- Atmospheric Dark direction: GPT SVG/PNG background uses a 45° bottom-left→top-right gradient while claiming 165°; Claud's `gradient-atmospheric-dark.svg` is correct (165°). Use Claud's.
- CTA Blue role: CLAUDE.md/brand-system v2/master doc say "buttons"; GPT brandbook and design-language v1 say "focus rings / functional accents only"; production uses it only for focus rings. Follow production (gradient gold/navy buttons; CTA Blue functional only).
- Button label style: docs say 14px 600 UPPERCASE 0.05em; production buttons are sentence case, no tracking, radius 12px, arrow "→". Follow production.
- Quote style: docs "Inter Italic 24px"; production founders quote is Golos Text italic ~17–20px with lucide Quote icon. For Biblical quotes keep Inter Italic 24 per docs; for founder/pull quotes use the production pattern.
- Gold-on-navy contrast: docs state ~5.5:1; measured 3.74:1 (large text/graphics only).
- Icon stroke: Claud icons stroke 2 (exported navy), GPT stroke 1.75; site uses 1.5/1.75/2/2.25 by size. Both usable.
- Social templates (GPT) use Arial placeholder text – layout is on-brand, typography is not; retype in Golos/Inter.
- Decorative patterns: design-language v1 forbids background patterns; production later added the masked spark micro-pattern; GPT ships an editorial dots pattern. Treat patterns as optional, extremely subtle texture only.
- Legal entity: master doc and PATTERNS.md still say "Stowarzyszenie" / "STOWARZYSZENIE ZAŁOŻONE A.D. 2026" eyebrow; current truth is "Fundacja Created to Create" (KRS 0001264904, registered 07.09.2026) and the eyebrow is no longer on the site. Never use "stowarzyszenie".
- CREDO Polish descriptions differ between CLAUDE.md and the implemented `Credo.tsx` (see §5) – use the implemented text.
- Brandbook GPT "Rozmiary/Interlinia" H1 48/53, H2 36/41, H3 28/34, body 16/26, lead 20/30, caption 12/18 – consistent with website line-heights (1.1/1.15/1.2/1.6/1.5/1.5); no conflict.
