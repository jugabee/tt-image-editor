import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";

interface PencilToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
 }

export class PencilTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly DEF_STROKE = "green";
    private readonly DEF_RESET_FILL = "white";
    private debug: boolean = false;
    state: PencilToolState = {
        isMousedown: false,
        isMousedrag: false
    }
    onPencilDrawingStart: Events.Dispatcher<Util.Point> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawing: Events.Dispatcher<Util.Point> = Events.Dispatcher.createEventDispatcher();

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
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
        let mouse = Util.getMousePosition(this.canvas, evt);
        this.setState({ isMousedown: true });
        this.onPencilDrawingStart.emit({ data: mouse });
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let mouse = Util.getMousePosition(this.canvas, evt);
            this.setState({ isMousedrag: true });
            this.onPencilDrawing.emit({ data: mouse });
        }
    }

    handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
        this.onPencilDrawingFinished.emit({ data: true });
    }

    draw(): void { }

    activate(): void {
        this.canvas.style.cursor = "default";
        this.ctx.strokeStyle = this.DEF_STROKE;
        this.ctx.lineWidth = 5;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

}
