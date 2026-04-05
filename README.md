# Olaboard

A visual thinking tool for capturing and connecting ideas on an infinite canvas.

![Olaboard](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![React](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

---

## What is Olaboard?

Olaboard is a personal idea management tool built around a visual canvas. Think of it as the missing middle ground between Miro (too collaborative, too expensive) and Notion (great for text, weak on visuals). It's opinionated, fast, and designed for solo thinkers.

Everything runs locally in your browser. No account required. No data leaves your machine.

---

## Features

### Canvas
- Infinite canvas with pan and zoom
- **Post-it notes** with body preview, custom colors, and rich notes
- **Folders** (nested canvases) with tab visual indicator
- **Free text labels** — transparent, draggable, connectable
- **Group boxes** — resizable containers that move cards with them
- **Arrows** with smart bezier routing, labels, and color on selection
- **Quick Connect** — drag an arrow to empty space to auto-create a connected element
- **Multi-select** lasso tool — select and delete groups of elements
- Dot grid background (toggleable)

### Notes
- Full-width or side panel mode
- **Block editor** inspired by Notion — slash commands, markdown shortcuts
- Block types: paragraph, H1/H2/H3, bullet list, numbered list, quote, code
- Auto-detect lists: type `- ` or `1. ` to convert
- Bear-style red bullets
- Custom post-it colors (8 options, theme-aware)

### Organization
- **Multiple boards** with rename, delete, and keyboard shortcuts
- **Nested folders** — infinite depth, full sidebar tree
- **Breadcrumb** navigation anchored to canvas bottom-left
- **List view** — all elements with type badge and creation date
- **Export to Markdown** — current canvas exported as .md file

### Themes
- Light (default)
- Dark
- High Contrast — Commodore 64 palette (cyan, magenta, green on deep blue)

---

## Stack

- **React 19** + **Vite 8**
- Pure CSS (no Tailwind)
- `localStorage` for persistence
- No canvas libraries — all SVG + DOM
- Lucide React for icons

---

## Getting Started

```bash
git clone https://github.com/yourusername/olaboard.git
cd olaboard
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome (recommended).

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Double click (canvas) | Create new element |
| Double click (post-it) | Open note panel |
| Double click (folder) | Enter folder |
| `Delete` / `Backspace` | Delete selected element |
| `Ctrl+Z` | Undo *(coming soon)* |
| `Escape` | Deselect / close panel |

---

## Toolbar

| Button | Description |
|--------|-------------|
| Gruppo | Draw a group box by dragging |
| T Testo | Double click creates free text instead of post-it |
| Grid | Toggle dot grid |
| Quick | Drag arrow to empty space to auto-create and connect |
| Select | Lasso multi-select |

---

## Roadmap

- [ ] Supabase sync + magic link auth (multi-device)
- [ ] Images in notes and canvas
- [ ] Undo / Redo
- [ ] Full-text search
- [ ] Export to PNG / PDF
- [ ] Tauri desktop app (offline, iCloud sync)
- [ ] Collaboration (real-time, shared boards)

---

## Philosophy

Olaboard is built for people who think visually but also need depth. A post-it on a canvas is just the surface — behind each one is a full document editor. Folders are nested canvases. Arrows are relationships. Everything is connected.

The goal is a tool that stays out of your way until you need it, and gets out of the way again when you don't.

---

## License

MIT — do whatever you want with it.

---

*Built with Claude as AI pair programmer.*