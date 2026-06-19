# Project Structure

## Runtime Entry

- `index.html`
  - Loads React vendor files.
  - Loads app data from `js/data/`.
  - Loads the runtime app from `js/app.js`.
  - Loads CSS through `css/styles.css`.

## Folders

```text
ColoringApp/
  index.html
  assets/
    icons/                 # App/PWA icons
    images/
      artworks/            # Coloring page PNGs
      thumbs/              # Lightweight artwork-list thumbnails
  css/
    styles.css             # CSS import entry
    foundation/            # Design tokens, reset, app shell
    screens/               # Screen-specific styles
      artworks/
      coloring/
      completion/
      guide/
      lobby/
    components/            # Shared component styles
    responsive/            # Mobile shell overrides
    theme/                 # Final visual theme
  js/
    app.js                 # Runtime screens and app state loaded by index.html
    data/
      artworks.js          # Active artwork catalog and theme labels
      palette.js           # Color palette
    utils/
      assets.js            # Image loading cache
      paint.js             # Flood-fill, paintable pixel, progress helpers
      storage.js           # localStorage keys, persistence, progress normalization
    vendor/                # React browser builds
```

## Common Edits

- Add or remove a coloring page: place `vertical-XX.png` in `assets/images/artworks/`, add the same file to `assets/images/thumbs/`, then update `ARTWORK_IDS` and `ARTWORK_META` in `js/data/artworks.js`.
- Regenerate list thumbnails after artwork changes: run `npm run thumbs`.
- Change palette colors: edit `js/data/palette.js`, then bump `js/data/palette.js?v=XX` and `today-coloring-shell-vXX`.
- Change saved progress/gallery behavior: edit `js/utils/storage.js`.
- Change lobby/home visual polish: edit `css/screens/lobby/` and `css/screens/artworks/`.
- Change coloring screen, book surface, and palette layout: edit `css/theme/premium-book.css`.
- Change how-to slides layout: edit `css/screens/guide/modal.css` and `css/components/guide-navigation.css`.
- Keep lobby and how-to separate: lobby state stays in `LobbyScreen`; carousel state, slide text, drag logic, and guide visuals stay in `HowToModal`.
- Change coloring behavior: edit `js/app.js` and `js/utils/paint.js`; this project currently runs without a build step.
- Bump `ARTWORK_VERSION`, `js/data/artworks.js?v=XX`, and `today-coloring-shell-vXX` together when artwork assets change so old browser caches do not serve stale images.

## Artwork Rule

- Active artwork should already have a colored background.
- Only white/light low-saturation regions are paintable; colored background taps are ignored.
- Background-less artwork files are not kept in the active app assets.

## Notes

- CSS modules are imported in order from `css/styles.css`; the current coloring workspace theme lives in `css/theme/premium-book.css`.
- This folder now keeps only the runtime app, styling, data, vendor files, artwork images, and docs needed for the final prototype.
