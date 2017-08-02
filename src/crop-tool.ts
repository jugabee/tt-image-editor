interface CropToolState {
    x: number;
    y: number;
    w: number;
    h: number;
}

export class CropTool {

    private readonly DEF_FILL = "blue";
    state: CropToolState = {
        x: 0,
        y: 0,
        w: 1,
        h: 1
    }

    constructor() { }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
        this.state.x = x;
        this.state.y = y;
        this.state.w = w;
        this.state.h = h;
        ctx.strokeStyle = this.DEF_FILL;
        ctx.lineWidth = 2.0;
        ctx.globalAlpha = .2;
        ctx.strokeRect(
            this.state.x,
            this.state.y,
            this.state.w - this.state.x,
            this.state.h - this.state.y
        );
    }
}
