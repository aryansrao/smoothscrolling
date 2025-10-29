## smoothscrolling

A tiny, dependency-free script that replaces the native page scroll with a smooth, inertia-enabled scroller.

This repository exposes a single script file you can drop into any HTML page to enable smooth scrolling behavior. It auto-initializes on DOM ready and exposes a small runtime API for programmatic control.

## Quick install

Recommended (fast, cacheable CDN):

```html
<!-- load from jsDelivr (recommended) -->
<script src="https://cdn.jsdelivr.net/gh/aryansrao/smoothscrolling@main/smoothscrolling.js"></script>
```

Direct raw GitHub (works but less cache-friendly):

```html
<script src="https://raw.githubusercontent.com/aryansrao/smoothscrolling/main/smoothscrolling.js"></script>
```

Place the script tag near the end of your `<body>` (before `</body>`) so the page content is available when the script runs.

## What it does

- Wraps your existing `<body>` children in a scroller element.
- Hides native overflow and renders scroll using transforms for smooth motion.
- Adds mouse wheel, touch handling with inertia, and a small configuration object.
- Exposes a global `window.SmoothScroll` API (see below).

## Usage examples

Basic inclusion (auto-initializes):

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Smooth scroll test</title>
  </head>
  <body>
    <h1>Hello</h1>
    <p>Long content...</p>

    <!-- include script before closing body -->
    <script src="https://cdn.jsdelivr.net/gh/aryansrao/smoothscrolling@main/smoothscrolling.js"></script>
  </body>
</html>
```

Programmatic API

The script exposes `window.SmoothScroll` with these helpers:

- `scrollTo(y)` — scroll to a vertical position (pixels).
- `getPosition()` — returns the current scroll position (number).
- `updateBounds()` — recompute internal scroll bounds (call after DOM changes that affect height).
- `setConfig(obj)` — merge configuration options. Example options available:
  - `smoothFactor` (0.01 - 0.15) — lower = smoother/slower
  - `touchSensitivity` — touch move multiplier
  - `inertiaMultiplier` — inertia strength on touch release
  - `inertiaDecay` — inertia decay rate (0..1)

Example:

```html
<script>
  // scroll to 500px
  window.SmoothScroll && window.SmoothScroll.scrollTo(500);

  // tweak smoothing
  window.SmoothScroll && window.SmoothScroll.setConfig({ smoothFactor: 0.05 });
</script>
```

Notes and caveats

- The script injects minimal styles and sets `body { overflow: hidden !important; }`. If you rely on other scroll-related scripts or CSS, test integration carefully.
- If you dynamically change the page height (load content asynchronously), call `window.SmoothScroll.updateBounds()` so the scroller recalculates maximum scroll.
- For production use on public sites consider pinning the jsDelivr URL to a release/tag rather than `@main` so cached versions don't change unexpectedly.