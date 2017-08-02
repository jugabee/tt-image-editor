import { Tool } from "./tool";

interface CropToolState {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface Point {
    x: number,
    y: number
};

export class CropTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly DEF_STROKE_COLOR = "rgba(0, 0, 255, 0.5)";
    private readonly DEF_FILL_COLOR = "rgba(0, 0, 0, 0.3)";
    state: CropToolState = {
        x: 0,
        y: 0,
        w: 1,
        h: 1
    }

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    }

    handleMousedown(evt): void {
        let point = this.getMousePosition(evt);
        this.state.x = point.x;
        this.state.y = point.y;
        this.clear();
    }

    handleMousemove(evt): void {
        let point = this.getMousePosition(evt);
        this.state.w = point.x - this.state.x;
        this.state.h = point.y - this.state.y;
        this.draw(
            this.state.x,
            this.state.y,
            this.state.w,
            this.state.h
        );
    }

    handleMouseup(evt): void { }

    reset(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clear(): void {
        this.ctx.fillStyle = this.DEF_FILL_COLOR;
        // clear the toolCanvas and immediately refill with transparent black
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private draw(x: number, y: number, w: number, h: number): void {
        this.clear();
        // clear a rectangular section in the transparent black fill for a crop effect
        this.ctx.clearRect(
            this.state.x,
            this.state.y,
            this.state.w,
            this.state.h
        );
        this.ctx.lineWidth = 2.0;
        this.ctx.strokeStyle = this.DEF_STROKE_COLOR;
        this.ctx.strokeRect(
            this.state.x,
            this.state.y,
            this.state.w,
            this.state.h
        );
    }
    
    private getMousePosition(evt): Point {
        let rect = this.canvas.getBoundingClientRect();
        let offsetX = evt.clientX - rect.left;
        let offsetY = evt.clientY - rect.top;
        return { x: offsetX, y: offsetY };
    }
}
