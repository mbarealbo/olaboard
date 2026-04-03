import { useState } from 'react'

function TreeNode({ canvas, canvases, currentCanvasId, onNavigate, depth = 0 }) {
  const [open, setOpen] = useState(false)
  const children = canvases.filter(c => c.parent_id === canvas.id)
  const isActive = canvas.id === currentCanvasId

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 text-sm"
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (children.length > 0) setOpen(o => !o)
          onNavigate(canvas.id)
        }}
      >
        {children.length > 0 && (
          <span className="text-gray-400 text-xs w-3">{open ? '▾' : '▸'}</span>
        )}
        {children.length === 0 && <span className="w-3" />}
        <span className="text-gray-500 mr-1">{canvas.parent_id ? '📁' : '🗂️'}</span>
        <span className={`truncate flex-1 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
          {canvas.name}
        </span>
      </div>
      {open && children.map(child => (
        <TreeNode
          key={child.id}
          canvas={child}
          canvases={canvases}
          currentCanvasId={currentCanvasId}
          onNavigate={onNavigate}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export default function Sidebar({ canvases, currentCanvasId, onNavigate, onNewCanvas }) {
  const [collapsed, setCollapsed] = useState(false)
  const rootCanvases = canvases.filter(c => !c.parent_id)

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 border-r border-gray-200 bg-white" style={{ width: 40 }}>
        <button
          onClick={() => setCollapsed(false)}
          className="text-gray-500 hover:text-gray-800 text-sm"
          title="Espandi sidebar"
        >
          ▸
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-r border-gray-200 bg-white overflow-hidden" style={{ width: 220 }}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">Olaboard</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-400 hover:text-gray-700 text-xs"
          title="Comprimi sidebar"
        >
          ◂
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {rootCanvases.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">Nessuna lavagna ancora</p>
        )}
        {rootCanvases.map(canvas => (
          <TreeNode
            key={canvas.id}
            canvas={canvas}
            canvases={canvases}
            currentCanvasId={currentCanvasId}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onNewCanvas}
          className="w-full text-xs text-gray-600 py-2 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          + Nuova lavagna
        </button>
      </div>
    </div>
  )
}
