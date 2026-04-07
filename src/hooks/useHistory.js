import { useState, useRef, useCallback } from 'react'

const MAX = 50

export function useHistory() {
  const undoStack = useRef([])
  const redoStack = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const push = useCallback((cmd) => {
    undoStack.current.push(cmd)
    if (undoStack.current.length > MAX) undoStack.current.shift()
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    const cmd = undoStack.current.pop()
    if (!cmd) return
    cmd.undo()
    redoStack.current.push(cmd)
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [])

  const redo = useCallback(() => {
    const cmd = redoStack.current.pop()
    if (!cmd) return
    cmd.redo()
    undoStack.current.push(cmd)
    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [])

  return { push, undo, redo, canUndo, canRedo }
}
