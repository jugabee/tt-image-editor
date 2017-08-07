import * as Events from "./event";
import { Tool } from "./tool";

export class ZoomTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    onZoom: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.canvas.parentNode.addEventListener("keydown", (evt) => this.handleKeydown(evt));
        this.canvas.parentNode.addEventListener("keyup", (evt) => this.handleKeyup(evt));
    }

    handleKeydown(evt): void {
        if (evt.keyCode === 17) {
            this.canvas.style.cursor = "zoom-out";
        }
    }

    handleKeyup(evt): void {
        this.canvas.style.cursor = "zoom-in";
    }

    handleMousedown(evt): void {

    }

    handleMousemove(evt): void {

    }

    handleMouseup(evt): void {
        this.onZoom.emit({ data: evt} )
    }

    draw(): void { }

    activate(): void {
        this.canvas.style.cursor = "zoom-in";
    }

}
