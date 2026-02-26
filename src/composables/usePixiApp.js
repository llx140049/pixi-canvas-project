import*as PIXI from 'pixi.js'
//创建Pixi应用程序,并将其视图添加到容器中
export function usePixiApp(canvasContainerRef){
        
    const app=new PIXI.Application({

        resizeTo:canvasContainerRef.value,//应用程序的视图将自动调整大小以适应容器
        backgroundAlpha:0,
        antialias:true,//开启抗锯齿
        resolution:window.devicePixelRatio||1,
        autoDensity:true,//自动根据设备像素比缩放应用程序
    })
    //画布世界容器，用于缩放和拖动
    const viewport=new PIXI.Container()
    app.stage.addChild(viewport)

    //将视口中心设置为应用程序中心
    viewport.position.set(app.screen.width/2,app.screen.height/2)
    //将应用程序的视图添加到容器中
    canvasContainerRef.value.appendChild(app.view)

    //正式图形层
    const shapesLayer=new PIXI.Container()
    shapesLayer.eventMode='static'//设置为静态事件模式，不响应鼠标事件
    viewport.addChild(shapesLayer)
    //背景层
    const WORLD_SIZE=5000//世界大小
    const worldBig=new PIXI.Graphics()
    worldBig.drawRect(-WORLD_SIZE/2,-WORLD_SIZE/2,WORLD_SIZE,WORLD_SIZE)
    worldBig.eventMode='none'//设置为无事件模式，不响应鼠标事件
    viewport.addChildAt(worldBig,0)//将背景添加到视口的第一个子项，确保它在所有其他图形层下面
    //临时图形层
    const tempLayer=new PIXI.Container()
    tempLayer.eventMode='static'//设置为静态事件模式，不响应鼠标事件
    viewport.addChild(tempLayer)
    //选中框层
    const overlayLayer=new PIXI.Container()
    overlayLayer.eventMode='static'//设置为静态事件模式，不响应鼠标事件
    viewport.addChild(overlayLayer)

    app.stage.eventMode='static'//设置为静态事件模式，不响应鼠标事件
    app.stage.hitArea=app.screen

    function destroy(){
        app.destroy(true)
    }
    return{app,viewport,shapesLayer,tempLayer,overlayLayer,destroy}
    
}
