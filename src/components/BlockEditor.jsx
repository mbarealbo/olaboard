import { useState, useRef, useEffect, useCallback } from 'react'

function uid() { return crypto.randomUUID() }

// ── markdown parse ────────────────────────────────────────────────────────────
export function parseMarkdown(md) {
  if (!md || !md.trim()) return [{ id: uid(), type: 'p', content: '' }]
  const blocks = []
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (line.startsWith('```')) {
      const rest = line.slice(3)
      if (rest.endsWith('```') && rest.length > 0) {
        blocks.push({ id: uid(), type: 'code', content: rest.slice(0, -3) })
        i++; continue
      }
      const codeLines = rest ? [rest] : []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) codeLines.push(lines[i++])
      blocks.push({ id: uid(), type: 'code', content: codeLines.join('\n') })
      i++; continue
    }
    const imgMatch = line.match(/^!\[([^\]]*)\]\((.+)\)$/)
    if (imgMatch)                    blocks.push({ id: uid(), type: 'image', url: imgMatch[2], caption: imgMatch[1] })
    else if (line.startsWith('### '))blocks.push({ id: uid(), type: 'h3',    content: line.slice(4) })
    else if (line.startsWith('## ')) blocks.push({ id: uid(), type: 'h2',    content: line.slice(3) })
    else if (line.startsWith('# '))  blocks.push({ id: uid(), type: 'h1',    content: line.slice(2) })
    else if (line.startsWith('- '))  blocks.push({ id: uid(), type: 'ul',    content: line.slice(2) })
    else if (/^\d+\. /.test(line))   blocks.push({ id: uid(), type: 'ol',    content: line.replace(/^\d+\. /, '') })
    else if (line.startsWith('> '))  blocks.push({ id: uid(), type: 'quote', content: line.slice(2) })
    else                             blocks.push({ id: uid(), type: 'p',     content: line })
    i++
  }
  return blocks.length ? blocks : [{ id: uid(), type: 'p', content: '' }]
}

// ── markdown serialize ────────────────────────────────────────────────────────
function serializeBlocks(blocks, domRefs) {
  return blocks
    .map(block => {
      if (block.type === 'image') {
        return block.url ? `![${block.caption || ''}](${block.url})` : null
      }
      const el = domRefs.current[block.id]
      let content = el ? (el.innerText || '') : block.content
      if (content.endsWith('\n')) content = content.slice(0, -1)
      content = content.trim()
      if (!content) return null
      switch (block.type) {
        case 'h1':    return `# ${content}`
        case 'h2':    return `## ${content}`
        case 'h3':    return `### ${content}`
        case 'ul':    return `- ${content}`
        case 'ol':    return `1. ${content}`
        case 'quote': return `> ${content}`
        case 'code':  return '```' + content + '```'
        default:      return content
      }
    })
    .filter(Boolean)
    .join('\n\n')
}

// ── block type menu items ─────────────────────────────────────────────────────
const BLOCK_TYPES = [
  { type: 'p',     icon: '📝',  label: 'Testo',          keywords: ['text', 'testo', 'p', 'paragraph'] },
  { type: 'h1',    icon: 'H1',  label: 'Titolo 1',       keywords: ['h1', 'heading1', 'titolo1', 'title'] },
  { type: 'h2',    icon: 'H2',  label: 'Titolo 2',       keywords: ['h2', 'heading2', 'titolo2'] },
  { type: 'h3',    icon: 'H3',  label: 'Titolo 3',       keywords: ['h3', 'heading3', 'titolo3'] },
  { type: 'ul',    icon: '•',   label: 'Lista',          keywords: ['ul', 'lista', 'list', 'bullet'] },
  { type: 'ol',    icon: '1.',  label: 'Lista numerata', keywords: ['ol', 'numbered', 'numero', 'numerata'] },
  { type: 'quote', icon: '"',   label: 'Citazione',      keywords: ['quote', 'citazione', 'blockquote'] },
  { type: 'code',  icon: '</>',  label: 'Codice',        keywords: ['code', 'codice', 'mono'] },
  { type: 'image', icon: '🖼',  label: 'Immagine',       keywords: ['image', 'immagine', 'img', 'foto', 'photo'] },
]

