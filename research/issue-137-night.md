# #137 night run, 2026-11-08

Bounded overnight pass after PR #174 (thin + soft layers), measured on `main` at `e847078` in the real client: Apple
M5 Air (8-core GPU), AC power, user away, Spotify started muted in the background without vsync (`--mute-audio
--disable-gpu-vsync --disable-frame-rate-limit --disable-mac-overlays` + the no-throttling flags), 1400×900 at 2x, dark,
Now Playing pane and Spicy's canvas hidden, nothing playing. Tools and raw output: `~/mcloud-research/night-2026-11-08/137/`
(`tools/mainthread.mjs`, `growth.mjs`, `verifyfile.mjs`, `rewrite.js`, …).

**Heat:** the fanless Mac warmed from 35°C to ~60°C die within an hour of no-vsync runs and the same state went from
6.4 to 14ms a frame (kernel_task throttling). Milliseconds are compared only inside one interleaved run, and render
pass counts (which do not depend on heat) carry the GPU findings.

## Starting point

| state (playlist, cool, 5 interleaved rounds) | ms/frame | passes/frame |
| --- | --- | --- |
| full (Liquid Glass player on, Balanced) | 7.22 | 162 |
| Liquid Glass player off | 3.37 | 81 |
| Eco | 0.48 | ~1 |
| full + a settings-window-sized blur(40px) box | 7.74 | 171 |

## 1. Main thread while scrolling: one fix, committed (`b5c9edf`)

Wheel scrolling over CDP (compositor scroll), CPU profile + timeline, 4s:

- Playlist: theme.js 0.24 ms/s of self time; Spotify's `dwp-top-bar` forced style 2.7 ms/s. Nothing to fix.
- Album with album colour Full: style 30–37 ms/s, half of it one **whole-page restyle (5,600–11,500 elements,
  20–30ms)** each time the play controls cross the title bar. `syncEntityBar` toggles `body.am-entity-top`; the list
  header's `getBoundingClientRect` flushes it.
- Any class change on `<body>` cost that much, even a class no rule names (`am-xyz`: 18–41ms depending on the page).
  Disabling one sheet at a time: only `user.css` causes it. A per-rule bisect found 19 selectors with a class-substring
  attribute selector **left of the subject** (`[class*="list-row__header-side"]`, `line-clamp`, `list-row__slot`,
  `chip`, `color-text-subdued`; search dropdown, menus, watch feed, sheet). Blink keys their invalidation on the
  `class` attribute, so a class change on any element invalidates its subtree by the rule's subject: `*` → the whole
  subtree (~15ms each), `div`/`svg`/`span` → every one of those (~3ms each).
- Variants on one such rule (body class toggle, ms): original 25.9; inside `@scope`, `@supports`, `@layer`,
  `@container style()`, `:is()`, `:not(:not())`: 25–30; with `.foo` instead of `[class*]` 0.3; inside
  `@media (max-width:0)` 0.9; **`:nth-child(n of [class*=…])` 0.8**; `X:has(> [class*=…])` 1.0 (not the same matches).
- **The fix:** each such compound now reads `:where(:nth-child(n of [class*="…"])):not(.am-none)`. `:nth-child(n of S)`
  matches every element that matches S (n ≥ 0 covers every index), `:where()` drops its specificity and
  `:not(.am-none)` (a class nothing uses) gives back the attribute selector's (0,1,0). 17 lines of `user.css`.
- **Measured in the client:**
  - body class toggle, natural frame: original 46–60ms (11,466 elements restyled) → ~7ms (5), the same as with the
    rules removed;
  - forced, the committed file loaded in place of the installed one: 34–41ms → 0.8ms;
  - album wheel scroll, style: 37 → 28 ms/s (rules removed entirely: 16). A ~18ms recalc of 642 elements remains at
    each crossing that the removed rules do not show; not pinned down (not hover rules, not one half of the set).
- **Look:** computed styles (every property, plus `::before`/`::after`) identical with the committed file on the album
  page (13,261 and 14,406 elements), a playlist with a context menu open (15,529), and the search dropdown with a row
  selected (1,102 / 1,180). The loading dropdown could not be caught (it lasts a few ms); the rewrite is the same
  match by definition.
