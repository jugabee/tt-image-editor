import * as Events from "./event";
import { Tool } from "./tool";
import * as util from "./util";
import { Rect, Point, RectChange, RectOverlap } from "./util";
import { editor } from "./editor";

interface CropToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
    activeKnob: Knob | null;
    isResizable: boolean;
    isMovable: boolean;
    mousedownX: number;
    mousedownY: number;
    dx: number;
    dy: number;
    dw: number;
    dh: number;
}

enum Knob {
    TL,
    TR,
    BL,
    BR
}

export class CropTool extends Tool{
    private readonly DEF_TEXT_FILL = "white";
    private readonly DEF_STROKE = "blue";
    private readonly DEF_RESET_FILL = "rgba(0, 0, 0, 0.4)";
    private readonly DEF_KNOB_FILL = "rgb(255, 255, 255)";
    private readonly DEF_KNOB_RADIUS = 6;
    private debug: boolean = false;
    state: CropToolState = {
        isMousedown: false,
        isMousedrag: false,
        activeKnob: null,
        isResizable: false,
        isMovable: false,
        mousedownX: 0,
        mousedownY: 0,
        dx: 0,
        dy: 0,
        dw: 0,
        dh: 0
    }

    onCropResizing: Events.Dispatcher<{}> = Events.Dispatcher.createEventDispatcher();

    constructor() {
        super();
    }

