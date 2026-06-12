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
      artworks/            # Coloring page PNG line art
  css/
    styles.css             # CSS import entry
    modules/
      00-base.css          # Design tokens, reset, app shell, app bar
      10-home-gallery.css  # Theme filters, artwork cards, empty gallery
      20-coloring-core.css # Coloring surface, completion, toast, confetti
      30-lobby-base.css    # Early lobby styles kept for cascade compatibility
      40-studio-design-pass.css
      50-guide-and-navigation.css
      60-unified-screens.css
      70-guide-repair.css  # How-to carousel final layout repair
      90-mobile-polish.css # Latest lobby/home/mobile polish overrides
  js/
    app.js                 # Runtime app loaded by index.html
    data/
      artworks.js          # Artwork catalog and theme labels
      palette.js           # Color palette
    vendor/                # React browser builds
```

## Common Edits

- Add or remove a coloring page: edit `js/data/artworks.js`, then place the PNG in `assets/images/artworks/`.
- Change palette colors: edit `js/data/palette.js`.
- Change lobby/home visual polish: edit `css/modules/90-mobile-polish.css`.
- Change how-to slides layout: edit `css/modules/70-guide-repair.css`.
- Keep lobby and how-to separate: lobby state stays in `LobbyScreen`; carousel state, slide text, drag logic, and guide visuals stay in `HowToModal`.
- Change coloring behavior: edit `js/app.js`; this project currently runs without a build step.

## Notes

- CSS modules are imported in order from `css/styles.css`; later modules intentionally override earlier ones.
- This folder now keeps only the runtime app, styling, data, vendor files, artwork images, and docs needed for the final prototype.