- `dev/smoke.mjs` gets a check that no class-attribute selector sits left of a subject outside `:has()` /
  `:nth-child(of)`: it finds 18 selectors on `main`, 0 now. Smoke 91/91 (cached headless shell).
- Not per frame: one hitch per crossing and per theme body-class change (route changes, panes, settings). An M2 pays
  ~1.5–1.7× (`research/issue-137.md` §3).
- Same family, not fixed: two genre-card rules with `div[style*="background-color"]` left of the subject (body inline
  style change 7.2 → 21.6ms with all of user.css; these two add ~4.5). Spotify writes few inline styles while scrolling
  (top bar background only, on a playlist), so it is not a scroll cost.

## 2. The reporter's new video (streamable `yjqkub`, M2 Air, after #174)

Read frame by frame (ffmpeg, page area difference per frame, bursts of changes), 60fps capture, 27s:

| segment | setting | page updates while scrolling |
| --- | --- | --- |
| 0–8s | Liquid Glass player on, Balanced | ~17fps (an update every 3rd frame, holds of 6–12) |
| 10.6–16.6s | Eco | ~33fps average, runs at a full 60 |
| 17–27s | Liquid off, Balanced | ~18–19fps |

- In this capture "Liquid off" is not smoother than "on"; only Eco is. The settings window stays open the whole video
  over the scrolling page, with `backdrop-filter: blur(40px) saturate(1.8)` (removed by Eco). Here it adds 0.5ms and
  ~10 passes; on an M2 under screen recording it may weigh more. Screen recording also loads the GPU (their earlier
  video `lp8cu2` with the window closed: ~35fps glass on, ~48–52 off).
- Liquid off still leaves ~81 passes here: Spotify's toolbar buttons and search field, which the theme gives
  `blur(20px) saturate(1.6)` once the lens is off, are **42** of them (five small glass elements, ~8 passes each), the
  sidebar and its glow 19, the top bar 8, the player's blur 9.

## 3. Why the lenses cost more in a bigger window

Eco as the base (no other backdrop), four player-sized boxes over the scrolling page, cost per box:

| filter on each box | 900×620 | 1300×850 | 1700×1050 |
| --- | --- | --- | --- |
| `url()` with one `feOffset dx=0` | 265µs | 558µs | 1422µs |
| CSS `brightness(1.01)` | 255µs | 520µs | 1054µs |
| CSS `blur(20px)` | 333µs | 716µs | 906µs |
| the player's real `soft` / `bend` / `mid` / `tone` (900 → 1700) | 474 → 925 / 1129 → 1608 / 899 → 1664 / 921 → 1546µs | | |

A backdrop layer that does nothing still costs in proportion to the **window's** area: each one ends the window's
render pass, so the GPU stores and reloads the whole window (on a tile-based GPU that is memory traffic), whatever the
layer's size. The filter's own work adds to that and is size-independent. So the frame's ~15 backdrop layers (lens
layers, top bar, sidebar, glow) cost more in a bigger window, which is what the 2026-11-07 notes saw (7.6 → 11.8ms).
For the look-kept splits this means a layer of its own is not free: it pays one window-sized store/reload, which
`soft` and `thin` still earn back at 1400×900 (−2.3ms measured). More splits (tone, the rim's `rl`, the bend's `fx`)
would cost more than they save in a large window. A 0×0 Spotify element with `blur(16px)` and the volume capsule's
`brightness(1.13)` add no render pass.

## 4. Not done

- The thin layer's 8-bit darkening (needs a restart with `--force-color-profile=srgb`; measurement only).
- A look-kept way to cut the number of backdrop layers (each costs a window-sized store/reload).
- The 642-element recalc left at the album crossing after the fix.
- The marquee: it moves one device pixel per step (28 CSS px/s at 2x = 56 steps/s) whenever the title or subtitle
  overflows, playing or paused, and each step redraws the player's glass. Measure only (the current track did not
  overflow).
