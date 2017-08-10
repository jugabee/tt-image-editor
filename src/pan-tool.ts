import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";

interface PanToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
    mousedownX: number;
    mousedownY: number;
    distFromMousedownX: number;
    distFromMousedownY: number;
    totalDistFromOriginX: number;
    totalDistFromOriginY: number;
    scale: number;
}

export class PanTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly DEF_STROKE = "black";
    private readonly DEF_RESET_FILL = "white";
    private readonly DEF_SCALE_STEP = 1.1;
    private debug: boolean = false;
    state: PanToolState = {
        isMousedown: false,
        isMousedrag: false,
        mousedownX: 0,
        mousedownY: 0,
        distFromMousedownX: 0,
        distFromMousedownY: 0,
        totalDistFromOriginX: 0,
        totalDistFromOriginY: 0,
        scale: 1
    }

    onPanning: Events.Dispatcher<Util.Point> = Events.Dispatcher.createEventDispatcher();
    onPanningFinished: Events.Dispatcher<Util.Point> = Events.Dispatcher.createEventDispatcher();
    onZooming: Events.Dispatcher<number> = Events.Dispatcher.createEventDispatcher();

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        // IE9, Chrome, Safari, Opera
        this.canvas.addEventListener("mousewheel", (evt) => this.MouseWheelHandler(evt), false);
        // Firefox
        this.canvas.addEventListener("DOMMouseScroll", (evt) => this.MouseWheelHandler(evt), false);
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

    private MouseWheelHandler(evt) {
        var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
        this.zoom(delta);
        return false;
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
        this.finishPan();
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

    private zoom(wheelDelta: number): void {
        if (wheelDelta === -1) {
            // zoom out
            this.setState({ scale: this.state.scale * (1 / this.DEF_SCALE_STEP) });
        } else {
            // zoom in
            this.setState({ scale: this.state.scale * this.DEF_SCALE_STEP });
        }
        this.onZooming.emit({ data: this.state.scale });
    }

    private pan(evt): void {
        let mouse: Util.Point = Util.getMousePosition(this.canvas, evt);
        this.setState({
            isMousedrag: true,
            distFromMousedownX: mouse.x - this.state.mousedownX,
            distFromMousedownY: mouse.y - this.state.mousedownY
        });
        this.onPanning.emit({ data: { x: this.state.distFromMousedownX, y: this.state.distFromMousedownY } });
    }

    private finishPan(): void {
        this.setState({
            totalDistFromOriginX: this.state.distFromMousedownX + this.state.totalDistFromOriginX,
            totalDistFromOriginY: this.state.distFromMousedownY + this.state.totalDistFromOriginY
        });
        this.onPanningFinished.emit({ data: {x: this.state.totalDistFromOriginX, y: this.state.totalDistFromOriginY } })
    }

}
