export default function Breadcrumb({ canvases, currentCanvasId, onNavigate }) {
  function buildPath(id) {
    const path = []
    let current = canvases.find(c => c.id === id)
    while (current) {
      path.unshift(current)
      current = canvases.find(c => c.id === current.parent_id)
    }
    return path
  }

  const path = buildPath(currentCanvasId)

  if (path.length <= 1) return null

  return (
    <div className="flex items-center gap-1 text-sm text-gray-500">
      {path.map((canvas, i) => (
        <span key={canvas.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300">/</span>}
          <button
            onClick={() => onNavigate(canvas.id)}
            className={`hover:text-gray-800 transition-colors ${i === path.length - 1 ? 'text-gray-800 font-medium' : 'hover:underline'}`}
          >
            {canvas.name}
          </button>
        </span>
      ))}
    </div>
  )
}
