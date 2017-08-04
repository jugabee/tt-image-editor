import * as Events from "./event";
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

export interface Rect {
    x: number,
    y: number,
    w: number,
    h: number
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
    private readonly DEF_TEXT_FILL = "white";
    private readonly DEF_STROKE = "blue";
    private readonly DEF_RESET_FILL = "rgba(0, 0, 0, 0.4)";
    private readonly DEF_KNOB_FILL = "rgb(255, 255, 255)";
    private readonly DEF_KNOB_RADIUS = 5;
    private readonly DEF_LINE_W = 1;
    // rounded rectangle at center of crop tool that displays dimensions
    private readonly DEF_RRECT_W = 72;
    private readonly DEF_RRECT_H = 18;
    private readonly DEF_RRECT_R = 5;
    private debug: boolean = false;
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
    onCropRectVisibility: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    }

    resetState(): void {
        this.setState({
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
        if (this.state.isVisible) {
            this.onCropRectVisibility.emit({ data: true });
        } else {
            this.onCropRectVisibility.emit({ data: false });
        }
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
        this.ctx.fillStyle = this.DEF_RESET_FILL;
        // clear the toolCanvas and refill with default transparent black
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(): void {
        this.resetCanvas();
        if (this.state.isVisible) {
            this.onCropRectVisibility.emit({ data: true });
            // clear a rectangular section in the transparent black fill for a crop effect
            this.ctx.clearRect(
                this.state.x,
                this.state.y,
                this.state.w,
                this.state.h
            );
            // draw text dimensions of crop rect in center of rectangle
            this.drawDimensions();
            // stroke the cleared rect area
            this.ctx.lineWidth = this.DEF_LINE_W;
            this.ctx.strokeStyle = this.DEF_STROKE;
            this.ctx.strokeRect(
                this.state.x,
                this.state.y,
                this.state.w,
                this.state.h
            );
            this.drawKnobs();
        }
    }

    private drawDimensions() {
        // don't draw until crop rectangle is large enough to contain dimensions
        if (Math.abs(this.state.w) >= this.DEF_RRECT_W && Math.abs(this.state.h) >= this.DEF_RRECT_H) {
            let { x, y } = this.getLeftTopValues();
            this.drawRoundedRect(
                x + Math.abs(this.state.w / 2) - (this.DEF_RRECT_W / 2),
                y + Math.abs(this.state.h / 2) - (this.DEF_RRECT_H / 2),
                this.DEF_RRECT_W, this.DEF_RRECT_H, this.DEF_RRECT_R
            );
            this.ctx.font = "12px sans-serif";
            this.ctx.textBaseline = "middle";
            this.ctx.fillStyle = this.DEF_TEXT_FILL;
            let text = this.ctx.measureText(Math.abs(this.state.w) + ", " + Math.abs(this.state.h));
            this.ctx.fillText(
                Math.abs(this.state.w) + ", " + Math.abs(this.state.h),
                x + Math.abs(this.state.w / 2) - (text.width / 2),
                y + Math.abs(this.state.h / 2)
            );
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
        this.ctx.fillStyle = this.DEF_KNOB_FILL;
        this.ctx.strokeStyle = this.DEF_STROKE;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }

    private drawRoundedRect(x: number, y: number, w: number, h: number, r: number){
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.fill();
    }

    private isMouseoverRect(evt): boolean {
        let mouse = this.getMousePosition(evt);
        let { x, y } = this.getLeftTopValues();
        if(
            mouse.x > x &&
            mouse.y > y &&
            mouse.x < (x + Math.abs(this.state.w)) &&
            mouse.y < (y + Math.abs(this.state.h))) {
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

    // used by editor to crop from a source image
    getCropRect(): Rect {
        let { x, y } = this.getLeftTopValues();
        return { x: x, y: y, w: Math.abs(this.state.w), h: Math.abs(this.state.h) };
    }

    private getMousePosition(evt): Point {
        let rect = this.canvas.getBoundingClientRect();
        let offsetX = evt.clientX - rect.left;
        let offsetY = evt.clientY - rect.top;
        return { x: offsetX, y: offsetY };
    }

    /**
    * If the rectangular crop was drawn from right to left, or bottom to top,
    * the width or height of the rectangle will be negative. Add negative
    * width, height to x, y to find the left and top values of the rectangle.
    */
    private getLeftTopValues(): Point {
        let left = (this.state.w < 0) ? this.state.x + this.state.w : this.state.x;
        let top = (this.state.h < 0) ? this.state.y + this.state.h : this.state.y;
        let position: Point = { x: left, y: top };
        return position;
    }

    private dist(p1: Point, p2: Point) {
        return Math.sqrt(
            (p2.x - p1.x) * (p2.x - p1.x) +
            (p2.y - p1.y) * (p2.y - p1.y)
        );
    }
}
