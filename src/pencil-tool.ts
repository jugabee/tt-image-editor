import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { Transform } from "./transform";

interface PencilToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
 }

export class PencilTool extends Tool{
    private transform: Transform;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly DEF_STROKE = "green";
    private readonly DEF_RESET_FILL = "white";
    private debug: boolean = false;
    state: PencilToolState = {
        isMousedown: false,
        isMousedrag: false
    }
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor(canvas: HTMLCanvasElement, transform: Transform) {
        super();
        this.transform = transform;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
    }

    /* *
    * State is updated by shallow merge in the setState method.
    * setState takes an object parameter with valid state and merges it with
    * the existing state object.
    */
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
        let world = this.transform.getWorld(mouse.x, mouse.y);
        this.setState({ isMousedown: true });
        this.ctx.beginPath();
		this.ctx.moveTo(world.x, world.y);
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let mouse = Util.getMousePosition(this.canvas, evt);
            let world = this.transform.getWorld(mouse.x, mouse.y);
            this.setState({ isMousedrag: true });
            this.onPencilDrawing.emit({ data: true });
            this.ctx.lineTo(world.x, world.y);
			this.ctx.stroke();
        }
    }

    handleMouseup(evt): void {
        console.log(this.transform.getMatrix())
        this.setState({ isMousedown: false, isMousedrag: false });
        this.onPencilDrawingFinished.emit({ data: true });
    }

    draw(): void { }

    activate(): void {
        this.canvas.style.cursor = "default";
        this.ctx.strokeStyle = this.DEF_STROKE;
        // TODO this.resetCanvas();
    }

    private resetCanvas(): void {
        this.ctx.fillStyle = this.DEF_RESET_FILL;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.DEF_STROKE;
    }

}
