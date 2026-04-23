# Olaboard

A visual thinking tool for capturing and connecting ideas on an infinite canvas.

![version](https://img.shields.io/badge/version-1.0.2-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![React](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

**[olaboard.netlify.app](https://olaboard.netlify.app.)** — try the live demo, no account needed.

---

## What is Olaboard?

Olaboard is a personal idea management tool built around a visual canvas. Think of it as the missing middle ground between Miro (too collaborative, too expensive) and Notion (great for text, weak on visuals). It's opinionated, fast, and designed for solo thinkers.

Sync across devices via Supabase. Sign in with **email and password** or **Google** — or open `/app` for an instant demo with no account.

---

![Olaboard demo](guide1.gif)

---

## Pricing

| | Free | Pro | Self-hosted |
|---|---|---|---|
| **Price** | Free forever | €6/month or €45/year | Free forever |
| **Boards** | 3 | Unlimited | Unlimited |
| **Cards per canvas** | 150 | Unlimited | Unlimited |
| **Total canvases** | 30 | Unlimited | Unlimited |
| **Storage** | 20 MB | 100 MB | Your own Supabase |
| **Notes** | Unlimited | Unlimited | Unlimited |
| **Sync across devices** | ✓ | ✓ | ✓ |

**Demo mode** (`/app`) is always free and unlimited — no account needed, data stored locally in the browser.

**Self-hosting is always free.** Clone the repo, connect your own Supabase project, and all limits are gone. The code is MIT — do whatever you want with it.

Upgrade to Pro on [olab.quest](https://olab.quest) to support development and get unlimited everything on the hosted version.

---

## Features

### Canvas
- Infinite canvas with pan and zoom
- **Center button** — fits all elements in view with one click (centers automatically on navigation)
- **Snap-to-alignment guides** — magnetic guide lines appear while dragging, snapping to edges and centers of other cards
- **Post-it notes** with markdown body preview, custom colors, and rich notes
  - **Context toolbar** on selection: instant color picker, no extra click needed
- **Illustrations** — insert SVG characters from Open Doodles, Humaans, and Open Peeps packs
  - Searchable picker with tabs per pack, lazy-loaded thumbnails
  - Click to insert at canvas center, or drag directly to position
  - SVGs adapt to the active theme via `currentColor`
  - Press **I** to open the picker
- **Free text labels** — transparent, draggable, connectable
  - **Context toolbar** on selection: font family (sans/serif/mono/cursive) and font size; last used style is remembered
- **Image cards** — drag & drop images, resize with aspect-ratio lock, connect with arrows
- **Folders (nested canvases)** — infinite depth, double-click to enter, breadcrumb to go back
- **Group boxes** — resizable containers that move cards inside them
- **Arrows** with smart bezier routing, labels, and color on selection
- **Quick Connect** — drag an arrow to empty space to auto-create a connected card
- **Edge strips** — start a connection from anywhere along a card's edge, not just the 4 dots
- **Multi-select** — lasso tool on canvas, or checkbox mode in list view
- Trackpad two-finger scroll pans the canvas; pinch / Ctrl+scroll zooms; Space+drag also pans
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
- **Export** — Markdown (`.md`) or graphic PDF (visual snapshot of the canvas, browser print-to-PDF)

### Languages
- Italian, English, Spanish, German
- Auto-detected from browser locale, switchable in account panel

### Themes
- Light (default)
- Dark
- High Contrast — Commodore 64 palette

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Create new post-it at canvas center |
| `T` | Text label tool |
| `G` | Group draw tool |
| `I` | Open / close Icon Picker |
| `P` | Upload image from computer |
| `D` | Open / close Illustration Picker (Draw) |
| `S` | Lasso select mode |
| `Q` | Quick Connect mode |
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
- **Supabase** — auth (email + password, Google OAuth) + Postgres + Storage + Edge Functions
- **Stripe** — subscription payments
- **Resend** — transactional email
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

## Legal

- [Privacy Policy](https://olaboard.netlify.app/privacy) — GDPR compliant, IT/EN
- [Terms and Conditions](https://olaboard.netlify.app/terms) — IT/EN

---

## Changelog

### 1.1.0
- **Spanish and German** language support (4 languages total: IT, EN, ES, DE) — auto-detected from browser locale, all UI strings fully translated
- **Graphic PDF export** — visual snapshot of the canvas (clones the live DOM, fits all elements, browser print-to-PDF); MD export unchanged
- **Text labels redesigned** — auto-size to content with no default width; right-edge drag sets a fixed width for wrapping; diagonal handle (illustration-style world-coord scaling) scales font size only when no width is set, or both font + width proportionally when it is
- **Label selection** matches illustrations: solid `2px #378ADD` border
- **Snap-to-alignment guides** extended to all element types — images, icons, illustrations, and text labels now snap against each other
- **Quick-mode**: newly created post-its are auto-selected
- **Context pills** (color picker, convert buttons) hidden during multi-select
- **Breadcrumb in list view** — folder path visible when browsing a nested canvas in List mode
- **Shortcuts panel** repositioned to bottom-center of the board

### 1.0.0
- **Illustrations** — insert SVG characters from Open Doodles, Humaans, and Open Peeps packs; searchable picker with lazy thumbnails; drag to position or click to insert; theme-aware via `currentColor`; press `I` to open
- **Context toolbar** — color picker for post-its and font/size selector for text labels appear inline on selection; last used label style is remembered for next creation
- **Markdown preview** in post-it body (truncated to ~3 lines on canvas)
- **Trackpad pan** — two-finger scroll pans the canvas (scroll = pan, Ctrl/pinch = zoom)
- **Space+drag** to pan the canvas with grab cursor
- **N shortcut** — creates a new post-it at the center of the current viewport

### 0.9.0
- Google OAuth login ("Continue with Google" button on auth page)
- Account deletion flow — immediate, irreversible, removes all data + cancels Stripe subscription
- Manage plan modal for Pro users — downgrade to Free or cancel subscription
- Privacy Policy and Terms & Conditions pages (IT/EN, GDPR compliant)
- Native confirm modals replacing all `window.confirm()` dialogs
- Welcome email on signup via Resend + Supabase Edge Function
- Stripe webhook email templates with logo

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
