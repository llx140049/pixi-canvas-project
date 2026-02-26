// src/composables/useHistory.js
export function useHistory(shapeManager) {
  const undoStack = []
  const redoStack = []
  let isRestoring = false

  function cloneShapes() {
    // 只存数据，不存 graphic（graphic 由 addXXX 重新创建）
    return shapeManager.shapes.map(s => ({
      id: s.id,
      type: s.type,
      data: JSON.parse(JSON.stringify(s.data)),
    }))
  }

  function save() {
    if (isRestoring) return
    undoStack.push(cloneShapes())
    redoStack.length = 0
  }

  function restore(snapshot) {
    isRestoring = true
    shapeManager.removeAllShapes()

    snapshot.forEach(s => {
      if (s.type === 'rect') shapeManager.addRect(s.data)
      else if (s.type === 'circle') shapeManager.addCircle(s.data)
      else if (s.type === 'text') shapeManager.addText(s.data)
      else if (s.type === 'image') shapeManager.addImage(s.data)
    })

    isRestoring = false
  }

  function undo() {
    if (undoStack.length === 0) return
    const current = cloneShapes()
    redoStack.push(current)

    const prev = undoStack.pop()
    restore(prev)
  }

  function redo() {
    if (redoStack.length === 0) return
    const current = cloneShapes()
    undoStack.push(current)

    const next = redoStack.pop()
    restore(next)
  }

  return { save, undo, redo }
}