// Prefixes that trigger block-type conversion on Space (checked in order — longest first)
const SPACE_SHORTCUTS = [
  { prefix: '###', type: 'h3' },
  { prefix: '##',  type: 'h2' },
  { prefix: '#',   type: 'h1' },
  { prefix: '>',   type: 'quote' },
  { prefix: '```', type: 'code' },
  { prefix: '-',   type: 'ul' },
  { prefix: '1.',  type: 'ol' },
]

// ── block styles ──────────────────────────────────────────────────────────────
function getBlockStyle(type) {
  const base = {
    display: 'block', width: '100%', outline: 'none', border: 'none',
    fontSize: 14, lineHeight: 1.8, padding: '2px 0', minHeight: '1.6em',
    background: 'transparent', fontFamily: 'inherit', wordBreak: 'break-word',
  }
  switch (type) {
    case 'h1':    return { ...base, fontSize: 22, fontWeight: 700, color: '#111', padding: '4px 0' }
    case 'h2':    return { ...base, fontSize: 18, fontWeight: 600, color: '#111', padding: '3px 0' }
    case 'h3':    return { ...base, fontSize: 15, fontWeight: 600, color: '#333' }
    // ul/ol: no display:list-item; bullet/number is purely visual via CSS ::before
    // ul/ol: the bullet/number is a sibling span, not ::before — no paddingLeft needed
    case 'ul':    return { ...base, color: '#333', flex: 1 }
    case 'ol':    return { ...base, color: '#333', flex: 1 }
    case 'quote': return { ...base, color: '#888', fontStyle: 'italic', borderLeft: '3px solid #ddd', paddingLeft: 12 }
    case 'code':  return { ...base, fontFamily: 'monospace', background: '#f4f4f4', borderRadius: 4, padding: '2px 6px', fontSize: 13 }
    default:      return { ...base, color: '#333' }
  }
}

const PLACEHOLDERS = {
  p: "Scrivi qualcosa, o '/' per i comandi…",
  h1: 'Titolo 1', h2: 'Titolo 2', h3: 'Titolo 3',
  ul: 'Testo…', ol: 'Testo…',
  quote: 'Citazione…', code: 'Codice…',
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|it|io|net|org|dev|app|co|ai|me|eu)[^\s]*)/g
const IS_URL = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(?:com|it|io|net|org|dev|app|co|ai|me|eu))/

function parseTextWithLinks(text) {
  if (!text) return text
  const parts = text.split(URL_REGEX)
  return parts.map((part, i) => {
    if (!part || !IS_URL.test(part)) return part
    const href = part.startsWith('http') ? part : `https://${part}`
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 500, cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        onClick={e => e.stopPropagation()}
      >{part}</a>
    )
  })
}

// ── ImageBlock ────────────────────────────────────────────────────────────────
function ImageBlock({ block, onUpdate }) {
  const [editing, setEditing] = useState(!block.url)
  const [urlInput, setUrlInput] = useState(block.url || '')
  const [hovered, setHovered] = useState(false)

  function commitUrl() {
    const trimmed = urlInput.trim()
    if (trimmed) {
      onUpdate(block.id, { url: trimmed })
      setEditing(false)
    }
  }

  // URL input row — shown when no url yet or clicking image to re-edit
  if (editing || !block.url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', minHeight: '1.6em' }}>
        <span style={{ fontSize: 14, userSelect: 'none', flexShrink: 0 }}>🖼</span>
        <input
          autoFocus
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-muted)', width: '100%', fontFamily: 'inherit' }}
          placeholder="Incolla URL immagine..."
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Enter') commitUrl()
            if (e.key === 'Escape') { if (block.url) { setUrlInput(block.url); setEditing(false) } }
          }}
          onBlur={commitUrl}
        />
      </div>
    )
  }

  return (
    <div
      style={{ position: 'relative', margin: '4px 0' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={block.url}
        alt={block.caption || ''}
        style={{ maxWidth: '100%', borderRadius: 6, display: 'block', cursor: 'pointer', marginTop: 4 }}
        onClick={() => { setUrlInput(block.url); setEditing(true) }}
      />
      <input
        style={{ fontSize: 12, color: 'var(--text-muted)', border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: '4px 0', fontFamily: 'inherit' }}
        placeholder="Didascalia..."
        value={block.caption || ''}
        onChange={e => onUpdate(block.id, { caption: e.target.value })}
        onKeyDown={e => e.stopPropagation()}
      />
      {hovered && (
        <button
          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 16, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { onUpdate(block.id, { url: '', caption: '' }); setUrlInput(''); setEditing(true) }}
        >×</button>
      )}
    </div>
  )
}

