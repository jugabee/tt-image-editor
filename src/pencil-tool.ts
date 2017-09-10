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
    private isSpray: boolean = false;
    private sprayTimeout: number | undefined;
    private sprayMouse: Point;
    private readonly DEF_SPRAY_DENSITY = 25;
    private readonly DEF_OPACITY = 1;
    private readonly DEF_WIDTH = 4;
    private readonly DEF_COMPOSITE = "source-over";
    private readonly DEF_COLOR = "rgba(0, 0, 0, 1)";
    private readonly DEF_RESET_FILL = "white";
    private readonly DEF_LINE_CAP = "round";
    private readonly DEF_LINE_JOIN = "round";
    composite: string = this.DEF_COMPOSITE;
    colorString: string = this.DEF_COLOR;
    color: Color = { r: 0, g: 0, b: 0, a: 1 };
    opacity: number = this.DEF_OPACITY;
    width: number = this.DEF_WIDTH;
    private debug: boolean = false;

    onPencilDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
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
        let scale: number = util.getCurrentScale(editor.state.scale);
        let mouse: Point = util.getMousePosition(editor.state.clientRect, evt);
        let p: Point = {
            x: (mouse.x * scale) + editor.state.sx,
            y: (mouse.y * scale) + editor.state.sy
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
        editor.pencilCtx.lineWidth = this.width;
        editor.pencilCtx.strokeStyle = this.colorString;
        editor.pencilCtx.lineJoin = this.DEF_LINE_JOIN;
        editor.pencilCtx.lineCap = this.DEF_LINE_CAP;
        editor.pencilCtx.clearRect(0, 0, editor.pencilCtx.canvas.width, editor.pencilCtx.canvas.height);
        // Thanks to: http://perfectionkills.com/exploring-canvas-drawing-techniques/
        editor.pencilCtx.beginPath();
        editor.pencilCtx.moveTo(p1.x, p1.y);
        for (let i = 1, len = this.points.length; i < len; i++) {
            let midPoint = util.midpoint(p1, p2);
            editor.pencilCtx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = this.points[i];
            p2 = this.points[i+1];
        }
        editor.pencilCtx.lineTo(p1.x, p1.y);
        editor.pencilCtx.stroke();
    }

    private drawSprayBrush(): void {
        this.sprayTimeout = setTimeout(() => {
            for (let i = this.width; i > 0; i--) {
                let angle = util.getRandomFloat(0, Math.PI * 2);
                let radius = util.getRandomFloat(0, this.width);
                let side = util.getRandomFloat(1, 2);
                editor.pencilCtx.fillStyle = this.colorString;
                editor.pencilCtx.fillRect(
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
        let pixel = editor.viewCtx.getImageData(mouse.x, mouse.y, 1, 1);
        let data = pixel.data;
        let color = { r: data[0], g: data[1], b: data[2], a: 1 };
        this.color = { r: data[0], g: data[1], b: data[2], a: this.opacity };
        this.colorString = this.colorToString(this.color);
        this.onColorSampled.emit({ data: this.colorToString(color) });
    }

    private colorToString(color: Color): string {
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    }

    setOpacity(opacity: number): void {
        this.opacity = opacity;
        this.color = { r: this.color.r, g: this.color.g, b: this.color.b, a: this.opacity };
        this.colorString = this.colorToString(this.color);
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

export let pencilTool = new PencilTool();
