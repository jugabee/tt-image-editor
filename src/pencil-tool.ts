import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { Point, Direction } from "./util";
import { EditorState } from "./editor";
import { ToolbarState, PencilSize, ToolType, Toolbar } from "./toolbar";

export class PencilTool extends Tool{
    private editorState: EditorState;
    private toolbarState: ToolbarState;
    private pencilCanvas: HTMLCanvasElement;
    private pencilCtx: CanvasRenderingContext2D;
    private viewCanvas: HTMLCanvasElement;
    private viewCtx: CanvasRenderingContext2D;
    private points: Array<Point> = [];
    private isMousedown: boolean = false;
    private isMousedrag: boolean = false;
    private isEraser: boolean = false;
    private isSpray: boolean = false;
    private sprayTimeout: number | undefined;
    private sprayMouse: Point;
    private readonly DEF_SPRAY_DENSITY = 25;
    private readonly DEF_COMPOSITE = "source-over";
    private readonly DEF_COLOR = "rgba(0, 0, 0, 1)";
    private readonly DEF_RESET_FILL = "white";
    private readonly DEF_LINE_CAP = "round";
    private readonly DEF_LINE_JOIN = "round";
    composite: string = this.DEF_COMPOSITE;
    color: string = this.DEF_COLOR;
    width: number = PencilSize.SIZE_3;
    private debug: boolean = false;

    onPencilDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onColorSampled: Events.Dispatcher<string> = Events.Dispatcher.createEventDispatcher();

    constructor(editorState: EditorState, toolbarState: ToolbarState, pencilCanvas: HTMLCanvasElement, viewCanvas: HTMLCanvasElement) {
        super();
        this.editorState = editorState;
        this.toolbarState = toolbarState;
        this.pencilCanvas = pencilCanvas;
        this.pencilCtx = this.pencilCanvas.getContext("2d");
        this.viewCanvas = viewCanvas;
        this.viewCtx = this.viewCanvas.getContext("2d");
    }

    handleMousedown(evt): void {
        if (!evt.altKey) {
            let scale: number = Util.getCurrentScale(this.editorState.scale);
            let mouse: Point = Util.getMousePosition(this.editorState.clientRect, evt);
            let p: Point = {
                x: (mouse.x * scale) + this.editorState.sx,
                y: (mouse.y * scale) + this.editorState.sy
            }
            this.sprayMouse = p;
            this.isMousedown = true;
            if (this.isEraser) {
                this.composite = "destination-out";
            } else {
                this.composite = "source-over";
            }
            if(evt.ctrlKey || evt.metaKey) {
                this.sampleColorAtPoint(mouse);
            } else {
                if (this.isSpray) {
                    this.drawSprayBrush();
                } else {
                    this.points.push(p);
                }
            }
        }
    }

    handleMousemove(evt): void {
        let scale: number = Util.getCurrentScale(this.editorState.scale);
        let mouse: Point = Util.getMousePosition(this.editorState.clientRect, evt);
        let p: Point = {
            x: (mouse.x * scale) + this.editorState.sx,
            y: (mouse.y * scale) + this.editorState.sy
        };
        this.sprayMouse = p;
        if (!evt.altKey && this.isMousedown && !this.isSpray) {
            this.isMousedrag = true;
            if (evt.ctrlKey || evt.metaKey) {
                this.sampleColorAtPoint(mouse);
            } else {
                this.points.push(p);
                this.drawPencil();
                this.onPencilDrawing.emit({ data: true });
            }
        }
    }

    handleMouseup(evt): void {
        this.onPencilDrawingFinished.emit({ data: true });
        this.points = [];
        clearTimeout(this.sprayTimeout);
        this.isMousedown = false;
        this.isMousedrag = false;
    }

    draw(): void { }

    init(): void { }

    drawPencil(): void {
        let p1 = this.points[0];
        let p2 = this.points[1];
        this.pencilCtx.lineWidth = this.width;
        this.pencilCtx.strokeStyle = this.color;
        this.pencilCtx.lineJoin = this.DEF_LINE_JOIN;
        this.pencilCtx.lineCap = this.DEF_LINE_CAP;
        this.pencilCtx.clearRect(0, 0, this.pencilCtx.canvas.width, this.pencilCtx.canvas.height);
        // Thanks to: http://perfectionkills.com/exploring-canvas-drawing-techniques/
        this.pencilCtx.beginPath();
        this.pencilCtx.moveTo(p1.x, p1.y);
        for (let i = 1, len = this.points.length; i < len; i++) {
            let midPoint = Util.midpoint(p1, p2);
            this.pencilCtx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = this.points[i];
            p2 = this.points[i+1];
        }
        this.pencilCtx.lineTo(p1.x, p1.y);
        this.pencilCtx.stroke();
    }

    private drawSprayBrush(): void {
        this.sprayTimeout = setTimeout(() => {
            for (let i = this.width; i > 0; i--) {
                let angle = Util.getRandomFloat(0, Math.PI * 2);
                let radius = Util.getRandomFloat(0, this.width);
                let side = Util.getRandomFloat(1, 2);
                this.pencilCtx.fillStyle = this.color;
                this.pencilCtx.fillRect(
                    this.sprayMouse.x + radius * Math.cos(angle),
                    this.sprayMouse.y + radius * Math.sin(angle),
                    side, side);
                }
                this.onPencilDrawing.emit({ data: true });
                if (!this.sprayTimeout) return;
                this.drawSprayBrush();
            }, 25
        );
    }

    private sampleColorAtPoint(mouse): void {
        let pixel = this.viewCtx.getImageData(mouse.x, mouse.y, 1, 1);
        let data = pixel.data;
        let rgba = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
        this.color = rgba;
        this.onColorSampled.emit({ data: rgba });
    }

    setLineWidth(width: number): void {
        this.width = width;
    }

    setEraser(isEraser: boolean): void {
        this.isEraser = isEraser;
    }

    setSpray(isSpray: boolean): void {
        this.isSpray = isSpray;
    }

    getComposite(): string {
        return this.composite;
    }

}
