import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { Point, Direction } from "./util";
import { EditorState } from "./editor";
import { ToolbarState, PencilToolSize } from "./toolbar";

export class PencilTool extends Tool{
    private editorState: EditorState;
    private toolbarState: ToolbarState;
    private pencilCanvas: HTMLCanvasElement;
    private pencilCtx: CanvasRenderingContext2D;
    private viewCanvas: HTMLCanvasElement;
    private viewCtx: CanvasRenderingContext2D;
    private points: Array<Point> = [];
    private color: string = "rgba(0, 0, 0, 1)";
    private isMousedown: boolean = false;
    private isMousedrag: boolean = false;
    private readonly DEF_RESET_FILL = "white";
    private readonly DEF_LINE_WIDTH = 2;
    private readonly DEF_LINE_CAP = "round";
    private readonly DEF_LINE_JOIN = "round";
    private debug: boolean = false;

    onPencilDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onColorSampled: Events.Dispatcher<string> = Events.Dispatcher.createEventDispatcher();

    constructor(editorState: EditorState, toolbarState: ToolbarState, pencilCanvas: HTMLCanvasElement, viewCanvas: HTMLCanvasElement) {
        super();
        this.editorState = editorState;
        this.toolbarState = toolbarState;
        this.pencilCanvas = pencilCanvas;
        this.viewCanvas = viewCanvas;
        this.viewCtx = this.viewCanvas.getContext("2d");
        this.pencilCtx = this.pencilCanvas.getContext("2d");
    }

    handleMousedown(evt): void {
        if (!evt.altKey) {
            let scale = Util.getCurrentScale(this.editorState.scale);
            let mouse = Util.getMousePosition(this.editorState.clientRect, evt);
            let p: Point = {
                x: (mouse.x * scale) + this.editorState.sx,
                y: (mouse.y * scale) + this.editorState.sy
            }
            this.isMousedown = true;
            if(evt.ctrlKey || evt.metaKey) {
                this.sampleColorAtPixel(mouse);
            } else {
                this.points.push(p)
            }
        }
    }

    handleMousemove(evt): void {
        if (!evt.altKey && this.isMousedown) {
            let p: Point;
            let scale = Util.getCurrentScale(this.editorState.scale);
            let mouse = Util.getMousePosition(this.editorState.clientRect, evt);
            this.isMousedrag = true;
            if (evt.ctrlKey || evt.metaKey) {
                this.sampleColorAtPixel(mouse);
            } else {
                p = {
                    x: (mouse.x * scale) + this.editorState.sx,
                    y: (mouse.y * scale) + this.editorState.sy
                }
                this.points.push(p)
                this.draw();
                this.onPencilDrawing.emit({ data: true });
            }
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
        this.pencilCtx.lineWidth = this.getCurrentLineWidth();
        this.pencilCtx.strokeStyle = this.color;
        this.pencilCtx.lineJoin = this.DEF_LINE_JOIN;
        this.pencilCtx.lineCap = this.DEF_LINE_CAP;
        this.pencilCtx.clearRect(0, 0, this.pencilCtx.canvas.width, this.pencilCtx.canvas.height);
        // Thanks to: http://perfectionkills.com/exploring-canvas-drawing-techniques/
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

    private sampleColorAtPixel(mouse): void {
        let pixel = this.viewCtx.getImageData(mouse.x, mouse.y, 1, 1);
        let data = pixel.data;
        let rgba = "rgba(" + data[0] + ", " + data[1] +
                 ", " + data[2] + ", " + (data[3] / 255) + ")";
        this.color = rgba;
        this.onColorSampled.emit({ data: rgba });
    }

    private getCurrentLineWidth(): number {
        return this.toolbarState.pencilSize;
    }

}
