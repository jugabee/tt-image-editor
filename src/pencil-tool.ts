import { editor } from "./editor";
import * as events from "./event";
import { Tool } from "./tool";
import * as util from "./util";
import { Point, Color } from "./util";

export interface PencilToolDrawing {
    points: Array<Point>,
    width: number,
    composite: string,
    opacity: number,
    color: string
}

class PencilTool extends Tool {
    private points: Array<Point> = [];
    private isMousedown: boolean = false;
    private isMousedrag: boolean = false;
    private isEraser: boolean = false;
    private readonly DEF_OPACITY = 1;
    private readonly DEF_WIDTH = 4;
    private readonly DEF_COMPOSITE = "source-over";
    private readonly DEF_LINE_CAP = "round";
    private readonly DEF_LINE_JOIN = "round";
    composite: string = this.DEF_COMPOSITE;
    opacity: number = this.DEF_OPACITY;
    width: number = this.DEF_WIDTH;

    onDrawing: events.Dispatcher<boolean> = events.Dispatcher.createEventDispatcher();
    onDrawingFinished: events.Dispatcher<PencilToolDrawing> = events.Dispatcher.createEventDispatcher();
    onColorSampled: events.Dispatcher<string> = events.Dispatcher.createEventDispatcher();

    constructor() {
        super();
    }

    handleMousedown(evt): void {
        let scale: number = util.getCurrentScale(editor.state.scale);
        let mouse: Point = util.getMousePosition(editor.state.clientRect, evt);
        let p: Point = {
            x: (mouse.x * scale) + editor.state.sx,
            y: (mouse.y * scale) + editor.state.sy
        }
        this.isMousedown = true;
        this.points.push(p);
    }

    handleMousemove(evt): void {
        if (this.isMousedown) {
            let scale: number = util.getCurrentScale(editor.state.scale);
            let mouse: Point = util.getMousePosition(editor.state.clientRect, evt);
            let p: Point = {
                x: (mouse.x * scale) + editor.state.sx,
                y: (mouse.y * scale) + editor.state.sy
            };
            this.isMousedrag = true;
            this.points.push(p);
            this.drawPencil();
            this.onDrawing.emit({ data: true });
        }
    }

    handleMouseup(evt): void {
        if (this.points.length > 1) {
            let history: PencilToolDrawing = {
                points: this.points,
                width: this.width,
                composite: this.composite,
                opacity: this.opacity,
                color: util.colorToString(editor.state.color, this.opacity)
            }
            this.onDrawingFinished.emit({ data: history });
        }
        this.points = [];
        this.isMousedown = false;
        this.isMousedrag = false;
    }

    draw(): void { }

    init(): void { }

    drawPencil(): void {
        if (this.isEraser) {
            this.composite = "destination-out";
        } else {
            this.composite = "source-over";
        }
        let p1 = this.points[0];
        let p2 = this.points[1];
        editor.drawingCtx.lineWidth = this.width;
        editor.drawingCtx.strokeStyle = util.colorToString(editor.state.color, this.opacity);
        editor.drawingCtx.lineJoin = this.DEF_LINE_JOIN;
        editor.drawingCtx.lineCap = this.DEF_LINE_CAP;
        editor.drawingCtx.clearRect(0, 0, editor.drawingCtx.canvas.width, editor.drawingCtx.canvas.height);
        editor.drawingCtx.beginPath();
        editor.drawingCtx.moveTo(p1.x, p1.y);
        // Adapted from: http://perfectionkills.com/exploring-canvas-drawing-techniques/
        for (let i = 1, len = this.points.length; i < len; i++) {
            let midPoint = util.midpoint(p1, p2);
            editor.drawingCtx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = this.points[i];
            p2 = this.points[i+1];
        }
        editor.drawingCtx.lineTo(p1.x, p1.y);
        editor.drawingCtx.stroke();
    }

    drawFromHistory(drawing: PencilToolDrawing): void {
        let p1 = drawing.points[0];
        let p2 = drawing.points[1];
        editor.memoryCtx.globalCompositeOperation = drawing.composite;
        editor.memoryCtx.lineWidth = drawing.width;
        editor.memoryCtx.lineJoin = this.DEF_LINE_JOIN;
        editor.memoryCtx.lineCap = this.DEF_LINE_CAP;
        editor.memoryCtx.strokeStyle = drawing.color;

        editor.memoryCtx.beginPath();
        editor.memoryCtx.moveTo(p1.x, p1.y);
        for (let i = 1, len = drawing.points.length; i < len; i++) {
            let midPoint = util.midpoint(p1, p2);
            editor.memoryCtx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = drawing.points[i];
            p2 = drawing.points[i+1];
        }
        editor.memoryCtx.lineTo(p1.x, p1.y);
        editor.memoryCtx.stroke();
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

export let pencilTool = new PencilTool();