// ── BlockItem ─────────────────────────────────────────────────────────────────
function BlockItem({ block, olIndex, onKeyDown, onInput, onBlur, registerRef, onUpdate }) {
  const elRef = useRef(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const el = elRef.current
    if (el) {
      el.innerHTML = block.content || ''
      if (el.innerHTML === '<br>') el.innerHTML = ''
    }
    return () => registerRef(block.id, null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prevTypeRef = useRef(block.type)
  useEffect(() => {
    if (block.type !== prevTypeRef.current) {
      prevTypeRef.current = block.type
      const el = elRef.current
      if (el) el.innerHTML = ''
    }
  }, [block.type])

  const editableEl = (
    <div
      ref={el => { elRef.current = el; registerRef(block.id, el) }}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={PLACEHOLDERS[block.type] || PLACEHOLDERS.p}
      style={getBlockStyle(block.type)}
      className="block-editor-block"
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); onBlur(block) }}
      onKeyDown={e => onKeyDown(e, block)}
      onInput={e => onInput(e, block)}
    />
  )

  if (block.type === 'image') {
    return <ImageBlock block={block} onUpdate={onUpdate} />
  }

  // 'p' blocks: when not focused, show read-only view with clickable links.
  // Keep contentEditable always mounted (opacity:0) so innerText/refs remain valid.
  if (block.type === 'p') {
    return (
      <div style={{ position: 'relative', minHeight: '1.6em' }}>
        <div style={{ opacity: focused ? 1 : 0, pointerEvents: focused ? 'auto' : 'none', position: focused ? 'relative' : 'absolute', top: 0, left: 0, right: 0 }}>
          {editableEl}
        </div>
        {!focused && (
          <p
            style={{ ...getBlockStyle('p'), margin: 0, cursor: 'text', position: 'relative' }}
            onClick={() => elRef.current?.focus()}
          >
            {block.content
              ? parseTextWithLinks(block.content)
              : <span style={{ color: '#bbb', pointerEvents: 'none' }}>{PLACEHOLDERS.p}</span>
            }
          </p>
        )}
      </div>
    )
  }

  // ul/ol: wrap in flex row so the bullet/number is a real DOM element,
  // always visible (even on empty blocks) — avoids ::before CSS conflict with placeholder.
  if (block.type === 'ul') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '1px 0' }}>
        <span style={{ color: '#e03e3e', fontWeight: 700, fontSize: 14, lineHeight: 1.8, minWidth: 20, userSelect: 'none' }}>•</span>
        {editableEl}
      </div>
    )
  }
  if (block.type === 'ol') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '1px 0' }}>
        <span style={{ color: '#e03e3e', fontWeight: 700, fontSize: 14, lineHeight: 1.8, minWidth: 28, userSelect: 'none' }}>{olIndex}.</span>
        {editableEl}
      </div>
    )
  }

  return editableEl
}

