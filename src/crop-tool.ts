import { Tool } from "./tool";

interface CropToolState {
    isVisible: boolean;
    isMousedown: boolean;
    isMousedrag: boolean;
    isMovable: boolean;
    isResizable: boolean;
    activeKnob: Knob | null;
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

enum Knob {
    TL,
    TR,
    BL,
    BR
}

export class CropTool extends Tool{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly DEF_STROKE_COLOR = "blue";
    private readonly DEF_RESET_COLOR = "rgba(0, 0, 0, 0.4)";
    private readonly DEF_KNOB_FILL_COLOR = "rgb(255, 255, 255)";
    private readonly DEF_KNOB_RADIUS = 5;
    private readonly DEF_STROKE_WIDTH = 1;
    private debug: boolean = true;
    state: CropToolState = {
        isVisible: false,
        isMousedown: false,
        isMousedrag: false,
        isMovable: false,
        isResizable: false,
        activeKnob: null,
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

    private resetState(): void {
        this.setState({
            isMousedown: false,
            isMousedrag: false,
            isMovable: false,
            isResizable: false,
            activeKnob: null,
            moveOffsetX: 0,
            moveOffsetY: 0,
            x: 0,
            y: 0,
            w: 0,
            h: 0
        });
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
        this.setState({ isMousedown: true });
        let mouse = this.getMousePosition(evt);
        if (this.state.isResizable) {
            return;
        } else if (this.state.isMovable) {
            this.setState({ moveOffsetX: mouse.x - this.state.x, moveOffsetY: mouse.y - this.state.y });
        } else {
            /**
            * isVisible is used to prevent unwanted mouse interactions with
            * the result of drawing the default state on mousedown without
            * actually dragging a width and height for the rectangle.
            */
            this.setState({ isVisible: false, x: mouse.x, y: mouse.y, w: 0, h: 0 });
            this.resetCanvas();
        }
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let mouse = this.getMousePosition(evt);
            this.setState({ isMousedrag: true });
            // set state for resizing the rectangle
            if (this.state.isResizable) {
                this.handleResize(mouse);
            }
            // set state for moving the rectangle
            else if (this.state.isMovable) {
                this.handleMove(mouse);
            }
            // set state for drawing a new rectangle
            else {
                this.handleNewRect(mouse);
            }
            // redraw canvas based on state
            this.draw();
        } else {
            if (this.isMouseoverKnob(evt)) {
                if (this.state.isVisible) {
                    this.canvas.style.cursor = "pointer";
                    this.setState({ isResizable: true });
                }
            } else if (this.isMouseoverRect(evt)) {
                if (this.state.isVisible) {
                    this.canvas.style.cursor = "move";
                    this.setState({ isMovable: true, isResizable: false, activeKnob: null });
                }
            } else {
                this.canvas.style.cursor = "crosshair";
                this.setState({ isMovable: false, isResizable: false, activeKnob: null });
            };
        }
    }

    handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
    }

    handleNewRect(mouse: Point): void {
        this.setState({
            isVisible: true,
            w: mouse.x - this.state.x,
            h: mouse.y - this.state.y
        });
    }

    handleMove(mouse: Point): void {
        // set the x and y state to the offset mouse position; w and h are constant
        this.setState({
            x: (mouse.x - this.state.moveOffsetX),
            y: (mouse.y - this.state.moveOffsetY)
        });
    }

    handleResize(mouse: Point): void {
        switch (this.state.activeKnob) {
            case Knob.TL:
                this.setState({
                    x: mouse.x,
                    y: mouse.y,
                    w: this.state.w + (this.state.x - mouse.x),
                    h: this.state.h + (this.state.y - mouse.y)
                });
                break;
            case Knob.TR:
                this.setState({
                    y: mouse.y,
                    w: mouse.x - this.state.x,
                    h: this.state.h + (this.state.y - mouse.y)
                });
                break;
            case Knob.BL:
                this.setState({
                    x: mouse.x,
                    w: this.state.w + (this.state.x - mouse.x),
                    h: mouse.y - this.state.y
                });
                break;
            case Knob.BR:
                this.setState({
                    w: mouse.x - this.state.x,
                    h: mouse.y - this.state.y
                });
                break;
        }
    }

