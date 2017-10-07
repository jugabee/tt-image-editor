import { editor } from "./editor";
import * as events from "./event";
import { Tool } from "./tool";
import * as util from "./util";
import { Point, Rect } from "./util";
import { keyMap } from "./key-map";

export interface SprayToolDrawing {
    rects: Array<Rect>,
    composite: string,
    opacity: number,
    color: string
}

export class SprayTool extends Tool {
    private isMousedown: boolean = false;
    private isEraser: boolean = false;
    private sprayTimeout: number | undefined;
    private sprayMouse: Point;
    private readonly DEF_SPRAY_SPEED = 5;
    private readonly DEF_OPACITY = 1;
    private readonly DEF_WIDTH = 4;
    private readonly DEF_COMPOSITE = "source-over";
    tempRects = [];
    composite: string = this.DEF_COMPOSITE;
    opacity: number = this.DEF_OPACITY;
    width: number = this.DEF_WIDTH;

    onDrawing: events.Dispatcher<boolean> = events.Dispatcher.createEventDispatcher();
    onDrawingFinished: events.Dispatcher<SprayToolDrawing> = events.Dispatcher.createEventDispatcher();

    constructor() {
        super();
    }

    handleMousedown(evt): void {
        // prevent drawing if shift key (pan) is active
        if (!keyMap.isPan(evt)) {
            let scale: number = util.getCurrentScale(editor.state.scale);
            let mouse: Point = util.getMousePosition(editor.state.clientRect, evt);
            let p: Point = {
                x: (mouse.x * scale) + editor.state.sx,
                y: (mouse.y * scale) + editor.state.sy
            }
            this.sprayMouse = p;
            this.isMousedown = true;
            this.drawSprayBrush();
        }
    }

    handleMousemove(evt): void {
        if (this.isMousedown) {
            let scale: number = util.getCurrentScale(editor.state.scale);
            let mouse: Point = util.getMousePosition(editor.state.clientRect, evt);
            let p: Point = {
                x: (mouse.x * scale) + editor.state.sx,
                y: (mouse.y * scale) + editor.state.sy
            };
            this.sprayMouse = p;
        }
    }

    handleMouseup(evt): void {
        if (this.tempRects.length > 0) {
            let history: SprayToolDrawing = {
                rects: this.tempRects,
                composite: this.composite,
                opacity: this.opacity,
                color: util.colorToString(editor.state.color, this.opacity)
            }
            this.onDrawingFinished.emit({ data: history });
        }
        this.tempRects = [];
        clearTimeout(this.sprayTimeout);
        this.isMousedown = false;
    }

    draw(): void { }

    init(): void { }

    private drawSprayBrush(): void {
        if (this.isEraser) {
            this.composite = "destination-out";
        } else {
            this.composite = "source-over";
        }
        // Adapted from: http://perfectionkills.com/exploring-canvas-drawing-techniques/
        this.sprayTimeout = setTimeout(() =>
            {
                for (let i = this.width / 2; i > 0; i--) {
                    let angle: number = util.getRandomFloat(0, Math.PI * 2);
                    let radius: number = util.getRandomFloat(0, this.width);
                    let side: number = util.getRandomFloat(1, 2);
                    let rect: Rect = {
                        x: this.sprayMouse.x + radius * Math.cos(angle),
                        y: this.sprayMouse.y + radius * Math.sin(angle),
                        w: side, h: side
                    };
                    this.tempRects.push(rect);
                    editor.drawingCtx.fillStyle = util.colorToString(editor.state.color, this.opacity);
                    editor.drawingCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
                }
                this.onDrawing.emit({ data: true });
                if (!this.sprayTimeout) return;
                this.drawSprayBrush();
            }, this.DEF_SPRAY_SPEED);
    }

    drawFromHistory(drawing: SprayToolDrawing): void {
        let rects = drawing.rects;
        editor.memoryCtx.globalCompositeOperation = drawing.composite;
        for (let i = 0; i < rects.length; i++) {
            editor.memoryCtx.fillStyle = drawing.color;
            editor.memoryCtx.fillRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
        }
    }

    setOpacity(opacity: number): void {
        this.opacity = opacity;
    }

    setLineWidth(width: number): void {
        this.width = width;
    }

    setEraser(isEraser: boolean): void {
        this.isEraser = isEraser;
    }

    getComposite(): string {
        return this.composite;
    }

}

export let sprayTool = new SprayTool();
