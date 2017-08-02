import { Tool } from "./tool";

interface CropToolState {
    isDown: boolean;
    isDragging: boolean;
    isMovable: boolean;
    moveOffsetX: number;
    moveOffsetY: number;
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
    private debug: boolean = false;
    state: CropToolState = {
        isDown: false,
        isDragging: false,
        isMovable: false,
        moveOffsetX: 0,
        moveOffsetY: 0,
        x: 0,
        y: 0,
        w: 0,
        h: 0
    }

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
        this.setState({ isDown: true });
        let mouse = this.getMousePosition(evt);
        if (this.state.isMovable) {
            this.setState({ moveOffsetX: mouse.x - this.state.x, moveOffsetY: mouse.y - this.state.y });
        } else {
            this.setState({ x: mouse.x, y: mouse.y });
            this.clear();
        }
    }

    handleMousemove(evt): void {
        if (this.state.isDown) {
            let mouse = this.getMousePosition(evt);
            this.setState({ isDragging: true });
            // set state for moving the rectangle
            if (this.state.isMovable) {
                // set the x and y state to the offset mouse position
                this.setState({
                    x: (mouse.x - this.state.moveOffsetX),
                    y: (mouse.y - this.state.moveOffsetY)
                });
            // set state for drawing a new rectangle
            } else {
                this.setState({
                    w: mouse.x - this.state.x,
                    h: mouse.y - this.state.y
                });
            }
            // draw rectangle based on state
            this.draw(
                this.state.x,
                this.state.y,
                this.state.w,
                this.state.h
            );
        }
        if (this.containsCursor(evt)) {
            this.canvas.style.cursor = "move";
            this.setState({ isMovable: true });
        } else {
            this.canvas.style.cursor = "crosshair";
            this.setState({ isMovable: false });
        };
    }

    handleMouseup(evt): void {
        this.setState({ isDown: false, isDragging: false });
    }

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

    // Rectangular crop area contains the mouse cursor's current position.
    private containsCursor(evt): boolean {
        let mouse = this.getMousePosition(evt);
        /**
        * If the rectangular crop was drawn from right to left, or bottom to top,
        * the width or height of the rectangle will be negative.
        * In such cases, add negative width or height to x or y to find the left
        * and top values of the rectangle.
        */
        let left = (this.state.w < 0) ? this.state.x + this.state.w : this.state.x;
        let top = (this.state.h < 0) ? this.state.y + this.state.h : this.state.y;
        if(
            mouse.x > left &&
            mouse.y > top &&
            mouse.x < (left + Math.abs(this.state.w)) &&
            mouse.y < (top + Math.abs(this.state.h))
        ) {
            return true;
        } else {
            return false;
        }
    }

    private getMousePosition(evt): Point {
        let rect = this.canvas.getBoundingClientRect();
        let offsetX = evt.clientX - rect.left;
        let offsetY = evt.clientY - rect.top;
        return { x: offsetX, y: offsetY };
    }
}
