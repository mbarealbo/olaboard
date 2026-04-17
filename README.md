# Olaboard

A visual thinking tool for capturing and connecting ideas on an infinite canvas.

![version](https://img.shields.io/badge/version-0.8.0-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![React](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

**[olaboard.netlify.app](https://olaboard.netlify.app.)** — try the live demo, no account needed.

---

## What is Olaboard?

Olaboard is a personal idea management tool built around a visual canvas. Think of it as the missing middle ground between Miro (too collaborative, too expensive) and Notion (great for text, weak on visuals). It's opinionated, fast, and designed for solo thinkers.

Sync across devices via Supabase. Sign in with email and password — or open `/app` for an instant demo with no account.

---

![Olaboard demo](guide1.gif)

---

## Features

### Canvas
- Infinite canvas with pan and zoom
- **Center button** — fits all elements in view with one click (centers automatically on navigation)
- **Snap-to-alignment guides** — magnetic guide lines appear while dragging, snapping to edges and centers of other cards
- **Post-it notes** with body preview, custom colors, and rich notes
- **Image cards** — drag & drop images, resize with aspect-ratio lock, connect with arrows
- **Folders (nested canvases)** — infinite depth, double-click to enter, breadcrumb to go back
- **Free text labels** — transparent, draggable, connectable
- **Group boxes** — resizable containers that move cards inside them
- **Arrows** with smart bezier routing, labels, and color on selection
- **Quick Connect** — drag an arrow to empty space to auto-create a connected card
- **Edge strips** — start a connection from anywhere along a card's edge, not just the 4 dots
- **Multi-select** — lasso tool on canvas, or checkbox mode in list view
- Middle mouse to pan (grabbing cursor); left click on empty canvas for immediate lasso + deselect
- Dot grid background (toggleable)

### Undo / Redo
- Full history (Ctrl+Z / Ctrl+Shift+Z) for all canvas operations
- Covers moves, creates, deletes, renames, group ops, connections, label edits

### Notes
- Full-width or side panel mode
- **Block editor** inspired by Notion — slash commands, markdown shortcuts
- Block types: paragraph, H1/H2/H3, bullet list, numbered list, quote, code, image
- Auto-save on every keystroke — no save button
- Creation date and last-modified date below the title
- Text fully selectable by mouse drag in read mode

### Storage
- Drag & drop images directly onto the canvas (Supabase Storage)
- Image blocks inside the note editor
- 100 MB per-user storage limit with usage indicator

### Organization
- **Multiple boards** with rename and delete
- **Nested folders** — infinite depth, each folder is its own canvas
- **Collapsible sidebar tree** — state persisted across sessions
- **Breadcrumb** navigation anchored to canvas bottom-left
- **List view** — all elements with type badge, creation date, and bulk-select
- **Export to Markdown** — current canvas as `.md` file

### Themes
- Light (default)
- Dark
- High Contrast — Commodore 64 palette

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `S` | Lasso select mode |
| `Q` | Quick Connect mode |
| `G` | Group draw tool |
| `T` | Text label tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Tab` | Cycle to next sibling board/folder |
| `↑` / `↓` | Move sidebar keyboard focus |
| `Enter` | Navigate to sidebar-focused item |
| `Shift+↓` | Enter focused folder |
| `Shift+↑` | Go back to parent canvas |
| `Escape` | Clear sidebar focus |
| `Delete` / `Backspace` | Delete selected elements |
| Double-click (canvas) | Create new post-it |
| Double-click (post-it) | Open note panel |
| Double-click (folder) | Enter folder |

---

## Mobile

Olaboard is currently **desktop-only**. On phones (viewport < 640 px + touch input) the app shows a friendly block screen rather than a broken experience. The landing page at `/landing` is fully responsive and accessible on any device.

Mobile and touch support is on the roadmap — see below.

---

## Roadmap

Things coming next, in no particular order:

- 📱 **Mobile & touch support** — proper touch gestures, responsive canvas, pinch-to-zoom
- 🤖 **AI mind map agent** — describe a topic, get a structured canvas of post-its and connections
- ✍️ **AI note rewriting** — rewrite, summarise, or expand the content of any note with one click
- 🖊️ **Free drawing** — freehand strokes directly on the canvas
- 🔌 **Claude MCP server** — use Olaboard as a tool from any Claude agent

Follow progress on [GitHub](https://github.com/mbarealbo/olaboard) or at [olab.quest](https://olab.quest).

---

## Stack

- **React 19** + **Vite 8**
- **React Router v6** — `/landing`, `/app` (demo), `/login`, `/board`
- **Supabase** — auth (email + password) + Postgres + Storage
- Pure CSS + inline styles (no Tailwind)
- No canvas libraries — all SVG + DOM
- Lucide React for icons

---

## Getting Started

```bash
git clone https://github.com/mbarealbo/olaboard.git
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

Open `http://localhost:5173` — landing at `/landing`, demo canvas at `/app`.

---

## Changelog

### 0.8.0
- Landing page — animated mockups, feature sections, nested canvas demo, note mockup
- Mobile block screen — hard block on phones with link to GitHub for updates
- Snap-to-alignment guides with magnetic snapping
- Middle mouse pan (grabbing cursor); left click = immediate lasso + deselect
- Edge strips for easier arrow connections from any point along a card side
- Arrowhead flush with card edge
- Text fully selectable by mouse drag in note panel

### 0.7.0
- i18n support (IT / EN)
- Auto-centering on canvas navigation
- Sidebar UUID flash fix

### 0.6.0
- Email + password auth (replaced magic link)
- React Router — landing, demo mode, auth routes

### 0.5.0
- Note auto-save, card creation dates, block editor improvements
- Incremental card titles

### 0.4.0
- Undo/redo history
- Image cards on canvas
- Sidebar branding

---

## Philosophy

Olaboard is built for people who think visually but also need depth. A post-it on a canvas is just the surface — behind each one is a full document editor. Folders are nested canvases. Arrows are relationships. Everything is connected.

The goal is a tool that stays out of your way until you need it, and gets out of the way again when you don't.

---

## License

MIT — do whatever you want with it.

---

*Built with Claude as AI pair programmer.*
