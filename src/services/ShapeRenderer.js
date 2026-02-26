import * as PIXI from "pixi.js";

// 统一：可交互
function makeInteractive(displayObject) {
  displayObject.eventMode = "static";
  displayObject.cursor = "pointer";
  return displayObject;
}

export function drawCircle(container, data) {
  const g = makeInteractive(new PIXI.Graphics());
  g._shapeType = "circle";
  g._data = { ...data };

  redrawCircle(g, data);
  g.position.set(data.x, data.y);

  // 关键：命中区域（否则只有描边很难点中）
  g.hitArea = new PIXI.Circle(0, 0, data.radius);

  container.addChild(g);
  return g;
}

export function redrawCircle(g, data) {
  g.clear();

  const stroke = data.stroke ?? 0x0000ff;
  const strokeWidth = data.strokeWidth ?? 2;
  const fill = data.fill ?? null;

  g.beginFill(fill ?? 0xffffff, 0.1);//
  g.lineStyle(strokeWidth, stroke, 1);
  g.drawCircle(0, 0, data.radius);
  g.endFill();
}

export function drawRect(container, data) {
  const g = makeInteractive(new PIXI.Graphics());
  g._shapeType = "rect";
  g._data = { ...data };

  redrawRect(g, data);
  g.position.set(data.centerX, data.centerY);

  // 关键：命中区域
  g.hitArea = new PIXI.Rectangle(-data.width / 2, -data.height / 2, data.width, data.height);

  container.addChild(g);
  return g;
}

export function redrawRect(g, data) {
  g.clear();

  const stroke = data.stroke ?? 0x0000ff;
  const strokeWidth = data.strokeWidth ?? 2;
  const fill = data.fill ?? null;

  g.beginFill(fill ?? 0xffffff, fill ? 0.12 : 0.001);
  g.lineStyle(strokeWidth, stroke, 1);
  g.drawRect(-data.width / 2, -data.height / 2, data.width, data.height);
  g.endFill();
}

export function drawText(container, data) {
  const style = new PIXI.TextStyle({
    fontSize: data.fontSize ?? 24,
    fill: data.fill ?? 0x000000,
    fontWeight: data.bold ? "700" : "400",
    fontStyle: data.italic ? "italic" : "normal",
  });

  const t = new PIXI.Text(data.text ?? "点选择进行编辑", style);
  makeInteractive(t);

  t._shapeType = "text";
  t._data = { ...data };

  // 关键：居中锚点，避免"看起来偏移"
  t.anchor.set(0.5);
  t.position.set(data.centerX, data.centerY);

  container.addChild(t);
  return t;
}

export async function drawImage(container, data) {
  // data.url: objectURL / http url
  const tex = PIXI.Texture.from(data.url);

  if (!tex.baseTexture.valid) {
    await new Promise((resolve) => tex.baseTexture.once("loaded", resolve));
  }

  const sp = new PIXI.Sprite(tex);
  makeInteractive(sp);

  sp._shapeType = "image";
  sp._data = { ...data };

  sp.anchor.set(0.5);
  sp.position.set(data.centerX, data.centerY);
  sp.scale.set(data.scaleX ?? 1, data.scaleY ?? 1);
  sp.rotation = data.rotation ?? 0;

  container.addChild(sp);
  return sp;
}

export function drawTriangle(container, data) {
  const g = makeInteractive(new PIXI.Graphics());
  g._shapeType = "triangle";
  g._data = { ...data };

  redrawTriangle(g, data);
  g.position.set(data.centerX, data.centerY);

  // 关键：命中区域（使用多边形）
  const halfW = data.width / 2;
  const halfH = data.height / 2;
  g.hitArea = new PIXI.Polygon([
    0, -halfH,           // 顶点
    -halfW, halfH,       // 左下
    halfW, halfH         // 右下
  ]);

  container.addChild(g);
  return g;
}

export function redrawTriangle(g, data) {
  g.clear();

  const stroke = data.stroke ?? 0x000000;
  const strokeWidth = data.strokeWidth ?? 2;
  const fill = data.fill ?? null;

  const halfW = data.width / 2;
  const halfH = data.height / 2;

  g.beginFill(fill ?? 0xffffff, fill ? 0.12 : 0.001);
  g.lineStyle(strokeWidth, stroke, 1);

  // 绘制三角形：顶点、左下、右下
  g.moveTo(0, -halfH);
  g.lineTo(-halfW, halfH);
  g.lineTo(halfW, halfH);
  g.closePath();

  g.endFill();
}
