# Store submission assets

Requirements confirmed against each platform's current docs (fetched this session — re-check before submitting, these can change).

## CrazyGames (`crazygames/`)

All required. Consistent visuals across all three covers — no borders, no extra text beyond the title, no icons, no blurry/pixelated art.

| File | Size | Notes |
|---|---|---|
| `cover-landscape-1920x1080.png` | 1920×1080 (16:9) | required |
| `cover-portrait-800x1200.png` | 800×1200 (2:3) | required |
| `cover-square-800x800.png` | 800×800 (1:1) | required |
| `icon-512x512.png` | 512×512 | required |
| `screenshot-01.png` … `03.png` | any, real gameplay | ≥3 required, actual gameplay only |
| `preview-landscape.mp4` | 1080p, 16:9 | required, 15–20s (cut to 20s), ≤50MB, no audio |
| `preview-portrait.mp4` | 1080p, 2:3 | required, same limits |

Technical: <50MB initial download, <1500 files (already comfortably true for this bundle), PEGI-12 content (fine — no violence/gambling/sexual content in this game).

Placeholder PNGs for the three covers + icon are provided (see below) — screenshots and preview video need real gameplay capture, not generated here.

## Poki (`poki/`)

Poki uses an invite/curated intake model — apply via their developer page first; exact specs beyond what's below are likely only visible inside their dashboard once accepted.

| File | Size | Notes |
|---|---|---|
| `thumbnail-static-628x628.png` | ≥628×628, full-bleed square | required |
| `thumbnail-animated.TODO` | — | **unconfirmed** — required before "global release" per Poki's docs, but exact format/duration/fps isn't published anywhere I could fetch. Check the Poki developer dashboard directly once you have access, rather than guessing here. |

## How the placeholders were made

Two small HTML templates (`templates/cover-template.html`, `templates/icon-template.html`) reuse the game's real palette — the `--ink`/`--panel` background gradient, `--coral`/`--gold` accents, Fredoka "Babble" wordmark, and a simplified globe/pin motif. Each was rendered with Playwright's Chromium at the exact target viewport size and screenshotted straight to PNG at that resolution (`cover-landscape-1920x1080.png` is genuinely 1920×1080, etc. — confirmed via `file` on every output). They're on-brand starting points, not final art — a designer should treat them as a rough layout/color reference, not ship them as-is. To regenerate or tweak (e.g. after changing the template), re-run a Playwright script that loads each template at its target `viewport` and calls `page.screenshot()` — no other tooling needed.