// ── BlockEditor ───────────────────────────────────────────────────────────────
export default function BlockEditor({ value, onChange }) {
  const [blocks, setBlocks] = useState(() => parseMarkdown(value))
  const [slashMenu, setSlashMenu] = useState(null) // { blockId, query, x, y }
  const [slashMenuIdx, setSlashMenuIdx] = useState(0)

  const domRefs = useRef({})         // blockId → DOM element
  const blocksRef = useRef(blocks)   // always-current blocks, safe for closures
  const pendingFocus = useRef(null)  // { id, atEnd }
  const menuRef = useRef(null)
  const menuItemsRef = useRef([])    // always-current filtered menu items
  const prevValueRef = useRef(value)

  useEffect(() => { blocksRef.current = blocks }, [blocks])

  // Re-parse when value changes externally (switching note)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      setBlocks(parseMarkdown(value))
    }
  }, [value])

  // Apply pending focus after every render
  useEffect(() => {
    if (!pendingFocus.current) return
    const { id, atEnd } = pendingFocus.current
    pendingFocus.current = null
    const el = domRefs.current[id]
    if (!el) return
    el.focus()
    try {
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(el)
      range.collapse(!atEnd)
      sel.removeAllRanges()
      sel.addRange(range)
    } catch (_) {}
  })

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashMenu) return
    function onDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setSlashMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [slashMenu])

  const registerRef = useCallback((id, el) => {
    if (el) domRefs.current[id] = el
    else delete domRefs.current[id]
  }, [])

  function emit(blockList) {
    const md = serializeBlocks(blockList, domRefs)
    prevValueRef.current = md
    onChange(md)
  }

  function getContent(id) {
    const el = domRefs.current[id]
    if (!el) return ''
    let t = el.innerText || ''
    if (t.endsWith('\n')) t = t.slice(0, -1)
    return t
  }

  function indexOfBlock(id) {
    return blocksRef.current.findIndex(b => b.id === id)
  }

  // ── update image block fields ─────────────────────────────────────────────
  function updateBlock(id, patch) {
    const updated = blocksRef.current.map(b => b.id === id ? { ...b, ...patch } : b)
    emit(updated)
    setBlocks(updated)
  }

  // ── apply block type conversion (shortcut or slash command) ───────────────
  function convertBlock(blockId, type) {
    const el = domRefs.current[blockId]
    if (el) el.innerHTML = ''
    const updated = blocksRef.current.map(b => b.id === blockId
      ? type === 'image' ? { id: b.id, type: 'image', url: '', caption: '' } : { ...b, type, content: '' }
      : b
    )
    emit(updated)
    setBlocks(updated)
    if (type !== 'image') pendingFocus.current = { id: blockId, atEnd: false }
    setSlashMenu(null)
  }

  // ── keyboard ──────────────────────────────────────────────────────────────
  function handleKeyDown(e, block) {
    const cur = blocksRef.current
    const idx = indexOfBlock(block.id)

    // Slash menu navigation — intercept before all other handlers
    if (slashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashMenuIdx(i => Math.min(i + 1, menuItemsRef.current.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashMenuIdx(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = menuItemsRef.current[slashMenuIdx]
        if (item) convertBlock(slashMenu.blockId, item.type)
        return
      }
    }

    // Space: check for markdown shortcut prefixes (only if block content is exactly the prefix)
    if (e.key === ' ') {
      const el = domRefs.current[block.id]
      const text = (el ? el.textContent : '') || ''
      for (const { prefix, type } of SPACE_SHORTCUTS) {
        if (text === prefix) {
          e.preventDefault()
          convertBlock(block.id, type)
          return
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const content = getContent(block.id)
      const newBlock = { id: uid(), type: 'p', content: '' }
      const updated = blocksRef.current.map(b => b.id === block.id ? { ...b, content } : b)
      const next = [...updated.slice(0, idx + 1), newBlock, ...updated.slice(idx + 1)]
      emit(next)
      setBlocks(next)
      pendingFocus.current = { id: newBlock.id, atEnd: false }
      setSlashMenu(null)
      return
    }

    if (e.key === 'Backspace') {
      const content = getContent(block.id)
      if (content === '' && cur.length > 1) {
        e.preventDefault()
        const prevBlock = cur[idx - 1]
        if (!prevBlock) return
        const next = blocksRef.current.filter(b => b.id !== block.id)
        emit(next)
        setBlocks(next)
        pendingFocus.current = { id: prevBlock.id, atEnd: true }
        setSlashMenu(null)
        return
      }
    }

    if (e.key === 'ArrowUp' && idx > 0) {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed && sel.rangeCount > 0 && sel.getRangeAt(0).startOffset === 0) {
        e.preventDefault()
        pendingFocus.current = { id: cur[idx - 1].id, atEnd: true }
        setBlocks(b => [...b])
        return
      }
    }

    if (e.key === 'ArrowDown' && idx < cur.length - 1) {
      const el = domRefs.current[block.id]
      const sel = window.getSelection()
      if (sel && sel.isCollapsed && sel.rangeCount > 0 && el) {
        const len = (el.textContent || '').length
        if (sel.getRangeAt(0).startOffset >= len) {
          e.preventDefault()
          pendingFocus.current = { id: cur[idx + 1].id, atEnd: false }
          setBlocks(b => [...b])
          return
        }
      }
    }

    if (e.key === 'Escape') { setSlashMenu(null); return }

    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); return }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); return }
  }

  // ── input ─────────────────────────────────────────────────────────────────
  function handleInput(e, block) {
    const el = domRefs.current[block.id]
    const text = el ? (el.textContent || '') : ''
    if (text.startsWith('/') && !text.includes(' ') && text.length <= 20) {
      const rect = el.getBoundingClientRect()
      const newQuery = text.slice(1)
      setSlashMenu(prev => {
        if (prev && prev.query !== newQuery) setSlashMenuIdx(0)
        return { blockId: block.id, query: newQuery, x: rect.left, y: rect.bottom + 4 }
      })
    } else {
      if (slashMenu) setSlashMenu(null)
    }
    emit(blocksRef.current)
  }

  // ── blur ──────────────────────────────────────────────────────────────────
  function handleBlur(block) {
    const content = getContent(block.id)
    const el = domRefs.current[block.id]
    if (el && el.innerHTML === '<br>') el.innerHTML = ''
    const updated = blocksRef.current.map(b => b.id === block.id ? { ...b, content } : b)
    emit(updated)
    setBlocks(updated)
  }

  const menuItems = slashMenu
    ? BLOCK_TYPES.filter(t => {
        if (!slashMenu.query) return true
        const q = slashMenu.query.toLowerCase()
        return (
          t.label.toLowerCase().includes(q) ||
          t.type.startsWith(q) ||
          t.keywords.some(k => k.startsWith(q))
        )
      })
    : []

  // Keep menuItemsRef in sync with current filtered list
  menuItemsRef.current = menuItems

  // Compute ol sequential index (resets when a non-ol block appears between items)
  let olCounter = 0
  const olIndexMap = {}
  blocks.forEach(b => {
    if (b.type === 'ol') { olCounter++; olIndexMap[b.id] = olCounter }
    else olCounter = 0
  })

  return (
    <div style={{ flex: 1, padding: '8px 20px 16px', overflowY: 'auto', position: 'relative' }}>
      {blocks.map((block) => (
        <BlockItem
          key={block.id}
          block={block}
          olIndex={olIndexMap[block.id]}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onBlur={handleBlur}
          registerRef={registerRef}
          onUpdate={updateBlock}
        />
      ))}

      {slashMenu && menuItems.length > 0 && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed', left: slashMenu.x, top: slashMenu.y,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: 200, overflow: 'hidden',
          }}
        >
          {menuItems.map((item, i) => (
            <div
              key={item.type}
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', background: i === slashMenuIdx ? '#f0f7ff' : '' }}
              onMouseEnter={() => setSlashMenuIdx(i)}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); convertBlock(slashMenu.blockId, item.type) }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa', minWidth: 28 }}>{item.icon}</span>
              <span style={{ color: '#333' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
