# Handwriting vs Typed Comparison (Item Code Search)

This is a small front-end tool to compare **handwritten notes** with their corresponding **typed/product code** and quickly search through saved examples.

The page renders items from `items.json`, shows two images side-by-side (handwriting and typed), and supports:
- Searching by handwriting text and/or typed product code
- Zooming (80% to 300%) on both image panels
- Drag/pan while zoomed in
- Light/Dark (Night) mode saved in `localStorage`

## How it works

`items.json` contains an array of objects. Each object can include:
- `id`: string identifier
- `handwrittenText`: free text captured from handwriting
- `typedProductCode`: product code typed value
- `handwritingImage`: relative path to the handwriting image
- `typedImage`: relative path to the typed/product image

On load, the app fetches `./items.json` and renders one “card” per item.

### Search behavior

The search input is normalized before matching:
- Lowercases the query
- Replaces non-alphanumeric characters with spaces
- Splits into tokens (by spaces)

If you type multiple tokens, they must all match (AND) inside the selected field(s).

Matching strategy:
- If `Handwritten` checkbox is enabled, an item matches when **all tokens** are contained in its `handwrittenText`.
- If `Typed / Product Code` checkbox is enabled, an item matches when **all tokens** are contained in its `typedProductCode`.
- If both checkboxes are enabled, an item matches when either field satisfies the token match.

## Local setup / running

Because the app fetches `items.json` using `fetch("./items.json")`, it works best when served from a local HTTP server (not by opening `index.html` directly from `file://`).

### Option A: Python (quickest)

In this folder (`Item_Code_Search`), run:

```powershell
py -m http.server 8000
```

Then open:
- `http://localhost:8000/`

If `py` is not available, try `python -m http.server 8000`.

### Option B: Any static server

Use any static server that serves the project folder contents over HTTP (for example VS Code Live Server).

## How to add or update items

1. Edit `items.json`
2. Ensure `handwritingImage` and `typedImage` point to real files inside (or under) the repo folder
3. Refresh the page

Example item entry:

```json
{
  "id": "33",
  "handwrittenText": "L connector, 180 deg connector",
  "typedProductCode": "H-L-180",
  "handwritingImage": "assets/HANDQUOT_33.jpeg",
  "typedImage": "assets/QUOT_33.jpeg"
}
```

## Project structure

- `index.html` - UI layout (search controls, grid, and template)
- `app.js` - filtering logic + image rendering + zoom/pan interactions
- `styles.css` - styling and themes
- `items.json` - data source (list of items)
- `assets/` - images referenced by `items.json`

## Notes / limitations

- Everything is client-side: the full `items.json` is loaded and filtered in the browser.
- If an image path is missing/incorrect, the UI will show a dim/empty state for that side.

