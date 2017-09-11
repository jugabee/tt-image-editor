import { editor } from "./editor";
import * as Events from "./event";
import { Tool } from "./tool";
import * as util from "./util";
import { Point, Color } from "./util";

class PencilTool extends Tool{
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

    onDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onColorSampled: Events.Dispatcher<string> = Events.Dispatcher.createEventDispatcher();

    constructor() {
        super();
    }

    handleMousedown(evt): void {
        if (!evt.altKey) {
            let scale: number = util.getCurrentScale(editor.state.scale);
            let mouse: Point = util.getMousePosition(editor.state.clientRect, evt);
            let p: Point = {
                x: (mouse.x * scale) + editor.state.sx,
                y: (mouse.y * scale) + editor.state.sy
            }
            this.isMousedown = true;
            if (this.isEraser) {
                this.composite = "destination-out";
            } else {
                this.composite = "source-over";
            }
            this.points.push(p);
        }
    }

    handleMousemove(evt): void {
        if (!evt.altKey && this.isMousedown) {
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
            this.onDrawingFinished.emit({ data: true });
        }
        this.points = [];
        this.isMousedown = false;
        this.isMousedrag = false;
    }

    draw(): void { }

    init(): void { }

    drawPencil(): void {
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
