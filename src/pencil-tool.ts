import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { Point, Direction } from "./util";
import { EditorState } from "./editor";

export class PencilTool extends Tool{
    private editorState: EditorState;
    private pencilCanvas: HTMLCanvasElement;
    private pencilCtx: CanvasRenderingContext2D;
    private points: Array<Point> = [];
    private lastMousedown: Point = { x: 0, y: 0 };
    private isMousedown: boolean = false;
    private isMousedrag: boolean = false;
    private readonly DEF_STROKE = "black";
    private readonly DEF_RESET_FILL = "white";
    private readonly DEF_LINE_WIDTH = 5;
    private readonly DEF_LINE_CAP = "round";
    private readonly DEF_LINE_JOIN = "round";
    private debug: boolean = false;

    onPencilDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor(state: EditorState, canvas: HTMLCanvasElement) {
        super();
        this.editorState = state;
        this.pencilCanvas = canvas;
        this.pencilCtx = this.pencilCanvas.getContext("2d");
    }

    handleMousedown(evt): void {
        let scale = Util.getCurrentScale(this.editorState.scale);
        let mouse = Util.getMousePosition(this.editorState.clientRect, evt);
        this.isMousedown = true;
        if (!evt.altKey) {
            let p: Point = {
                x: (mouse.x * scale) + this.editorState.sx + this.editorState.cropX,
                y: (mouse.y * scale) + this.editorState.sy + this.editorState.cropY
            }
            this.points.push(p)
            this.lastMousedown = p;
        }
    }

    handleMousemove(evt): void {
        let p: Point;
        let scale = Util.getCurrentScale(this.editorState.scale);
        let mouse = Util.getMousePosition(this.editorState.clientRect, evt);
        if (this.isMousedown && !evt.altKey) {
            this.isMousedrag = true;
                p = {
                    x: (mouse.x * scale) + this.editorState.sx + this.editorState.cropX,
                    y: (mouse.y * scale) + this.editorState.sy + this.editorState.cropY
                }
            this.points.push(p)
            this.draw();
            this.onPencilDrawing.emit({ data: true });
        }
    }

    handleMouseup(evt): void {
        this.points = [];
        this.onPencilDrawingFinished.emit({ data: true });
        this.isMousedown = false;
        this.isMousedrag = false;
    }

    draw(): void {
        let p1 = this.points[0];
        let p2 = this.points[1];
        this.pencilCtx.lineWidth = this.DEF_LINE_WIDTH;
        this.pencilCtx.strokeStyle = this.DEF_STROKE;
        this.pencilCtx.lineJoin = this.DEF_LINE_JOIN;
        this.pencilCtx.lineCap = this.DEF_LINE_CAP;
        this.pencilCtx.clearRect(0, 0, this.pencilCtx.canvas.width, this.pencilCtx.canvas.height);
        this.pencilCtx.beginPath();
        this.pencilCtx.moveTo(p1.x, p1.y);
        for (let i = 1, len = this.points.length; i < len; i++) {
            // we pick the point between pi+1 & pi+2 as the
            // end point and p1 as our control point
            let midPoint = Util.midpoint(p1, p2);
            this.pencilCtx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = this.points[i];
            p2 = this.points[i+1];
        }
        // Draw last line as a straight line while
        // we wait for the next point to be able to calculate
        // the bezier control point
        this.pencilCtx.lineTo(p1.x, p1.y);
        this.pencilCtx.stroke();
    }

    init(): void { }

}
