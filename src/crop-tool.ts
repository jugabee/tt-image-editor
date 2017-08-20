import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { EditorState } from "./editor";

interface CropToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
    activeKnob: Knob | null;
    isResizable: boolean;
    mousedownX: number;
    mousedownY: number;
    dx: number;
    dy: number;
    dw: number;
    dh: number;
}

export interface Rect {
    x: number,
    y: number,
    w: number,
    h: number
};

enum Knob {
    TL,
    BR
}

export class CropTool extends Tool{
    private editorState: EditorState;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private readonly DEF_TEXT_FILL = "white";
    private readonly DEF_STROKE = "blue";
    private readonly DEF_RESET_FILL = "rgba(0, 0, 0, 0.4)";
    private readonly DEF_KNOB_FILL = "rgb(255, 255, 255)";
    private readonly DEF_KNOB_RADIUS = 6;
    private readonly DEF_LINE_W = 1;
    // rounded rectangle at center of crop tool that displays dimensions
    private readonly DEF_RRECT_W = 72;
    private readonly DEF_RRECT_H = 18;
    private readonly DEF_RRECT_R = 5;
    private debug: boolean = true;
    state: CropToolState = {
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
    }

    onCropResizing: Events.Dispatcher<{}> = Events.Dispatcher.createEventDispatcher();

    constructor(state: EditorState) {
        super();
        this.editorState = state;
        this.toolCanvas = document.getElementById("tt-tool-canvas") as HTMLCanvasElement;
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.imageCanvas = document.getElementById("tt-image-canvas") as HTMLCanvasElement;
        this.imageCtx = this.toolCanvas.getContext("2d");
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
        let mouse = Util.getMousePosition(this.toolCanvas, evt);
        this.setState({
            isMousedown: true,
            mousedownX: (mouse.x * this.editorState.scale),
            mousedownY: (mouse.y * this.editorState.scale)
        });
    }

    handleMousemove(evt): void {
        // TODO disable when panning
        if (this.state.isMousedown) {
            this.setState({ isMousedrag: true });
            if (this.state.isResizable) {
                let mouse = Util.getMousePosition(this.toolCanvas, evt);
                let rect = this.getImageRect();
                let dx = (mouse.x * this.editorState.scale) - this.state.mousedownX;
                let dy = (mouse.y * this.editorState.scale) - this.state.mousedownY;
                if (this.state.activeKnob === Knob.BR) {
                    this.setState({
                        dw: this.state.dw + dx,
                        dh: this.state.dh + dy
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
                    mousedownX: (mouse.x * this.editorState.scale),
                    mousedownY: (mouse.y * this.editorState.scale),
                });
                this.draw();
            }

        } else {
            if(this.isMouseoverKnob(evt)) {
                this.setState({ isResizable: true });
            } else {
                this.setState({ isResizable: false });
            }
        }
    }

    handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
    }

    private clear(): void {
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
    }

    init(): void {
        this.draw();
    }

    draw(): void {
        this.clear();
        // TODO draw resizing rectangle here, then on crop apply actually resize the canvases.
        // lock w / h to max of imageCanvas and have a minimum size
        let rect = this.getImageRect();
        this.toolCtx.strokeStyle = this.DEF_STROKE;
        this.toolCtx.strokeRect(
            rect.x,
            rect.y,
            rect.w,
            rect.h
        );
        this.drawKnobs();
    }

    private drawKnobs(): void {
        let rect = this.getImageRect();
        // top left
        this.drawCircle(
            rect.x, rect.y,
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
        this.toolCtx.fillStyle = this.DEF_KNOB_FILL;
        this.toolCtx.beginPath();
        this.toolCtx.arc(x, y, radius, 0, 2 * Math.PI);
        this.toolCtx.fill();
        this.toolCtx.stroke();
    }

    private isMouseoverKnob(evt): boolean {
        let rect = this.getImageRect();
        let mouse = Util.getMousePosition(this.toolCanvas, evt);
        let pTL: Util.Point = {
            x: rect.x,
            y: rect.y
        };
        let pBR: Util.Point = {
            x: rect.x + rect.w,
            y: rect.y + rect.h
        };
        // top left knob
        if (Util.dist(mouse, pTL) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.TL });
            return true;
        }
        // bottom right knob
        else if (Util.dist(mouse, pBR) <= this.DEF_KNOB_RADIUS) {
            this.setState({ activeKnob: Knob.BR });
            return true;
        }
        else {
            return false;
        }
    }

    private getImageRect(): Rect {
        return {
            x: (-this.editorState.sourceX + this.state.dx) / this.editorState.scale,
            y: (-this.editorState.sourceY + this.state.dy) / this.editorState.scale,
            w: (this.imageCanvas.width + this.state.dw) / this.editorState.scale,
            h: (this.imageCanvas.height + this.state.dh) / this.editorState.scale
        }
    }

}
