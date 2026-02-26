# **Pixi Canvas（简易画布项目）**

这是一个用 Vue3 + PixiJS 做的轻量画布练习项目，目标是实现常见“白板/画布”能力：绘制图形、插入文字/图片、选择与变换、撤销重做、导出。整体尽量保持结构简单，便于后续扩展。

## 功能

1. **工具切换**：选择 / 平移 / 画圆 / 画矩形 / 文字 / 插入图片
2. **图形编辑**：选中、拖拽移动、缩放、旋转（选择框 + 控点）
3. **文字**：点击放置文字，点击文字可编辑（按你当前实现方式）
4. **图片**：本地选择图片后插入画布，可选中拖拽/缩放/旋转
5. **历史**：撤销 / 重做
6. **导出**：导出 JSON（可用于恢复），导出 PNG（截图式导出）

## 核心设计

### 1）统一坐标系

**1.**画布世界使用一个 viewport 容器承载所有内容，缩放/平移都通过 viewport.scale / viewport.position 实现。

**2.**指针事件使用 viewport.toLocal(event.global) 把屏幕坐标转换到世界坐标，避免缩放平移后出现偏移问题。

### 2）分层

- shapesLayer：正式图形（圆/矩形/文字/图片）

- tempLayer：绘制中的临时图形（鼠标拖拽预览）

- overlayLayer：选择框/控点（仅 UI，不参与导出数据）


### 3）交互状态机

交互由 useInteraction 统一处理，根据 mode 切换行为：

- dragging：拖动选中图形

- resizing：拖动缩放控点

- rotating：拖动旋转控点

- panning：拖动平移画布

- drawing：绘制临时图形


## 项目结构

- components/PixiCanvas.vue：初始化 Pixi、工具栏 UI、调用交互与各服务

- composables/usePixiApp.js：创建 app/viewport/各 layer

- composables/useInteraction.js：指针事件绑定 + 状态机

- composables/useShapeManager.js：图形数据管理（增删改、序列化）

- services/ShapeRenderer.js：把数据画成 Pixi Graphics/Sprite/Text

- services/SelectionRenderer.js：选择框与控点渲染
