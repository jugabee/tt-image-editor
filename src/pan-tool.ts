import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";

interface PanToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
    mousedownX: number;
    mousedownY: number;
    scale: number;
}

export class PanTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly DEF_STROKE = "black";
    private readonly DEF_RESET_FILL = "white";
    private debug: boolean = false;
    state: PanToolState = {
        isMousedown: false,
        isMousedrag: false,
        mousedownX: 0,
        mousedownY: 0,
        scale: 1
    }

    onPanning: Events.Dispatcher<{}> = Events.Dispatcher.createEventDispatcher();

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    }

    private setState(obj): void {
        if (this.debug) {
            console.log("MERGE WITH", obj);
            console.log("BEFORE", JSON.stringify(this.state));
            console.log("*******************************");
        }
        Object.getOwnPropertyNames(obj).forEach(
            (val) => {
                if (!(val in this.state)) {
                    throw "Unexpected state property."
                }
            }
        );
        this.state = Object.assign(this.state, obj);
        if (this.debug) {
            console.log("AFTER", JSON.stringify(this.state));
        }
    }

    handleMousedown(evt): void {
        let mouse: Util.Point = Util.getMousePosition(this.canvas, evt);
        this.setState({
            isMousedown: true,
            mousedownX: mouse.x,
            mousedownY: mouse.y
        });
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            this.pan(evt);
        }
    }

    handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
    }

    draw(): void { }

    activate(): void {
        this.canvas.style.cursor = "pointer";
        this.resetCanvas();
    }

    private resetCanvas(): void {
        this.ctx.fillStyle = this.DEF_RESET_FILL;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.DEF_STROKE;
    }

    private pan(evt): void {
        let mouse: Util.Point = Util.getMousePosition(this.canvas, evt);
        this.onPanning.emit({
            data: {
                mouseX: mouse.x, mouseY: mouse.y,
                mousedownX: this.state.mousedownX, mousedownY: this.state.mousedownY
            }
        });
        this.setState({
            isMousedrag: true,
            mousedownX: mouse.x,
            mousedownY: mouse.y
        });
    }

}
