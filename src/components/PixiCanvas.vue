<template>


    <div class="canvas-page">
        <div ref="canvasContainer" class="canvas-wrap"></div>

        <!-- 工具栏 -->
        <div class="side-toolbar">
                                  <!-- 动态class，:后为true才启用 -->
            <div class="tool-item" :class="{'tool-active': activeTool==='select'}" @click="setTool('select')" title="选择">
                <i class="iconfont1 icon-xuanze"></i>
            </div>  

            <div class="tool-item" :class="{'tool-active': activeTool==='pan'}" @click="setTool('pan')" title="平移">
                <i class="iconfont icon-pingyi"></i>
            </div>  

            <div class="tool-divider"></div>

            <!-- 图形工具 -->
            <div class="shape-wrapper">
                <div class="tool-item"
                    :class="{'tool-active':isShapeTool}"
                    @click="shapeMenuOpen=!shapeMenuOpen"
                    title="图形">
                 <i class="iconfont1 icon-shape"></i>
                </div>
                <!-- 图形工具菜单 -->
                <div v-show="shapeMenuOpen" 
                    class="shape-menu" 
                    @click.stop><!--等价于在处理函数里调用 event.stopPropagation()-->
                    <div class="shape-menu-item" @click="selectShapeTool('circle')">
                        <i class="iconfont icon-yuanxingweixuanzhong"></i>
                    </div>
                    <div class="shape-menu-item" @click="selectShapeTool('rect')">
                        <i class="iconfont icon-xingzhuang-juxing"></i>
                    </div>
                    <div class="shape-menu-item" @click="selectShapeTool('triangle')">
                        <i class="iconfont icon-xingzhuang-sanjiaoxing"></i>
                    </div>
                </div>
            </div>

            <div
                class="tool-item"
                :class="{ 'tool-active': activeTool==='text' }"
                @click="setTool('text')"
                title="文字">
                <i class="iconfont1 icon-wenben"></i>
            </div>

            <div class="tool-item"
                @click="triggerImagePick"
                title="导入图片">
                <i class="iconfont1 icon-tupian1"></i>
            </div>
            <!--文件选择器-->
            <input
                ref="imgInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onPickImage"
            ><!--确认选择后触发事件-->

            <div class="tool-divider"></div>

            <div class="tool-item" @click="clearAll" title="清空">
                <i class="iconfont1 icon-qingkong"></i>
            </div>

            <div class="tool-item" @click="onUndo" title="撤销">
                <i class="iconfont1 icon-chexiao"></i>
            </div>

            <div class="tool-item" @click="onRedo" title="重做">
                <i class="iconfont1 icon-zhongzuo"></i>
            </div>

            <div class="tool-item" @click="downloadPNG" title="下载 PNG">
                <i class="iconfont1 icon-xiazai"></i>
            </div>

            <div class="tool-item json-text" @click="downloadJSON" title="下载 JSON">
            JSON
            </div>
        </div>
  </div>
</template>

