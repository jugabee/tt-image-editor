import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";

interface PanToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
}

export class PanTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private debug: boolean = false;
    state: PanToolState = {
        isMousedown: false,
        isMousedrag: false,
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0
    }

    onPanning: Events.Dispatcher<Util.Point> = Events.Dispatcher.createEventDispatcher();
    onPanningFinished: Events.Dispatcher<Util.Point> = Events.Dispatcher.createEventDispatcher();

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
        this.setState({ isMousedown: true, x: mouse.x, y: mouse.y });
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let mouse: Util.Point = Util.getMousePosition(this.canvas, evt);
            this.setState({
                isMousedrag: true,
                offsetX: mouse.x - this.state.x,
                offsetY: mouse.y - this.state.y
            });
            this.onPanning.emit({ data: { x: this.state.offsetX, y: this.state.offsetY } });
        }
    }

    handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
        this.onPanningFinished.emit({ data: { x: this.state.offsetX, y: this.state.offsetY } });
    }

    draw(): void { }

    activate(): void {
        this.canvas.style.cursor = "grab";
    }

}
