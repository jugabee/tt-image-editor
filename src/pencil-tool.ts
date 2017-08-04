import * as Events from "./event";
import { Tool } from "./tool";

interface PencilToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
 }

interface Point {
    x: number,
    y: number
};

export class PencilTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly DEF_STROKE = "black";
    private readonly DEF_RESET_FILL = "white";
    private debug: boolean = false;
    state: PencilToolState = {
        isMousedown: false,
        isMousedrag: false
    }
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
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
        let mouse = this.getMousePosition(evt);
        this.setState({ isMousedown: true });
        this.ctx.beginPath();
		this.ctx.moveTo(mouse.x, mouse.y);
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let mouse = this.getMousePosition(evt);
            this.setState({ isMousedrag: true });
            this.ctx.lineTo(mouse.x, mouse.y);
			this.ctx.stroke();
        }
    }

    handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
        this.onPencilDrawingFinished.emit({ data: true });
    }

    draw(): void { }

    activate(): void {
        this.canvas.style.cursor = "default";
        this.resetCanvas();
    }

    private resetCanvas(): void {
        this.ctx.fillStyle = this.DEF_RESET_FILL;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.DEF_STROKE;
    }

    private getMousePosition(evt): Point {
        let rect = this.canvas.getBoundingClientRect();
        let offsetX = evt.clientX - rect.left;
        let offsetY = evt.clientY - rect.top;
        return { x: offsetX, y: offsetY };
    }

}