<script setup>
    import * as PIXI from 'pixi.js'
    import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
    import { usePixiApp } from '../composables/usePixiApp'
    import { useShapeManager } from '../composables/useShapeManager'
    import { createSelectionRenderer } from '../services/SelectionRenderer'
    import { useInteraction } from '../composables/useInteraction'
    import { useHistory } from '../composables/useHistory'
    import { exportPNG, exportShapesJSON } from '../services/ExportService'

    //状态与引用
    const canvasContainer = ref(null) // 画布容器引用
    const activeTool = ref('select') // select|circle|rect|pan|text|triangle
    const imgInput = ref(null) // 图片输入元素引用
    const shapeMenuOpen = ref(false) // 图形工具菜单是否打开

    // 计算属性：判断当前是否为图形工具
    const isShapeTool = computed(() => 
        activeTool.value === 'rect' || 
        activeTool.value === 'circle' || 
        activeTool.value === 'triangle'
    )

    // 统一的 pixi 上下文对象
    const pixi = {
        app: null,
        viewport: null,
        shapesLayer: null,
        tempLayer: null,
        overlayLayer: null,
    }

    let selectionRenderer = null
    let shapeManager = null
    let history = null
    let cleanup = null

    //组件挂载时，初始化 pixi 上下文对象
    onMounted(() => {
        const {
            app,
            viewport,
            shapesLayer,
            tempLayer,
            overlayLayer,
            destroy
        } = usePixiApp(canvasContainer)

        // 统一赋值给 pixi 上下文对象
        pixi.app = app
        pixi.viewport = viewport
        pixi.shapesLayer = shapesLayer
        pixi.tempLayer = tempLayer
        pixi.overlayLayer = overlayLayer

        shapeManager = useShapeManager(shapesLayer)
        selectionRenderer = createSelectionRenderer(viewport, overlayLayer)
        history = useHistory(shapeManager)

        // 初始化交互逻辑
        cleanup = useInteraction({
            app,
            viewport,
            shapesLayer,
            tempLayer,
            overlayLayer,
            shapeManager,
            selectionRenderer,
            activeTool,
            history
        })
        cleanup._destroyPixi = destroy
    })
    // 组件卸载时，清理 pixi 上下文对象
    onBeforeUnmount(() => {
        cleanup?.()
        cleanup?._destroyPixi?.()
    })

    // 监听 activeTool 变化，更新鼠标光标
    watch(activeTool, (tool) => {
        const el = pixi.app?.view
        if (!el) return
        if (tool === 'pan') el.style.cursor = 'grab'
        else if (tool === 'select') el.style.cursor = 'default'
        else el.style.cursor = 'crosshair'
    })

    // 工具切换逻辑
    function setTool(tool) {
        activeTool.value = tool
    }

    function selectShapeTool(type) {
        activeTool.value = type
        shapeMenuOpen.value = false
    }

    // 图片处理逻辑
    function triggerImagePick() {
        imgInput.value?.click()
    }
    // 处理图片选择事件
    async function onPickImage(e) {
        const file = e.target.files?.[0]
        if (!file) return

        e.target.value = ''
        history?.save?.()
        const url = URL.createObjectURL(file)

        if (!pixi.viewport) {
            console.error('[onPickImage] pixi not ready')
            return
        }

        const worldCenter = pixi.viewport.toLocal({ x: pixi.app.screen.width/2, y: pixi.app.screen.height/2 })

        const sprite = await shapeManager.addImage({
            centerX: worldCenter.x,
            centerY: worldCenter.y,
            url,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
        })

        const maxSize = 300
        const texture = sprite.texture
        const scale = Math.min(1, maxSize / Math.max(texture.width, texture.height))
        sprite.scale.set(scale, scale)

        shapeManager.syncDataFromGraphic(sprite)
        selectionRenderer?.show(sprite)
        activeTool.value = 'select'
    }

    // 历史记录 (撤销/重做)
    function onUndo() {
        history?.undo?.()
    }
    function onRedo() {
        history?.redo?.()
    }

    // 全局操作与导出
    function clearAll() {
        history?.save()
        shapeManager?.removeAllShapes()
    }

    function downloadJSON() {
        if (!shapeManager) return
        exportShapesJSON(shapeManager.shapes)
    }

    function downloadPNG() {
        if (!pixi.app || !pixi.viewport) {
            console.error('[downloadPNG] pixi not ready')
            return
        }
        const worldRect = { x: -2500, y: -2500, width: 5000, height: 5000 }
        exportPNG(pixi.app, pixi.viewport, worldRect)
    }
</script>
<style scoped>
/* 页面容器 */
.canvas-page {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

.canvas-wrap {
    position: absolute;
    inset: 0;
    z-index: 0;   /*  确保在最底层 */

    background-color: #ffffff;
    background-image: radial-gradient(rgba(0, 0, 0, 0.216) 1.5px, transparent 1px);
    background-size: 25px 25px;
}

.side-toolbar {
    width: 50px;
    background-color: #ffffff;
    border: 1px solid #dbdbdb;
    border-radius: 8px;
    box-shadow: 0 2px 12px #d4d4d4;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    gap: 3px;
    position: fixed;

    left: 16px;
    top: 80px;
    z-index: 1000;
}

.tool-item {
    width: 40px;
    height: 40px;
    background-color: #ffffff;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 24px;
    color: #333333;
    flex-shrink: 0;
    user-select: none;
}

.tool-item.json-text {
    font-size: 12px;
}

.tool-item:hover {
    background-color: #c1c8c974;
}

.tool-active {
    color: #e90159 !important;
    border-radius: 4px;
}

.tool-divider {
    width: 30px;
    height: 1px;
    background-color: #e90159;
    margin: 8px 0;
}
.shape-wrapper{

    position: relative;
}

.shape-menu{
    position: absolute;
    left: 53px;
    top: -60px;
    width: 50px;
    background: #fff;
    border: 1px solid #dbdbdb;
    border-radius: 10px;
    box-shadow: 0 6px 18px rgba(0,0,0,.12);
    padding: 10px 0;
    z-index: 1200;
}

.shape-menu-item{
    padding: 2px 5px;
    font-size: 24px;
    cursor: pointer;
    user-select: none;
}

.shape-menu-item:hover{
    background: rgba(193,200,201,.45);
}

.shape-menu-item.disabled{
    opacity: .45;
    cursor: not-allowed;
}
</style>
