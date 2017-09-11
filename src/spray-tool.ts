import { editor } from "./editor";
import * as Events from "./event";
import { Tool } from "./tool";
import * as util from "./util";
import { Point } from "./util";

class SprayTool extends Tool{
    private isMousedown: boolean = false;
    private isEraser: boolean = false;
    private sprayTimeout: number | undefined;
    private sprayMouse: Point;
    private readonly DEF_SPRAY_DENSITY = 25;
    private readonly DEF_OPACITY = 1;
    private readonly DEF_WIDTH = 4;
    private readonly DEF_COMPOSITE = "source-over";
    composite: string = this.DEF_COMPOSITE;
    opacity: number = this.DEF_OPACITY;
    width: number = this.DEF_WIDTH;

    onDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor() {
        super();
    }

    handleMousedown(evt): void {
        if (!evt.altKey && !evt.ctrlKey && !evt.metaKey) {
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
            this.drawSprayBrush();
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
    }

    handleMouseup(evt): void {
        this.onDrawingFinished.emit({ data: true });
        clearTimeout(this.sprayTimeout);
        this.isMousedown = false;
    }

    draw(): void { }

    init(): void { }

    private drawSprayBrush(): void {
        this.sprayTimeout = setTimeout(() => {
            for (let i = this.width; i > 0; i--) {
                let angle = util.getRandomFloat(0, Math.PI * 2);
                let radius = util.getRandomFloat(0, this.width);
                let side = util.getRandomFloat(1, 2);
                editor.drawingCtx.fillStyle = util.colorToString(editor.state.color, this.opacity);
                editor.drawingCtx.fillRect(
                    this.sprayMouse.x + radius * Math.cos(angle),
                    this.sprayMouse.y + radius * Math.sin(angle),
                    side, side);
                }
                this.onDrawing.emit({ data: true });
                if (!this.sprayTimeout) return;
                this.drawSprayBrush();
            }, 25
        );
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
