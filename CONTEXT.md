# Olaboard – Context

## Stack
- React + Vite (no TypeScript)
- CSS puro
- Supabase per auth (magic link) e persistenza cloud
- No React Flow, no librerie canvas esterne

## Struttura file
- `src/App.jsx` – App (auth gate), AppInner (stato top-level), FolderTree, LoadingOverlay, NotePanel, render SVG frecce
- `src/hooks/useCanvas.js` – tutto lo stato canvas: offset, scale, dragging, connecting, keyboard, exitPoint
- `src/components/PostIt.jsx` – componente PostIt con 4 connect dots cardinali, Lucide icons
- `src/components/GroupBox.jsx` – Group (box ridimensionabile) e CanvasLabel (testo libero, link cliccabili)
- `src/components/BlockEditor.jsx` – editor blocchi stile Notion con slash commands, blocchi immagine, link cliccabili nei blocchi `p`
- `src/components/AuthPage.jsx` – magic link login page
- `src/lib/supabase.js` – createClient export
- `src/lib/db.js` – tutte le funzioni CRUD Supabase (boards, canvases, cards, connections, bulk upsert/delete)
- `src/utils.js` – costanti CARD_W=130, CARD_H_HALF=37, uid() (crypto.randomUUID), buildPath()

## Auth
- `App` component: `session` state (undefined=loading, null=not logged in, object=logged in)
- `supabase.auth.getSession()` + `onAuthStateChange` per mantenere sessione aggiornata
- `session === undefined` → null (spinner rimosso, ora usa LoadingOverlay)
- `session === null` → `<AuthPage />` (magic link via signInWithOtp)
- `session` presente → `<AppInner userId={session.user.id} />`

## Struttura dati (Supabase)

### Tabelle
- `boards` – id, user_id, name, created_at
- `canvases` – id, board_id, parent_id, user_id, name, groups (jsonb), labels (jsonb)
- `cards` – id, canvas_id, title, body, x, y, is_folder, is_label, color, created_at
- `connections` – id, canvas_id, from_card_id, to_card_id, label, from_anchor, to_anchor

### Shape app (dopo mapCard/mapConn)
```js
// Card
{ id, title, body, x, y, color, isFolder, isLabel, createdAt }

// Connection
{ id, from, to, label, fromAnchor, toAnchor }

// Group
{ id, title, x, y, width, height, cardIds: [] }

// Label standalone
{ id, x, y, text, fontSize }
```

## Stato in AppInner
- `db` – `{ [canvasId]: { id, name, cards, connections, groups, labels } }`
- `boards` – `[{ id, name }]`
- `stack` – array di canvasId (root board in [0], canvas corrente in [last])
- `displayName` – nome human-readable del canvas corrente, settato eagerly prima della navigazione per evitare flash UUID
- `loading` – true durante init, mostra `<LoadingOverlay>`
- Stack persistito in `localStorage` (STACK_KEY), validato al boot (controlla che stack[0] sia una board esistente)

## Refs in AppInner
- `dbRef` – sempre aggiornato a db corrente
- `boardsRef` – sempre aggiornato a boards corrente
- `currentIdRef` – id del canvas corrente
- `loadedRef` (Set) – canvas già caricati, evita double-fetch
- `syncedRef` – `{ [canvasId]: { cardIds: Set, connectionIds: Set } }`, per diff-delete al sync
- `syncTimerRef` – debounce timer per Supabase sync (500ms)

## Flusso dati

### Boot (init useEffect)
1. `fetchBoardsDB(userId)` – se vuoto, crea board + canvas di default
2. Ripristina stack da localStorage (validato)
3. `setDisplayName` con nome board/canvas iniziale
4. `loadCanvasData(firstCanvasId, firstBoardId, initName)`
5. `setLoading(false)`

### loadCanvasData(canvasId, boardId, folderName)
1. `fetchCanvasDB(canvasId)` – se null (PGRST116), crea canvas con `createCanvasDB`
2. Fetch cards + connections in parallelo
3. `setDb` aggiorna entry del canvas
4. `confirmedName = canvasData?.name || folderName || canvasId`
5. Se `confirmedName` non è UUID e `canvasId === currentIdRef.current`, aggiorna `displayName`

