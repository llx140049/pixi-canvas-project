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
            <input
                ref="imgInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onPickImage"
            >

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
    import * as PIXI from 'pixi.js'//PixiCanvas.vue 只是在“编排/组装”这些模块，不需要自己直接引用 PIXI
    import {ref,onMounted,onBeforeUnmount, watch, computed} from 'vue'
    import {usePixiApp} from '../composables/usePixiApp'
    import {useShapeManager} from '../composables/useShapeManager'
    import {createSelectionRenderer} from '../services/SelectionRenderer'
    import { useInteraction } from '../composables/useInteraction'
    import { useHistory } from '../composables/useHistory'
    import {exportPNG, exportShapesJSON} from '../services/ExportService'

    
    const canvasContainer=ref(null)//画布容器引用
    const activeTool=ref('select')//select|circle|rect|pan|text|triangle

    const imgInput=ref(null)//图片输入元素引用

    const shapeMenuOpen=ref(false)//图形工具菜单是否打开
    //计算属性，判断当前是否为图形工具(computed在检测的对象变化时才重新计算)
    const isShapeTool=computed(()=>activeTool.value==='rect'||activeTool.value==='circle'||activeTool.value==='triangle')

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

    //撤销/重做方法
    function onUndo() {
        history?.undo?.()
    }
    function onRedo() {
        history?.redo?.()
    }

    //选择图形工具
    function selectShapeTool(type){
        activeTool.value=type
        shapeMenuOpen.value=false
    }
    //触发图片选择器点击事件
    function triggerImagePick(){
        imgInput.value?.click()
    }
    //选择图片后插入到画布
    async function onPickImage(e) {
        const file = e.target.files?.[0]
    
        e.target.value = ''

        history?.save?.()

        const url = URL.createObjectURL(file)

        // 插入世界中心（world 坐标）
        if (!pixi.viewport) {
            console.error('[onPickImage] pixi not ready')
            return
        }

        
        const worldCenter = pixi.viewport.toLocal({ x:0, y:0 })
                
        // 创建 sprite（addImage 是 async）
        const sprite = await shapeManager.addImage({
            centerX: worldCenter.x,
            centerY: worldCenter.y,
            url,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
        })

        // 限制图片大小（最大 300px）
        const maxSize = 300
        const texture = sprite.texture
        const w = texture.width
        const h = texture.height
        const scale = Math.min(1, maxSize / Math.max(w, h))
        sprite.scale.set(scale, scale)

        // 同步更新 shapeManager 中的数据
        shapeManager.syncDataFromGraphic(sprite)

        selectionRenderer?.show(sprite)

        // 自动切换到选择模式
        activeTool.value = 'select'
    }

    function setTool(tool){
        activeTool.value=tool
    }
    function clearAll(){
        history?.save()
        shapeManager?.removeAllShapes()//调用形状管理器的移除所有形状方法
        
    }

    onMounted(()=>{//在组件挂载时执行
        const{
            app,
            viewport,
            shapesLayer,
            tempLayer,
            overlayLayer,
            destroy
        }=usePixiApp(canvasContainer)
        //对象解构赋值 ：把 usePixiApp 返回对象里的同名字段直接取出来，变成本地变量
        
        // 统一赋值给 pixi 上下文对象
        pixi.app = app
        pixi.viewport = viewport
        pixi.shapesLayer = shapesLayer
        pixi.tempLayer = tempLayer
        pixi.overlayLayer = overlayLayer

        shapeManager = useShapeManager(shapesLayer)//创建形状管理器实例
        selectionRenderer = createSelectionRenderer(viewport, overlayLayer)
        
        history = useHistory(shapeManager)
        
        //返回清理函数，用于在组件卸载时执行清理操作
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
        cleanup._destroyPixi = destroy//将Pixi应用程序的销毁函数赋值给清理函数的_destroyPixi方法
    })
    
    //下载JSON文件
    function downloadJSON(){
        if(!shapeManager)return
        exportShapesJSON(shapeManager.shapes)
    }
    //下载PNG图片
    function downloadPNG(){
        if(!pixi.app || !pixi.viewport){
            console.error('[downloadPNG] pixi not ready')
            return
        }
        const worldRect={x:-2500,y:-2500,width:5000,height:5000}
        exportPNG(pixi.app, pixi.viewport, worldRect)
    }
    

    //监听activeTool变化，更新鼠标光标
    watch(activeTool,(tool)=>{
        const el=pixi.app?.view
        if(!el) return
        if(tool==='pan')el.style.cursor='grab'
        else if(tool==='select')el.style.cursor='default'
        else el.style.cursor='crosshair'
    })

   

    //在组件卸载时执行
    onBeforeUnmount(()=>{
        cleanup?.()
        cleanup?._destroyPixi?.()
    })
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
