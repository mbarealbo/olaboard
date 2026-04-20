# Olaboard – Context

## Stack
- React + Vite (no TypeScript)
- CSS puro
- Supabase per auth (email+password, Google OAuth) e persistenza cloud
- Stripe per pagamenti e subscription management
- Resend per email transazionali (welcome, notifiche pagamento)
- Netlify per hosting
- No React Flow, no librerie canvas esterne

## Struttura file
- `src/App.jsx` – App (auth gate), AppInner (stato top-level), FolderTree, LoadingOverlay, NotePanel, render SVG frecce, modali (upgrade, manage plan, delete account, confirm generico)
- `src/hooks/useCanvas.js` – tutto lo stato canvas: offset, scale, dragging, connecting, keyboard, exitPoint
- `src/components/PostIt.jsx` – componente PostIt con 4 connect dots cardinali, Lucide icons
- `src/components/GroupBox.jsx` – Group (box ridimensionabile) e CanvasLabel (testo libero, link cliccabili)
- `src/components/BlockEditor.jsx` – editor blocchi stile Notion con slash commands, blocchi immagine, link cliccabili nei blocchi `p`
- `src/components/AuthPage.jsx` – login/signup (email+password, Google OAuth), reset password, new password
- `src/components/LandingPage.jsx` – landing pubblica con mockup animati e footer legale
- `src/components/PricingPage.jsx` – pagina prezzi
- `src/components/PrivacyPage.jsx` – Privacy Policy GDPR bilingue IT/EN (route: /privacy)
- `src/components/TermsPage.jsx` – Termini e Condizioni bilingue IT/EN (route: /terms)
- `src/lib/supabase.js` – createClient export
- `src/lib/db.js` – tutte le funzioni CRUD Supabase (boards, canvases, cards, connections, bulk upsert/delete)
- `src/lib/plans.js` – limiti per piano (free/pro/god), countTotalCanvases
- `src/contexts/PlanContext.jsx` – piano utente da Supabase profiles
- `src/utils.js` – costanti CARD_W=130, CARD_H_HALF=37, uid() (crypto.randomUUID), buildPath()
- `supabase/functions/delete-account/` – Edge Function: cancella storage, annulla sub Stripe, elimina auth user (cascade DB)
- `supabase/functions/create-checkout/` – Edge Function: crea sessione checkout Stripe
- `supabase/functions/stripe-webhook/` – Edge Function: webhook Stripe con template email
- `supabase/functions/send-welcome-email/` – Edge Function: welcome email su nuovo utente

## Auth
- `LoginRoute`: `onAuthStateChange` → naviga a `/board` quando sessione presente
- `BoardRoute`: `getSession()` + `onAuthStateChange` → redirect a `/login` se null
- Metodi supportati: email+password (`signInWithPassword`), Google OAuth (`signInWithOAuth`)
- Google OAuth: `redirectTo` punta a `/login` (non `/board`) per evitare race condition con PKCE code exchange
- Trigger DB: `on_auth_user_created` → inserisce in `profiles` (con exception handler per non bloccare la registrazione)
- Trigger DB: `on_profile_created_send_welcome` → chiama Edge Function `send-welcome-email` via pg_net (con exception handler)

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
- `collapsedIds` – Set di id di cartelle/board collassati nella sidebar, persistito in `localStorage['olaboard_expanded']`
- `sidebarFocusId` – id dell'elemento sidebar con focus tastiera (Up/Down/Enter)
- `listSelectMode` – boolean, attiva la selezione multipla nella vista elenco
- Stack persistito in `localStorage` (STACK_KEY), validato al boot

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
4. `loadedRef.current.add(firstCanvasId)` – previene double-fetch dal secondo useEffect
5. `loadCanvasData(firstCanvasId, firstBoardId, initName)` + `centerCanvas(firstCanvasId, loaded)`
6. `setLoading(false)`

### loadCanvasData(canvasId, boardId, folderName)
1. `fetchCanvasDB(canvasId)` – se null, crea canvas con `createCanvasDB`
2. Fetch cards + connections in parallelo
3. `setDb` aggiorna entry del canvas
4. `confirmedName = canvasData?.name || folderName || canvasId`
5. Se `confirmedName` non è UUID e `canvasId === currentIdRef.current`, aggiorna `displayName`
6. Ritorna `loadedCanvas` per uso immediato (es. centerCanvas)

### Sync debounced (ogni render, 500ms)
- `upsertCards` + `deleteCardsByIds` (diff vs syncedRef)
- `upsertConnections` + `deleteConnectionsByIds` (diff vs syncedRef)
- `updateCanvasDB` per groups/labels

### Navigazione
- `enterCanvas(id, name)` – async, setta `displayName` eagerly, aggiorna db stub, aggiunge a stack, chiama `loadCanvasData`, poi `centerCanvas(id, loaded)`
- `navigateTo(idx)` – setta `displayName` eagerly, tronca stack, chiama `centerCanvas` via setTimeout (dati già in memoria)
- `handleSidebarNavigate(targetId)` – async, setta `displayName` eagerly, calcola path ricorsivo, chiama `loadCanvasData` + `centerCanvas(id, loaded)`
- Board click in sidebar – setta `displayName` eagerly, setta stack a `[board.id]`

### centerCanvas(canvasId, canvasOverride)
- Legge `canvasOverride || dbRef.current[canvasId]` (ref, mai stale)
- Calcola bounding box di card + group + label
- Calcola scala e offset per fit all'80% del viewport