### Sync debounced (ogni render, 500ms)
- `upsertCards` + `deleteCardsByIds` (diff vs syncedRef)
- `upsertConnections` + `deleteConnectionsByIds` (diff vs syncedRef)
- `updateCanvasDB` per groups/labels

### Navigazione
- `enterCanvas(id, name)` – setta `displayName` eagerly, aggiorna db stub, aggiunge a stack, chiama `loadCanvasData`
- `navigateTo(idx)` – setta `displayName` eagerly, tronca stack all'indice
- `handleSidebarNavigate(targetId)` – setta `displayName` eagerly, calcola path ricorsivo, setta stack
- Board click in sidebar – setta `displayName` eagerly, setta stack a `[board.id]`

## Feature implementate
- Lavagna infinita: pan (drag sfondo), zoom (scroll + bottoni +/−/1:1)
- Post-it: doppio click sulla lavagna crea, doppio click su titolo rinomina inline
  - 8 colori: yellow/orange/green/blue/pink/purple/white/red
  - COLOR_MAP (light/dark), HC_COLOR_MAP (high-contrast, stile Commodore 64)
  - getTextColor(bgHex): luminance-based testo scuro/chiaro automatico
- Cartelle: doppio click entra nel canvas figlio
- Testo libero (isLabel:true): card senza sfondo, convertibile in post-it o cartella
- Gruppi: box ridimensionabili 8 handle, titolo editabile, drag muove card interne
- Frecce bezier con exitPoint geometrico, control points adattivi
- 4 connect dots per card (top/right/bottom/left), visibili su hover
- Etichette frecce: input inline, cancellabile svuotando
- Pannello note: side (380px) e full mode
- BlockEditor stile Notion: p/h1/h2/h3/ul/ol/quote/code + blocchi immagine (URL inline)
  - Link cliccabili nei blocchi `p` (regex URL, stile var(--accent))
  - Slash commands, shortcut markdown
- Preview body sui post-it (max 3 righe)
- Vista Elenco con sort az/za/date
- Sidebar: FolderTree multi-board, rinomina inline, cancella, + Nuova lavagna, Esci (logout)
- Breadcrumb overlay bottom-left (visibile solo quando annidati)
- Export markdown canvas
- Delete/Backspace elimina elemento selezionato
- Griglia puntini toggle
- activeTool modale ('note'|'text'|'group')
- ⚡ Quick (autoCreate): drag freccia → crea card collegata
- ⬚ Select (lasso multi-selezione)
- Zoom scroll sincrono via ref
- Temi: light / dark / high-contrast (CSS variables)
  - HC sidebar-active: background #7b2fff
  - Toolbar active button: #7b2fff in HC, var(--accent) altrimenti
- Lucide icons ovunque (no emoji nei componenti)
- Link cliccabili in CanvasLabel (GroupBox)
- LoadingOverlay: full-screen, fade-out 0.3s, rimosso dal DOM dopo transizione

## Logica frecce (exitPoint)
```js
function exitPoint(entity, isLbl, goingRight, goingDown, isHoriz, isSource) {
  const w = isLbl ? 112 : CARD_W
  const h = isLbl ? 40 : CARD_H_HALF * 2
  const P = isSource ? 0 : (isLbl ? 20 : 36)
  const cx = entity.x + w / 2
  const cy = entity.y + h / 2
  if (isHoriz) {
    if (isSource) return goingRight ? [entity.x + w, cy] : [entity.x, cy]
    else          return goingRight ? [entity.x - P, cy] : [entity.x + w + P, cy]
  } else {
    if (isSource) return goingDown ? [cx, entity.y + h] : [cx, entity.y]
    else          return goingDown ? [cx, entity.y - P] : [cx, entity.y + h + P]
  }
}
```

## Prossimi step
1. Immagini nel canvas (non solo nelle note)
2. Export PDF / screenshot canvas
3. Ricerca full-text tra le idee
4. Collaborazione real-time (Supabase Realtime)
