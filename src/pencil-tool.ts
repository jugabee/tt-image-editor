import { Editor } from "./editor";
import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { Point } from "./util";

export enum PencilSize {
    SIZE_1 = .5,
    SIZE_2 = 2,
    SIZE_3 = 4,
    SIZE_4 = 8,
    SIZE_5 = 12,
    SIZE_6 = 18,
    SIZE_7 = 24,
    SIZE_8 = 36
}

class PencilTool extends Tool{
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

    constructor() {
        super();
    }

    handleMousedown(evt): void {
        if (!evt.altKey) {
            let scale: number = Util.getCurrentScale(Editor.state.scale);
            let mouse: Point = Util.getMousePosition(Editor.state.clientRect, evt);
            let p: Point = {
                x: (mouse.x * scale) + Editor.state.sx,
                y: (mouse.y * scale) + Editor.state.sy
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
        let scale: number = Util.getCurrentScale(Editor.state.scale);
        let mouse: Point = Util.getMousePosition(Editor.state.clientRect, evt);
        let p: Point = {
            x: (mouse.x * scale) + Editor.state.sx,
            y: (mouse.y * scale) + Editor.state.sy
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
        Editor.pencilCtx.lineWidth = this.width;
        Editor.pencilCtx.strokeStyle = this.color;
        Editor.pencilCtx.lineJoin = this.DEF_LINE_JOIN;
        Editor.pencilCtx.lineCap = this.DEF_LINE_CAP;
        Editor.pencilCtx.clearRect(0, 0, Editor.pencilCtx.canvas.width, Editor.pencilCtx.canvas.height);
        // Thanks to: http://perfectionkills.com/exploring-canvas-drawing-techniques/
        Editor.pencilCtx.beginPath();
        Editor.pencilCtx.moveTo(p1.x, p1.y);
        for (let i = 1, len = this.points.length; i < len; i++) {
            let midPoint = Util.midpoint(p1, p2);
            Editor.pencilCtx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = this.points[i];
            p2 = this.points[i+1];
        }
        Editor.pencilCtx.lineTo(p1.x, p1.y);
        Editor.pencilCtx.stroke();
    }

    private drawSprayBrush(): void {
        this.sprayTimeout = setTimeout(() => {
            for (let i = this.width; i > 0; i--) {
                let angle = Util.getRandomFloat(0, Math.PI * 2);
                let radius = Util.getRandomFloat(0, this.width);
                let side = Util.getRandomFloat(1, 2);
                Editor.pencilCtx.fillStyle = this.color;
                Editor.pencilCtx.fillRect(
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
        let pixel = Editor.viewCtx.getImageData(mouse.x, mouse.y, 1, 1);
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

export let Pencil = new PencilTool();
