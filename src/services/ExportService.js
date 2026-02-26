import * as PIXI from 'pixi.js'


// 下载 Blob 数据
function downloadBlob(blob,filename){
    const url=URL.createObjectURL(blob)//创建一个指向 Blob 对象的 URL
    const a=document.createElement('a')//创建一个 <a> 元素
    a.href=url//设置 <a> 元素的 href 属性为 Blob URL
    a.download=filename//设置 <a> 元素的 download 属性为文件名
    a.click()//模拟点击 <a> 元素，触发下载
    URL.revokeObjectURL(url)//释放 Blob URL，避免内存泄漏
}

// 下载文本数据
function downloadText(text,filename){
    // 创建一个 Blob 对象，包含文本数据
    const blob=new Blob([text],{type:'application/json;charset=utf-8'})
    downloadBlob(blob,filename)
}

//导出shapesJSON
export function exportShapesJSON(shapes){
    // 转换 shapes 数据为 JSON 格式
    const payload=shapes.map(s=>({
        id:s.id,
        type:s.type,
        data:s.data,
    }))
    // 下载 JSON 数据
    downloadText(JSON.stringify({version:1,shapes:payload},null,2),'canvas.json')

}

//导出PNG
export async function exportPNG(app,viewport,worldRect){
    if (!app?.renderer || !viewport) {
    console.error('[exportPNG] invalid args')
    return
  }
    // 渲染应用到 RenderTexture
    const rt=PIXI.RenderTexture.create({
        width:worldRect.width,
        height:worldRect.height,//
        resolution:1,//分辨率，默认1
    })

    // 把 viewport 的位置、缩放、旋转、轴心点都“记录”下来
    const oldPos=viewport.position.clone()
    const oldScale=viewport.scale.clone()
    const oldRot=viewport.rotation

    //重置transform
    viewport.position.set(-worldRect.x,-worldRect.y)
    viewport.scale.set(1,1)
    viewport.rotation=0

    //渲染到 RenderTexture
    app.renderer.render(viewport,{renderTexture:rt,clear:true})

    // 把 viewport 放回原来的位置、缩放、旋转、轴心点
    viewport.position.copyFrom(oldPos)
    viewport.scale.copyFrom(oldScale)
    viewport.rotation=oldRot

    //导出为base64
    const canvas=app.renderer.extract.canvas(rt)
    rt.destroy(true)//销毁 RenderTexture

    canvas.toBlob(blob=>{
        if(!blob)return
        downloadBlob(blob,'canvas.png')
    },'image/png')

}
