# Design Review: Today Coloring App Polish

Reviewed against: current product direction in codebase and user request
Philosophy: calm premium coloring-book app with game-grade touch clarity
Date: 2026-06-18

## Screenshots Captured

| Screenshot | Breakpoint | Description |
| --- | --- | --- |
| `screenshots/review-home-mobile-375.png` | Mobile 375x812 | Home library and bottom navigation |
| `screenshots/review-color-mobile-375.png` | Mobile 375x812 | Coloring canvas and palette controls |
| `screenshots/review-gallery-mobile-375.png` | Mobile 375x812 | Saved artwork gallery |
| `screenshots/review-home-tablet-768.png` | Tablet 768x1024 | Home responsive layout |
| `screenshots/review-color-tablet-768.png` | Tablet 768x1024 | Coloring responsive layout |
| `screenshots/review-gallery-tablet-768.png` | Tablet 768x1024 | Gallery responsive layout |
| `screenshots/review-home-desktop-1280.png` | Desktop 1280x800 | Desktop home and side nav |
| `screenshots/review-color-desktop-1280.png` | Desktop 1280x800 | Desktop coloring with side palette |
| `screenshots/review-gallery-desktop-1280.png` | Desktop 1280x800 | Desktop gallery |

## Summary

The app already had a warm, calm visual foundation. The main polish gap was interaction affordance: the gallery card looked tappable but only the thumbnail acted as the button, the coloring controls took more space than needed on mobile, and category buttons felt closer to form controls than a polished game-like library.

## Must Fix

1. **Gallery card touch area**: The list card needed to open from the full card, not only the thumbnail. Fixed in `js/app.js` by making the whole gallery card a button.
2. **Cache freshness**: Updated `index.html` and `sw.js` asset versions so the new CSS/JS ship through the service worker.

## Should Fix

1. **Coloring panel density**: The mobile palette panel was too tall and weakened the drawing area. Reduced panel height, current-color width, tool sizes, and swatch sizes while preserving 36px+ touch targets.
2. **Gallery affordance**: Added card-level hover/active/focus treatment and a subtle arrow indicator so saved pieces read as openable items.
3. **Home category polish**: Improved category active state, elevation, and tactile feedback so the library feels less like a generic form grid.

## Could Improve

1. **Long-term onboarding**: The app could add one first-use micro hint on the coloring screen for zoom and tap behavior.
2. **Gallery empty state**: The empty gallery is functional, but could become more celebratory after the first completed artwork.

## What Works Well

- The core coloring screen now prioritizes the artwork visually, especially after reducing the bottom panel height.
- The thumbnail-first home grid loads quickly and avoids expensive canvas work for untouched artworks.
- The calm paper, sage, and ink palette is consistent across home, coloring, completion, and gallery.

## Final QA Addendum

- Paint edge smoothing now requires stronger neighboring fill support near dark ink, reducing overfill risk while preserving small white-gap cleanup.
- First-view thumbnails and the first few full artwork images are preloaded during idle time to improve the perceived start and pick-art flow.
- `npm run qa:flow` now checks paint latency, gallery behavior, and whether dark ink pixels changed after painting. Latest run: max paint total `20.8ms`, ink changes `0`, errors `0`.