    private resetCanvas(): void {
        this.ctx.fillStyle = this.DEF_RESET_COLOR;
        // clear the toolCanvas and refill with default transparent black
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(): void {
        this.resetCanvas();
        if (this.state.isVisible) {
            // clear a rectangular section in the transparent black fill for a crop effect
            this.ctx.clearRect(
                this.state.x,
                this.state.y,
                this.state.w,
                this.state.h
            );
            // stroke the cleared rect area
            this.ctx.lineWidth = this.DEF_STROKE_WIDTH;
            this.ctx.strokeStyle = this.DEF_STROKE_COLOR;
            this.ctx.strokeRect(
                this.state.x,
                this.state.y,
                this.state.w,
                this.state.h
            );
            this.drawKnobs();
        }
    }

    private drawKnobs(): void {
        // top left
        this.drawCircle(
            this.state.x,
            this.state.y,
            this.DEF_KNOB_RADIUS
        );
        // top right
        this.drawCircle(
            this.state.x + this.state.w,
            this.state.y,
            this.DEF_KNOB_RADIUS
        );
        // bottom left
        this.drawCircle(
            this.state.x,
            this.state.y + this.state.h,
            this.DEF_KNOB_RADIUS
        );
        // bottom right
        this.drawCircle(
            this.state.x + this.state.w,
            this.state.y + this.state.h,
            this.DEF_KNOB_RADIUS
        );
    }

    private drawCircle(x, y, radius) {
        this.ctx.fillStyle = this.DEF_KNOB_FILL_COLOR;
        this.ctx.strokeStyle = this.DEF_STROKE_COLOR;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }

    private isMouseoverRect(evt): boolean {
        let mouse = this.getMousePosition(evt);
        /**
        * If the rectangular crop was drawn from right to left, or bottom to top,
        * the width or height of the rectangle will be negative.
        * In such cases, add negative width, height to x, y to find the left
        * and top values of the rectangle.
        */
        let left = (this.state.w < 0) ? this.state.x + this.state.w : this.state.x;
        let top = (this.state.h < 0) ? this.state.y + this.state.h : this.state.y;
        if(
            mouse.x > left &&
            mouse.y > top &&
            mouse.x < (left + Math.abs(this.state.w)) &&
            mouse.y < (top + Math.abs(this.state.h))) {
            return true;
        } else {
            return false;
        }
    }

    private isMouseoverKnob(evt): boolean {
        let mouse = this.getMousePosition(evt);
        let pTL: Point = { x: this.state.x, y: this.state.y };
        let pTR: Point = { x: this.state.x + this.state.w, y: this.state.y };
        let pBL: Point = { x: this.state.x, y: this.state.y + this.state.h };
        let pBR: Point = { x: this.state.x + this.state.w, y: this.state.y + this.state.h };
        // top left knob
        if (this.dist(mouse, pTL) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.TL });
            return true;
        }
        // top right knob
        else if (this.dist(mouse, pTR) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.TR });
            return true;
        }
        // bottom left knob
        else if (this.dist(mouse, pBL) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.BL });
            return true;
        }
        // bottom right knob
        else if (this.dist(mouse, pBR) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.BR });
            return true;
        }
        else {
            return false;
        }
    }

    private getMousePosition(evt): Point {
        let rect = this.canvas.getBoundingClientRect();
        let offsetX = evt.clientX - rect.left;
        let offsetY = evt.clientY - rect.top;
        return { x: offsetX, y: offsetY };
    }

    private dist(p1: Point, p2: Point) {
        return Math.sqrt(
            (p2.x - p1.x) * (p2.x - p1.x) +
            (p2.y - p1.y) * (p2.y - p1.y)
        );
    }
}
