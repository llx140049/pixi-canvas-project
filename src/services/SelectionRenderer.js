import * as PIXI from 'pixi.js'

export function createSelectionRenderer(viewport,overlayLayer){
    // 创建一个容器用于显示选择框
    const overlay=new PIXI.Container()
    overlayLayer.addChild(overlay)
    // 创建一个矩形用于显示选择框
    const box=new PIXI.Graphics()
    overlay.addChild(box)

    // handles
    const handles = [];
    const handleR = 8;
    //绘制放缩控点
    for (let i = 0; i < 4; i++) {
        const h = new PIXI.Graphics();

        h.clear();
        h.beginFill(0xffffff, 1);
        h.lineStyle(1, 0xE90157, 1);
        h.drawCircle(0, 0, handleR);
        h.endFill();

        // 确保可交互
        h.eventMode = "static";
        h.cursor = "nwse-resize";
        h._type = "resize";

        // 扩大点击范围
        h.hitArea = new PIXI.Circle(0, 0, handleR + 10);

        overlay.addChild(h);
        handles.push(h);
    }

    // 绘制旋转控点
    const rotateHandle = new PIXI.Graphics();
    rotateHandle.beginFill(0xffffff, 1);
    rotateHandle.lineStyle(1, 0xE90157, 1);
    rotateHandle.drawCircle(0, 0, 6);
    rotateHandle.endFill();

    rotateHandle.eventMode = "static";
    rotateHandle.cursor = "crosshair";
    rotateHandle._type = "rotate";
    rotateHandle.hitArea = new PIXI.Circle(0, 0, 6 + 12);

    overlay.addChild(rotateHandle);

    overlay.visible=false//初始时隐藏选择框

    let currentTarget=null//当前选中的图形

    function show(target){
        // 显示选择框
        overlay.visible=true
        currentTarget=target//记录当前选中的图形
        update(target)
    }

    function hide(){
        // 隐藏选择框
        overlay.visible=false
        currentTarget=null
    }
    //判断是否是控点，直接查询是否在 handles 数组中或是否是旋转控点
    function isHandle(target) {
        return handles.includes(target) || target === rotateHandle;
    }
    
    // 更新选择框的位置和大小
    function update(target){
        if(!target)return
        // 得到图形的边界框，包含最左最上方的坐标位置和图形大小（相对于图形中心）
        const bounds = target.getBounds()

        // bounds 是 global 坐标：转成 overlay 的 local
        const p1 = overlay.toLocal(new PIXI.Point(bounds.x, bounds.y))
        const p2 = overlay.toLocal(new PIXI.Point(bounds.x + bounds.width, bounds.y))
        const p3 = overlay.toLocal(new PIXI.Point(bounds.x + bounds.width, bounds.y + bounds.height))
        const p4 = overlay.toLocal(new PIXI.Point(bounds.x, bounds.y + bounds.height))

        // 画框（在 overlay local 坐标系）
        box.clear()
        box.lineStyle(1 / viewport.scale.x, 0xE90157)
        box.moveTo(p1.x, p1.y)
        box.lineTo(p2.x, p2.y)
        box.lineTo(p3.x, p3.y)
        box.lineTo(p4.x, p4.y)
        box.closePath()

        // 四角控点（同样用 overlay local）
        handles[0].position.set(p1.x, p1.y)
        handles[1].position.set(p2.x, p2.y)
        handles[2].position.set(p4.x, p4.y)
        handles[3].position.set(p3.x, p3.y)
        // 旋转控点：用 localBounds（不受缩放影响的原始尺寸） + 像素距离恒定
        const localB = target.getLocalBounds()

        const px = 20
        const offset = px / viewport.scale.x  // 把 20px 换算成 local/world 距离

        // 目标 local 的“顶部中心”再往上 offset
        const localTop = new PIXI.Point(
        localB.x + localB.width / 2,
        localB.y - offset
        )
        // 坐标转换：图形local -> 屏幕global -> overlay local
        const globalTop = target.toGlobal(localTop)
        const p = overlay.toLocal(globalTop)

        rotateHandle.position.set(p.x, p.y)
        const scaleFix=1/viewport.scale.x//缩放修正因子
        // 更新控点的缩放比例
        handles.forEach(handle => {
                handle.scale.set(scaleFix)
            })
        rotateHandle.scale.set(scaleFix)

    }

    return {
        show,
        hide,
        update,
        isHandle,
        handles,
        rotateHandle,
        get target(){return currentTarget},
    }
}