## Feature implementate

### Canvas
- Pan/zoom infinito (drag sfondo, scroll, bottoni +/−)
- Bottone **Center** (Maximize2 icon) nella toolbar: chiama `centerCanvas(currentId)` per adattare la vista agli elementi
- Accentramento automatico al primo caricamento e ad ogni navigazione canvas
- Post-it: doppio click crea, doppio click rinomina inline
  - 8 colori, COLOR_MAP light/dark, HC_COLOR_MAP high-contrast
  - `getTextColor(bgHex)`: testo scuro/chiaro automatico per luminanza
- Cartelle: doppio click entra nel canvas figlio
- Testo libero (`isLabel:true`): card senza sfondo, testo `var(--text)` (bianco in HC)
- Gruppi: box ridimensionabili, titolo editabile, drag muove card interne
- Frecce bezier con exitPoint geometrico, control points adattivi
- 4 connect dots per card (top/right/bottom/left), visibili su hover
- Etichette frecce: input inline, cancellabile svuotando
- ⚡ Quick (autoCreate): drag freccia → crea card collegata
- Griglia puntini toggle
- activeTool modale: `'note'|'text'|'group'`

### Selezione multipla
- ⬚ Select (lasso multi-selezione) nel canvas
- Pannello selezione (destra, `position: absolute`, `zIndex: 200`) appare quando `multiSelected.length > 0`
  - Header con conteggio elementi
  - Lista con checkbox: togliere la spunta rimuove l'elemento dalla selezione senza eliminarlo
  - Bottone "Elimina" rosso: elimina tutti gli elementi spuntati da stato locale + Supabase
  - `onMouseDown={e.stopPropagation()}` sul pannello per evitare chiusura involontaria
- **Vista Elenco**: bottone "☑ Seleziona" attiva `listSelectMode`
  - Checkbox a sinistra di ogni riga
  - Click sulla riga o checkbox toglie/aggiunge da `multiSelected`
  - Riga evidenziata con bordo accent quando selezionata
  - Disattivare "Seleziona" svuota la selezione

### Delete tramite tastiera
- `Delete`/`Backspace` su elementi multi-selezionati → `deleteMultiSelected()` (locale + Supabase)
- `Delete`/`Backspace` su connessione selezionata → elimina solo la connessione
- **Non elimina più board o sottocartelle via tastiera** — solo tramite il bottone esplicito nella sidebar

### Sidebar
- Logo "Olaboard" in alto (font system-ui, 18px, bold, letterSpacing -0.5px)
- FolderTree collassabile: il ▾/▸ sulla board row collassa/espande l'intero albero; i folder item con figli (depth ≥ 2) mostrano ▶/▼ per collassare il sottoalbero
- Stato collapsed persistito in `localStorage['olaboard_expanded']` (Set di id collassati, default tutti espansi)
- `sidebarFocusId`: focus tastiera visivo (background `var(--border)`) su board row e folder items
- Board row: `sidebarFocusId === board.id` → highlight, hover disabilitato quando già evidenziato

### Tastiera
- **S** – attiva Select mode
- **Q** – attiva Quick mode
- **G** – toggle tool Gruppo
- **T** – toggle tool Testo
- **Tab** – cicla canvas fratelli allo stesso livello (root: board list; annidato: folder figli del parent)
- **↑/↓** – muove `sidebarFocusId` attraverso la lista flat degli item sidebar visibili (rispetta collapsed), wrap-around
- **Enter** – naviga all'item `sidebarFocusId`
- **Escape** – cancella `sidebarFocusId`
- **Shift+↓** – entra nel canvas dell'item con focus (un livello più profondo)
- **Shift+↑** – torna al canvas parent (equivalente a breadcrumb back)
- Tutte le shortcut disabilitate quando focus su input/textarea/contenteditable

### Legenda shortcut
- `<kbd>` chips (S Q G T Tab) in basso a destra del canvas, `pointerEvents: none`

### Note e organizzazione
- Pannello note: side (380px) e full mode
- BlockEditor stile Notion: p/h1/h2/h3/ul/ol/quote/code + blocchi immagine
- Preview body sui post-it (max 3 righe)
- Vista Elenco con sort az/za/date
- Sidebar: multi-board, rinomina inline, cancella (con conferma), + Nuova lavagna, Esci
- Breadcrumb overlay bottom-left (annidato)
- Export markdown canvas

### Temi
- Light / Dark / High Contrast (CSS variables)
- HC: sidebar-active `#7b2fff`, toolbar active `#7b2fff`, testo libero `var(--text)` → bianco
- Bottone tema fisso (fixed bottom-right, `Maximize2` icon)

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

## Modali in AppInner
- `showAccount` – pannello account (piano, storage, lingua, logout, elimina account)
- `showUpgrade` – upgrade a Pro con checkout Stripe
- `showManagePlan` – gestione piano Pro (downgrade a Free, cancella abbonamento)
- `showDeleteAccount` – eliminazione account con conferma testuale ("ELIMINA"/"DELETE")
- `confirmModal` – modale generica riutilizzabile `{ title, message, confirmLabel, danger, onConfirm }` — usata per elimina lavagna, downgrade, cancella abbonamento

## Prossimi step
1. Export PDF / screenshot canvas
2. Ricerca full-text tra le idee
3. Collaborazione real-time (Supabase Realtime)
4. Mobile & touch support
