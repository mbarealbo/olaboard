import { useRef, useEffect } from 'react'

const COLOR_MAP = {
  yellow: '#FAC775', orange: '#EF9F27', green: '#b8e986',
  blue: '#89cff0', pink: '#ffb3c6', purple: '#d4a8ff',
  white: '#f5f5f5', red: '#ff8a80',
}

function getTextColor(bgHex) {
  if (!bgHex || !bgHex.startsWith('#')) return '#412402'
  const r = parseInt(bgHex.slice(1,3), 16)
  const g = parseInt(bgHex.slice(3,5), 16)
  const b = parseInt(bgHex.slice(5,7), 16)
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff'
}

const HC_COLOR_MAP = {
  yellow: '#00ffff', orange: '#ff00ff', green: '#00ff41',
  blue: '#ffff00', pink: '#ff6600', purple: '#ff00ff',
  white: '#000099', red: '#ff0000',
}

export default function PostIt({ card, selected, onMouseDown, onDblClick, onRename, onNoteOpen, onToggleFolder, onConvertToLabel, onConnectDot, initialEditing, onEditStarted, cardColor, theme }) {
  const titleRef = useRef(null)
  const isHC = theme === 'high-contrast'

  const bg = card.isFolder
    ? (isHC ? '#ff00ff' : COLOR_MAP.orange)
    : isHC
      ? (HC_COLOR_MAP[cardColor] || '#00ffff')
      : (COLOR_MAP[cardColor] || COLOR_MAP.yellow)

  const textColor = getTextColor(bg)

  function startEdit(e) {
    if (e) e.stopPropagation()
    const el = titleRef.current
    el.contentEditable = 'true'
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  useEffect(() => {
    if (initialEditing) { startEdit(null); onEditStarted() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function commitEdit() {
    const el = titleRef.current
    el.contentEditable = 'false'
    const t = el.textContent.trim() || 'Nuova idea'
    if (t !== card.title) onRename(t)
  }

  return (
    <div
      data-card-id={card.id}
      className={`postit${card.isFolder ? ' is-folder' : ''}${selected ? ' selected' : ''}`}
      style={{ left: card.x, top: card.y, zIndex: 2, ...(bg ? { background: bg } : {}) }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDblClick}
    >
      <div
        ref={titleRef}
        className="postit-title"
        style={{ color: textColor }}
        onDoubleClick={startEdit}
        onBlur={commitEdit}
        onKeyDown={e => {
          e.stopPropagation()
          if (e.key === 'Enter') { e.preventDefault(); titleRef.current.blur() }
        }}
        suppressContentEditableWarning
      >
        {card.title}
      </div>

      {card.body ? (
        <div style={{
          fontSize: 10, color: `${textColor}99`, lineHeight: 1.4, marginTop: 4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        }}>{card.body}</div>
      ) : null}

      <div className="postit-actions">
        <button className="paction" title="Apri note" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onNoteOpen() }}>☰</button>
        <button className="paction" title={card.isFolder ? 'Rimuovi cartella' : 'Converti in cartella'} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onToggleFolder() }}>📁</button>
        <button className="paction" title="Converti in etichetta" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onConvertToLabel() }}>T</button>
      </div>

      <div className="connect-dot connect-dot-top"    onMouseDown={e => onConnectDot(e, 'top')} />
      <div className="connect-dot connect-dot-right"  onMouseDown={e => onConnectDot(e, 'right')} />
      <div className="connect-dot connect-dot-bottom" onMouseDown={e => onConnectDot(e, 'bottom')} />
      <div className="connect-dot connect-dot-left"   onMouseDown={e => onConnectDot(e, 'left')} />
    </div>
  )
}
