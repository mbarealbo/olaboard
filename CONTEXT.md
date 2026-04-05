# Olaboard – Context

## Stack
- React + Vite (no TypeScript)
- CSS puro + alcune Tailwind utility classes
- localStorage per persistenza (chiave: olaboard_data)
- No React Flow, no librerie canvas esterne

## Struttura file
- `src/App.jsx` – FolderTree, NotePanel, App render + stato top-level, rendering SVG frecce
- `src/hooks/useCanvas.js` – tutto lo stato canvas: offset, scale, dragging, connecting, keyboard, exitPoint
- `src/components/PostIt.jsx` – componente PostIt con 4 connect dots cardinali
- `src/components/GroupBox.jsx` – Group (box ridimensionabile) e CanvasLabel (testo libero)
- `src/components/BlockEditor.jsx` – editor blocchi stile Notion con slash commands
- `src/utils.js` – costanti CARD_W=130, CARD_H_HALF=37, uid(), loadDb(), buildPath()

## Struttura dati localStorage

```js
{
  boards: [{ id, name }],
  root: { id, name, cards: [], connections: [], groups: [], labels: [] },
  [canvasId]: { id, name, cards: [], connections: [], groups: [], labels: [] }
}
```

### Card
```js
{ id, x, y, title, body, isFolder, isLabel, createdAt }
```

### Connection
```js
{ id, from, to, label }
```

### Group
```js
{ id, title, x, y, width, height, cardIds: [] }
```

### Label standalone
```js
{ id, x, y, text, fontSize }
```

## Feature implementate
- Lavagna infinita: pan (drag sfondo), zoom (scroll + bottoni +/−/1:1)
- Post-it gialli (#FAC775): doppio click sulla lavagna crea, doppio click su titolo rinomina inline, entra in rename mode automaticamente alla creazione
- Cartelle arancioni (#EF9F27): doppio click entra nel canvas figlio
- Testo libero (isLabel:true): card senza sfondo, solo testo, convertibile in post-it o cartella
- Gruppi: box ridimensionabili con 8 handle, titolo editabile, trascinare il gruppo muove tutte le card dentro
- Frecce bezier: exitPoint geometrico con padding target 18px, control points adattivi per orizzontale/verticale
- 4 connect dots per card (top/right/bottom/left), visibili su hover
- Etichette frecce: input inline su click del cerchio centrale, cancellabile svuotando il campo
- Pannello note: side mode (380px) e full mode (larghezza totale, max-width 800px centrato)
- BlockEditor stile Notion: blocchi p/h1/h2/h3/ul/ol/quote/code, slash commands, shortcut markdown (# spazio → h1, - spazio → ul, ecc.), bullet rossi stile Bear
- Preview body sui post-it (max 3 righe)
- Vista Elenco: tutti gli elementi (note, cartelle, testi liberi, label) con badge tipo e data creazione
- Sidebar: multiple lavagne, espandi/collassa, rinomina inline, cancella con ×, Delete/Backspace con confirm, + Nuova lavagna, 👤 Account placeholder
- Breadcrumb navigazione con stack di canvas annidati
- Export markdown del canvas corrente (↓ MD)
- Delete/Backspace elimina elemento selezionato (card, label, group)
- FolderTree in sidebar aggiornato in real-time alla creazione cartelle

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

## Bug noti
- Frecce tra elementi molto vicini possono avere curve strane
- Label standalone mancano di createdAt (non compaiono con data in lista)
- Nessuna persistenza cloud

## Prossimi step
1. Supabase + auth magic link
2. Immagini nel canvas e nelle note
3. Colori personalizzati post-it
4. Modalità toolbar (doppio click crea il tipo selezionato dalla toolbar)
5. Export PDF / screenshot canvas
6. Ricerca full-text tra le idee