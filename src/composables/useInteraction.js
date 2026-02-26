import * as PIXI from "pixi.js";

export function useInteraction({

  app,
	viewport,
	shapesLayer,
	tempLayer,
	selectionRenderer, // 可以传，也可以先不用（传了就 show/hide）
	shapeManager,
	activeTool,
	history, // 可选：有就 save()
}) {
	const state = {
		mode: "idle", // idle | drawing | dragging | panning | resizing | rotating
		drawType: null,
		tempGraphic: null,
		startPoint: null,
		selected: null,
		dragOffset: null,
		panStart: null,
		viewportStart: null,
		// resize/rotate
		startDistance: null,
		startScaleX: null,
		startScaleY: null,
		startAngle: null,
		startRotation: null,
	};

	  // 双击检测
	  let lastTapTime = 0;
	  let lastTapTarget = null;

	  function isDoubleTap(target) {
		    const now = performance.now();
		    const ok = (now - lastTapTime) < 280 && target === lastTapTarget;
		    lastTapTime = now;
	  	  lastTapTarget = target;
  	  	return ok;
	  }

	    app.stage.eventMode = "static";
	    app.stage.hitArea = app.screen;

    // 把 Pixi 事件的坐标，转成视口内的世界坐标
    function worldPointFromPixiEvent(e) {
  		  return viewport.toLocal(e.global);
    }

	  // 从命中的任意 target 往上找，找到真正的 shape（挂了 _shapeType 的）
	  function findShapeTarget(target) {
		    let t = target;
        //沿着 parent 一直向上找，但到 shapesLayer 或 stage 就停止
  		  while (t && t !== shapesLayer && t !== app.stage) {
	  		if (t._shapeType) return t;//真正的 shape 节点 会挂一个 _shapeType 字段
		  	t = t.parent;//没找到，继续往父级爬
		}
		return null;
	}

	function beginTemp() {
		state.tempGraphic?.destroy?.();
		state.tempGraphic = new PIXI.Graphics();
		tempLayer.addChild(state.tempGraphic);
	}

	function clearTemp() {
		state.tempGraphic?.destroy?.();
		state.tempGraphic = null;
	}

	function reset() {
		state.mode = "idle";
		state.drawType = null;
		state.startPoint = null;
		state.selected = null;
		state.dragOffset = null;
		state.panStart = null;
		state.viewportStart = null;
		state.startDistance = null;
		state.startScaleX = null;
		state.startScaleY = null;
		state.startAngle = null;
		state.startRotation = null;
		clearTemp();
	}

	// 捕获鼠标事件（防止甩出画布时丢失）
	let captureOn = false;

	// 把 DOM 事件的坐标，转成 Pixi 的 screen 坐标
	function domToPixiGlobal(ev) {
		const view = app.view;
		const rect = view.getBoundingClientRect();

		// 鼠标在 canvas 内的 CSS 像素坐标
		const cssX = ev.clientX - rect.left;
		const cssY = ev.clientY - rect.top;

		// 转成 Pixi 的 screen 坐标（考虑 autoDensity / DPR）
		const sx = app.screen.width / rect.width;
		const sy = app.screen.height / rect.height;

		return new PIXI.Point(cssX * sx, cssY * sy);
	}

	// 捕获鼠标移动事件
	function onCaptureMove(ev) {
		const global = domToPixiGlobal(ev);
		app.stage.emit("pointermove", { global, pointerId: ev.pointerId });
	}

	// 捕获鼠标松开事件 
	function onCaptureUp(ev) {
		const global = domToPixiGlobal(ev);
		app.stage.emit("pointerup", { global, pointerId: ev.pointerId });
		stopCapture();
	}

	function startCapture() {

		if (captureOn) return;
		captureOn = true;
		window.addEventListener("pointermove", onCaptureMove);
		window.addEventListener("pointerup", onCaptureUp, { once: true });
	}

	function stopCapture() {
		if (!captureOn) return;
		captureOn = false;
		window.removeEventListener("pointermove", onCaptureMove);
		window.removeEventListener("pointerup", onCaptureUp);
	}

	function finishDraw() {
		if (state.mode !== "drawing" || !state.tempGraphic?._meta) {
			reset();
			return;
		}

		history?.save?.();

		const m = state.tempGraphic._meta;
		if (m.type === "circle") shapeManager.addCircle(m);
		if (m.type === "rect") shapeManager.addRect(m);
		if (m.type === "triangle") shapeManager.addTriangle(m);

		reset();
	}

	app.stage.on("pointerdown", async (e) => {
		const tool = activeTool.value;
		const p = worldPointFromPixiEvent(e);

		// 1) 点击控点：进入 resize/rotate
		if (selectionRenderer?.isHandle?.(e.target)) {
			const target = selectionRenderer.target;
			if (!target) return;

			history?.save?.();//便于后续缩放/旋转后可以撤销
			state.selected = target;

			// 记录起点（world）
			if (e.target._type === "resize") {
				state.mode = "resizing";
				state.startDistance = Math.hypot(p.x - target.x, p.y - target.y);
				state.startScaleX = target.scale.x;
				state.startScaleY = target.scale.y;
			} else if (e.target._type === "rotate") {
				state.mode = "rotating";
				state.startAngle = Math.atan2(p.y - target.y, p.x - target.x);
				state.startRotation = target.rotation;
			}

			// 捕获：鼠标甩出控点也不中断
			startCapture();
			e.stopPropagation();
			return;
		}

		// 选择工具：点中就开始拖
		if (tool === "select") {
			const hit = findShapeTarget(e.target);
			if (!hit) {
				state.selected = null;
				selectionRenderer?.hide?.();
				reset();
				return;
			}

			// 双击文字：prompt 编辑
			if (hit._shapeType === "text" && isDoubleTap(hit)) {
				const oldText = hit.text ?? "";
				const newText = window.prompt("编辑文字", oldText);

				if (newText !== null) {
					history?.save?.();
					hit.text = newText;
					shapeManager.syncDataFromGraphic(hit);
					selectionRenderer?.update?.(hit);
				}
				return;
			}

			history?.save?.();

			state.mode = "dragging";
			state.selected = hit;
			state.dragOffset = { x: hit.x - p.x, y: hit.y - p.y };
			selectionRenderer?.show?.(hit);
			return;
		}

		// 平移工具
		if (tool === "pan") {
			selectionRenderer?.hide?.();
			state.mode = "panning";
			state.panStart = { x: e.global.x, y: e.global.y };
			state.viewportStart = { x: viewport.x, y: viewport.y };
			return;
		}

		// 文字工具：单击放置文字
		if (tool === "text") {
			history?.save?.();
			const text = shapeManager.addText({
				centerX: p.x,
				centerY: p.y,
				text: "点选择进行编辑",
				fontSize: 24,
				fill: 0x000000,
			});
			selectionRenderer?.show?.(text);
			reset();
			return;
		}

		// 图形绘制
		if (tool === "circle" || tool === "rect" || tool === "triangle") {
			selectionRenderer?.hide?.();
			state.mode = "drawing";
			state.drawType = tool;
			state.startPoint = p;
			beginTemp();
			return;
		}
	});

	app.stage.on("pointermove", (e) => {
		const p = worldPointFromPixiEvent(e);

		if (state.mode === "drawing") {
			if (!state.tempGraphic || !state.startPoint) return;

			const dx = p.x - state.startPoint.x;
			const dy = p.y - state.startPoint.y;

			state.tempGraphic.clear();
			state.tempGraphic.lineStyle(2 / viewport.scale.x, 0xE90157, 1);

			if (state.drawType === "circle") {
				const radius = Math.sqrt(dx * dx + dy * dy);
				state.tempGraphic.drawCircle(0, 0, radius);
				state.tempGraphic.position.set(state.startPoint.x, state.startPoint.y);
				state.tempGraphic._meta = {
					type: "circle",
					x: state.startPoint.x,
					y: state.startPoint.y,
					radius,
				};
			}

			if (state.drawType === "rect") {
				const x1 = state.startPoint.x;
				const y1 = state.startPoint.y;
				const x2 = p.x;
				const y2 = p.y;
				const centerX = (x1 + x2) / 2;
				const centerY = (y1 + y2) / 2;
				const width = Math.abs(x2 - x1);
				const height = Math.abs(y2 - y1);

				state.tempGraphic.drawRect(-width / 2, -height / 2, width, height);
				state.tempGraphic.position.set(centerX, centerY);
				state.tempGraphic._meta = {
					type: "rect",
					centerX,
					centerY,
					width,
					height,
				};
			}

			if (state.drawType === "triangle") {
				const x1 = state.startPoint.x;
				const y1 = state.startPoint.y;
				const x2 = p.x;
				const y2 = p.y;
				const centerX = (x1 + x2) / 2;
				const centerY = (y1 + y2) / 2;
				const width = Math.abs(x2 - x1);
				const height = Math.abs(y2 - y1);

				// 绘制三角形：顶点、左下、右下
				state.tempGraphic.moveTo(0, -height / 2);
				state.tempGraphic.lineTo(-width / 2, height / 2);
				state.tempGraphic.lineTo(width / 2, height / 2);
				state.tempGraphic.closePath();

				state.tempGraphic.position.set(centerX, centerY);
				state.tempGraphic._meta = {
					type: "triangle",
					centerX,
					centerY,
					width,
					height,
				};
			}
			return;
		}

		if (state.mode === "dragging") {
			if (!state.selected) return;
			state.selected.position.set(p.x + state.dragOffset.x, p.y + state.dragOffset.y);
			selectionRenderer?.update?.(state.selected);
			return;
		}

		if (state.mode === "panning") {
			const dx = e.global.x - state.panStart.x;
			const dy = e.global.y - state.panStart.y;
			viewport.position.set(state.viewportStart.x + dx, state.viewportStart.y + dy);
			selectionRenderer?.target && selectionRenderer.update?.(selectionRenderer.target);
			return;
		}

		if (state.mode === "resizing") {
			const t = state.selected;
			if (!t) return;

			const d = Math.hypot(p.x - t.x, p.y - t.y);
			const ratio = Math.max(0.1, d / state.startDistance);

			t.scale.set(state.startScaleX * ratio, state.startScaleY * ratio);
			selectionRenderer?.update?.(t);
			return;
		}

		if (state.mode === "rotating") {
			const t = state.selected;
			if (!t) return;

			const a = Math.atan2(p.y - t.y, p.x - t.x);
			t.rotation = state.startRotation + (a - state.startAngle);
			selectionRenderer?.update?.(t);
			return;
		}
	});

	app.stage.on("pointerup", () => {
		if (state.mode === "drawing") {
			finishDraw();
			return;
		}

		if (state.mode === "dragging" || state.mode === "resizing" || state.mode === "rotating") {
			if (state.selected) shapeManager.syncDataFromGraphic(state.selected);
			stopCapture?.();
			reset();
			return;
		}

		if (state.mode === "panning") {
			reset();
		}
	});

	// 双击文字编辑（无论啥工具，只要双击到 text）
	app.stage.on("pointertap", (e) => {
		const hit = findShapeTarget(e.target);
		if (!hit || hit._shapeType !== "text") return;
		if (e.detail !== 2) return;

		const oldText = hit.text;
		const newText = window.prompt("编辑文字", oldText);
		if (newText === null) return;

		history?.save?.();
		hit.text = newText;
		shapeManager.syncDataFromGraphic(hit);
		selectionRenderer?.show?.(hit);
	});

	// 清理事件监听
	return function cleanup() {
		app.stage.removeAllListeners();
		clearTemp();
	};
}
