# Olaboard

A visual thinking tool for capturing and connecting ideas on an infinite canvas.

![Olaboard](https://img.shields.io/badge/version-0.6.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![React](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

Made by [olab.quest](https://olab.quest)

---

## What is Olaboard?

Olaboard is a personal idea management tool built around a visual canvas. Think of it as the missing middle ground between Miro (too collaborative, too expensive) and Notion (great for text, weak on visuals). It's opinionated, fast, and designed for solo thinkers.

Sync across devices via Supabase. Sign in with a magic link — no password required.

---

## Features

### Canvas
- Infinite canvas with pan and zoom
- **Center button** — fits all elements in view with one click (or press nothing, it centers automatically on navigation)
- **Post-it notes** with body preview, custom colors, and rich notes
- **Image cards** — drag & drop images onto the canvas, resize with aspect-ratio lock, connect with arrows
- **Folders** (nested canvases) — double click to enter, breadcrumb to go back
- **Free text labels** — transparent, draggable, connectable
- **Group boxes** — resizable containers that move cards inside them
- **Arrows** with smart bezier routing, labels, and color on selection
- **Quick Connect** — drag an arrow to empty space to auto-create a connected card
- **Multi-select** — lasso tool on canvas, or checkbox mode in list view
- Dot grid background (toggleable)

### Undo / Redo
- Full undo/redo history (Ctrl+Z / Ctrl+Shift+Z) for all canvas operations
- Covers moves, creates, deletes, renames, group ops, connections, label edits
- Floating buttons bottom-left above the breadcrumb

### Notes
- Full-width or side panel mode
- **Block editor** inspired by Notion — slash commands, markdown shortcuts
- Block types: paragraph, H1/H2/H3, bullet list, numbered list, quote, code, **image**
- Auto-detect lists: type `- ` or `1. ` to convert

### Notes
- Auto-save on every keystroke — no save button
- Creation date and last-modified date shown below the title
- Block editor with list continuation (Enter adds next item, double Enter exits)
- Cmd+A then Delete clears all content

### Storage
- Drag & drop images directly onto the canvas (stored in Supabase Storage)
- Image blocks inside note editor
- 100 MB per-user storage limit with usage indicator in account panel

### Organization
- **Multiple boards** with rename and delete
- **Nested folders** — infinite depth
- **Collapsible sidebar tree** — state persisted across sessions
- **Breadcrumb** navigation anchored to canvas bottom-left
- **List view** — all elements with type badge, creation date, and bulk-select mode
- **Export to Markdown** — current canvas exported as .md file

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `S` | Activate Select (lasso) mode |
| `Q` | Activate Quick Connect mode |
| `G` | Toggle Group draw tool |
| `T` | Toggle Text label tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Tab` | Cycle to next sibling board/folder |
| `↑` / `↓` | Move sidebar keyboard focus |
| `Enter` | Navigate to sidebar-focused item |
| `Shift+↓` | Enter the focused folder (go deeper) |
| `Shift+↑` | Go back to parent canvas |
| `Escape` | Clear sidebar focus |
| `Delete` / `Backspace` | Delete selected elements |
| Double click (canvas) | Create new post-it |
| Double click (post-it) | Open note panel |
| Double click (folder) | Enter folder |

### Themes
- Light (default)
- Dark
- High Contrast — Commodore 64 palette

---

## Stack

- **React 19** + **Vite 8**
- **Supabase** — auth (magic link) + Postgres + Storage
- Pure CSS (no Tailwind)
- No canvas libraries — all SVG + DOM
- Lucide React for icons

---

## Getting Started

```bash
git clone https://github.com/yourusername/olaboard.git
cd olaboard
npm install
```

Create a `.env` file with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

Open `http://localhost:5173`, enter your email to receive a magic link.

---

## Philosophy

Olaboard is built for people who think visually but also need depth. A post-it on a canvas is just the surface — behind each one is a full document editor. Folders are nested canvases. Arrows are relationships. Everything is connected.

The goal is a tool that stays out of your way until you need it, and gets out of the way again when you don't.

---

## License

MIT — do whatever you want with it.

---

*Built with Claude as AI pair programmer.*
