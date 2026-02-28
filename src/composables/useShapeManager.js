import { drawCircle, drawRect, drawText, drawImage, drawTriangle, redrawCircle, redrawRect, redrawTriangle } from "../services/ShapeRenderer.js";

export function useShapeManager(container) {
  const shapes = []; // {id,type,data,graphic}

  function addCircle(m) {
    const id = Date.now();
    const data = {
      x: m.x,
      y: m.y,
      radius: m.radius,
      stroke: 0x000000,
      strokeWidth: 2,
      fill: null,
      ...m,
    };
    const graphic = drawCircle(container, data);
    shapes.push({ id, type: "circle", data, graphic });
    return graphic;
  }

  function addRect(m) {
    const id = Date.now();
    const data = {
      centerX: m.centerX,
      centerY: m.centerY,
      width: m.width,
      height: m.height,
      stroke: 0x000000,
      strokeWidth: 2,
      fill: null,
      ...m,
    };
    const graphic = drawRect(container, data);
    shapes.push({ id, type: "rect", data, graphic });
    return graphic;
  }

  function addTriangle(m) {
    const id = Date.now();
    const data = {
      centerX: m.centerX,
      centerY: m.centerY,
      width: m.width,
      height: m.height,
      stroke: 0x000000,
      strokeWidth: 2,
      fill: null,
      ...m,
    };
    const graphic = drawTriangle(container, data);
    shapes.push({ id, type: "triangle", data, graphic });
    return graphic;
  }

  function addText(m) {
    const id = Date.now();
    const data = {
      centerX: m.centerX,
      centerY: m.centerY,
      text: m.text ?? "双击编辑",
      fontSize: m.fontSize ?? 24,
      fill: m.fill ?? 0x000000,
      bold: !!m.bold,
      italic: !!m.italic,
      ...m,
    };
    const graphic = drawText(container, data);
    shapes.push({ id, type: "text", data, graphic });
    return graphic;
  }

  // 注意：drawImage 是 async
  async function addImage(m) {
    const id = Date.now();
    const data = {
      centerX: m.centerX,
      centerY: m.centerY,
      url: m.url,
      scaleX: m.scaleX ?? 1,
      scaleY: m.scaleY ?? 1,
      rotation: m.rotation ?? 0,
      ...m,
    };
    const graphic = await drawImage(container, data);
    shapes.push({ id, type: "image", data, graphic });
    return graphic;
  }

  function removeAllShapes() {
    shapes.forEach((s) => s.graphic?.destroy?.());
    shapes.length = 0;
  }

  // 拖动 / 旋转 / 缩放后，把 graphic 的状态写回 data
  function syncDataFromGraphic(graphic) {
    const s = shapes.find((x) => x.graphic === graphic);
    if (!s) return;

    if (s.type === "circle") {
      s.data.x = graphic.x;
      s.data.y = graphic.y;
      // 半径不变
      redrawCircle(graphic, s.data);
    } else if (s.type === "rect") {
      s.data.centerX = graphic.x;
      s.data.centerY = graphic.y;
      // width/height 不变
      redrawRect(graphic, s.data);
    } else if (s.type === "triangle") {
      s.data.centerX = graphic.x;
      s.data.centerY = graphic.y;
      // width/height 不变
      redrawTriangle(graphic, s.data);
    } else if (s.type === "text") {
      s.data.centerX = graphic.x;
      s.data.centerY = graphic.y;
      s.data.text = graphic.text;
      s.data.fontSize = graphic.style.fontSize; // 同步新的字体大小
    } else if (s.type === "image") {
      s.data.centerX = graphic.x;
      s.data.centerY = graphic.y;
      s.data.scaleX = graphic.scale.x;
      s.data.scaleY = graphic.scale.y;
      s.data.rotation = graphic.rotation;
    }
  }

  return {
    shapes,
    addCircle,
    addRect,
    addTriangle,
    addText,
    addImage,
    removeAllShapes,
    syncDataFromGraphic,
  };
}