    resetState(): void {
        this.setState({
            isMousedown: false,
            isMousedrag: false,
            activeKnob: null,
            isResizable: false,
            mousedownX: 0,
            mousedownY: 0,
            dx: 0,
            dy: 0,
            dw: 0,
            dh: 0
        });
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
        let scale = util.getCurrentScale(editor.state.scale);
        let mouse = util.getMousePosition(editor.state.clientRect, evt);
        this.setState({
            isMousedown: true,
            mousedownX: (mouse.x * scale),
            mousedownY: (mouse.y * scale)
        });
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            this.setState({ isMousedrag: true });
            if (this.state.isResizable) {
                this.handleResizeCropRect(evt);
            } else if (this.state.isMovable) {
                this.handleMoveCropRect(evt);
            }
        } else {
            if(this.isMouseoverKnob(evt)) {
                editor.toolCanvas.style.cursor = "pointer";
                this.setState({ isResizable: true, isMovable: false });
            } else if (this.isMouseoverRect(evt)) {
                editor.toolCanvas.style.cursor = "move";
                this.setState({ isMovable: true, isResizable: false });
            } else {
                editor.toolCanvas.style.cursor = "default";
                this.setState({ isResizable: false, isMovable: false });
            }
        }
    }

    private handleCropOverlap(evt): void {
        let r1 = this.getCroppedImageRect();
        let r2 = this.getCropRect();
        // A new crop rect must always be contained by the current cropped image rect
        // If the crop rect is overlapping on a particular side, snap that side back to default
        let o: RectOverlap = util.getRectOverlap(r1, r2);
        if (o.l) {
            this.setState({
               dx: 0,
               dw: this.state.dw + this.state.dx
            });
        }
        if (o.t) {
            this.setState({
               dy: 0,
               dh: this.state.dh + this.state.dy
            });
        }
        if (o.r) {
            this.setState({
               dw: 0 - this.state.dx,
            });
        }
        if (o.b) {
            this.setState({
               dh: 0 - this.state.dy,
            });
        }
    }

    handleMouseup(evt): void {
        this.setState({
            isMousedown: false,
            isMousedrag: false
        });
    }

    private handleMoveCropRect(evt): void {
        let scale = util.getCurrentScale(editor.state.scale);
        let mouse = util.getMousePosition(editor.state.clientRect, evt);
        let dx = (mouse.x * scale) - this.state.mousedownX;
        let dy = (mouse.y * scale) - this.state.mousedownY;
        this.setState({
            dx: this.state.dx + dx,
            dy: this.state.dy + dy,
        });
        this.setState({
            mousedownX: (mouse.x * scale),
            mousedownY: (mouse.y * scale),
        });
        this.handleCropOverlap(evt);
        this.draw();
    }

    // resize the crop rect based on the amount a user has dragged a knob; the
    // total amount that the crop rect has changed from the original image rect is
    // represented by dx, dy, dw, dh
    private handleResizeCropRect(evt): void {
        let scale = util.getCurrentScale(editor.state.scale);
        let mouse = util.getMousePosition(editor.state.clientRect, evt);
        let dx = (mouse.x * scale) - this.state.mousedownX;
        let dy = (mouse.y * scale) - this.state.mousedownY;
        let rect = this.getCropRect();
        if (this.state.activeKnob === Knob.BR) {
            this.setState({
                dw: this.state.dw + dx,
                dh: this.state.dh + dy
            });
        } else if (this.state.activeKnob === Knob.TR) {
            this.setState({
                dy: this.state.dy + dy,
                dw: this.state.dw + dx,
                dh: this.state.dh - dy
            });
        } else if (this.state.activeKnob === Knob.BL) {
            this.setState({
                dx: this.state.dx + dx,
                dh: this.state.dh + dy,
                dw: this.state.dw - dx

            });
        } else if (this.state.activeKnob === Knob.TL) {
            this.setState({
                dx: this.state.dx + dx,
                dy: this.state.dy + dy,
                dw: this.state.dw - dx,
                dh: this.state.dh - dy
            });
        }
        this.setState({
            mousedownX: (mouse.x * scale),
            mousedownY: (mouse.y * scale),
        });
        this.handleCropOverlap(evt);
        this.draw();
    }

    private clear(): void {
        editor.toolCtx.clearRect(0, 0, editor.toolCanvas.width, editor.toolCanvas.height);
    }

    init(): void {
        this.draw();
    }

    draw(): void {
        this.clear();
        let rect = this.getCropRect();
        editor.toolCtx.fillStyle = this.DEF_RESET_FILL;
        editor.toolCtx.fillRect(0, 0, editor.toolCanvas.width, editor.toolCanvas.height);
        editor.toolCtx.clearRect(rect.x, rect.y, rect.w, rect.h);
        editor.toolCtx.strokeStyle = this.DEF_STROKE;
        editor.toolCtx.strokeRect(
            rect.x,
            rect.y,
            rect.w,
            rect.h
        );
        this.drawKnobs();
    }

    private drawKnobs(): void {
        let rect = this.getCropRect();
        // top left
        this.drawCircle(
            rect.x, rect.y,
            this.DEF_KNOB_RADIUS
        );
        // top right
        this.drawCircle(
            rect.x + rect.w,
            rect.y,
            this.DEF_KNOB_RADIUS
        );
        // bottom left
        this.drawCircle(
            rect.x,
            rect.y + rect.h,
            this.DEF_KNOB_RADIUS
        );
        // bottom right
        this.drawCircle(
            rect.x + rect.w,
            rect.y + rect.h,
            this.DEF_KNOB_RADIUS
        );
    }

    private drawCircle(x, y, radius) {
        editor.toolCtx.fillStyle = this.DEF_KNOB_FILL;
        editor.toolCtx.beginPath();
        editor.toolCtx.arc(x, y, radius, 0, 2 * Math.PI);
        editor.toolCtx.fill();
        editor.toolCtx.stroke();
    }

    private isMouseoverKnob(evt): boolean {
        let rect = this.getCropRect();
        let mouse = util.getMousePosition(editor.state.clientRect, evt);
        let pTL: Point = {
            x: rect.x,
            y: rect.y
        };
        let pTR: Point = {
            x: rect.x + rect.w,
            y: rect.y
        };
        let pBL: Point = {
            x: rect.x,
            y: rect.y + rect.h
        };
        let pBR: Point = {
            x: rect.x + rect.w,
            y: rect.y + rect.h
        };
        // top left knob
        if (util.dist(mouse, pTL) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.TL });
            return true;
        }
        // top right knob
        else if (util.dist(mouse, pTR) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.TR });
            return true;
        }
        // bottom left knob
        else if (util.dist(mouse, pBL) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.BL });
            return true;
        }
        // bottom right knob
        else if (util.dist(mouse, pBR) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.BR });
            return true;
        }
        else {
            this.setState({ activeKnob: null });
            return false;
        }
    }

    private isMouseoverRect(evt): boolean {
        let mouse: Point = util.getMousePosition(editor.state.clientRect, evt);
        let rect: Rect = this.getCropRect();
        if(
            mouse.x > rect.x &&
            mouse.y > rect.y &&
            mouse.x < rect.w + rect.x &&
            mouse.y < rect.h + rect.y) {
            return true;
        } else {
            return false;
        }
    }

    // get the amount the crop rect has changed from the cropped image rect
    getCropChange(): RectChange {
        return {
            dx: this.state.dx,
            dy: this.state.dy,
            dw: this.state.dw,
            dh: this.state.dh
        }
    }

    // the current crop rectangle that the user has defined
    private getCropRect(): Rect {
        let scale = util.getCurrentScale(editor.state.scale);
        return {
            x: (-editor.state.sx + editor.state.cropX + this.state.dx) / scale,
            y: (-editor.state.sy + editor.state.cropY + this.state.dy) / scale,
            w: (editor.state.imgW - editor.state.cropW + this.state.dw) / scale,
            h: (editor.state.imgH - editor.state.cropH + this.state.dh) / scale
        }
    }

    // the current cropped image
    private getCroppedImageRect(): Rect {
        let scale = util.getCurrentScale(editor.state.scale);
        return {
            x: (-editor.state.sx + editor.state.cropX) / scale,
            y: (-editor.state.sy + editor.state.cropY) / scale,
            w: (editor.state.imgW - editor.state.cropW) / scale,
            h: (editor.state.imgH - editor.state.cropH) / scale
        }
    }

}

export let cropTool = new CropTool();
