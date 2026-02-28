
// 历史记录管理
export function useHistory(shapeManager) {

    const undoStack = []//存过去的快照（用于撤销）
    const redoStack = []//存被撤销掉的快照（用于重做）
    let isRestoring = false//是否正在恢复状态

    // 克隆当前图形状态（快照）
    function cloneShapes() {
        // 遍历shapes[]，只存数据（不存graphic）
        return shapeManager.shapes.map(s => ({
            id: s.id,
            type: s.type,
            data: JSON.parse(JSON.stringify(s.data)),//深拷贝data对象
			//把s.data 这个对象转换成字符串再转回对象，从而切断了与原始对象的引用关系。
			//如果不这样做，快照里的 data 就会指向原来的对象，修改图形时，历史记录里的“旧快照”也会跟着变
        }))
    }

    // 保存当前状态，（画新图、拖拽、缩放、旋转、编辑文字）
    function save() {
        if (isRestoring) return//如果正在恢复状态，不保存
        undoStack.push(cloneShapes())
        redoStack.length = 0
    }

    // 从快照恢复图形
    function restore(snapshot) {
        isRestoring = true

		//先清空，再遍历快照数据
        shapeManager.removeAllShapes()
        snapshot.forEach(s => {
          if (s.type === 'rect') shapeManager.addRect(s.data)
          else if (s.type === 'circle') shapeManager.addCircle(s.data)
          else if (s.type === 'triangle') shapeManager.addTriangle(s.data)
          else if (s.type === 'text') shapeManager.addText(s.data)
          else if (s.type === 'image') shapeManager.addImage(s.data)
        })

        isRestoring = false
    }

    // 撤销
    function undo() {
        if (undoStack.length === 0) return
		//保存撤销前的状态进redoStack
        const current = cloneShapes()
        redoStack.push(current)

        // 恢复上一个状态
        const prev = undoStack.pop()
        restore(prev)
    }

    // 重做
    function redo() {
        if (redoStack.length === 0) return
		//保存重做前的状态进undoStack
        const current = cloneShapes()
        undoStack.push(current)

        const next = redoStack.pop()
        // 恢复下一个状态
        restore(next)
	}

    return { save, undo, redo }
}