import { useRef, useEffect } from 'react'

export default function PostIt({ card, selected, onMouseDown, onDblClick, onRename, onNoteOpen, onToggleFolder, onConvertToLabel, onConnectDot, initialEditing, onEditStarted }) {
  const titleRef = useRef(null)

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
      style={{ left: card.x, top: card.y, zIndex: 2 }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDblClick}
    >
      <div
        ref={titleRef}
        className="postit-title"
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
          fontSize: 10, color: 'rgba(65,36,2,0.6)', lineHeight: 1.4, marginTop: 4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        }}>{card.body}</div>
      ) : null}

      <div className="postit-actions">
        <button className="paction" title="Apri note" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onNoteOpen() }}>↓</button>
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
