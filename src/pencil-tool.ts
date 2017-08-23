import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { Point } from "./util";
import { EditorState } from "./editor";

interface PencilToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
 }

export class PencilTool extends Tool{
    private editorState: EditorState;
    private scratchCanvas: HTMLCanvasElement;
    private scratchCtx: CanvasRenderingContext2D;
    private readonly DEF_STROKE = "black";
    private readonly DEF_RESET_FILL = "white";
    private readonly DEF_LINE_WIDTH = 10;
    private readonly DEF_LINE_CAP = "round";
    private readonly DEF_LINE_JOIN = "round";
    private debug: boolean = false;

    state: PencilToolState = {
        isMousedown: false,
        isMousedrag: false,
    }

    onPencilDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPencilDrawingFinished: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor(state: EditorState, canvas: HTMLCanvasElement) {
        super();
        this.editorState = state;
        this.scratchCanvas = canvas;
        this.scratchCtx = this.scratchCanvas.getContext("2d");
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
        let scale = Util.getCurrentScale(this.editorState.scale);
        let mouse = Util.getMousePosition(this.editorState.clientRect, evt);
        this.setState({ isMousedown: true });
        this.scratchCtx.beginPath();
    	this.scratchCtx.moveTo(
            (mouse.x * scale) + this.editorState.sx + this.editorState.cropX,
            (mouse.y * scale) + this.editorState.sy + this.editorState.cropY
        );
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let scale = Util.getCurrentScale(this.editorState.scale);
            let mouse = Util.getMousePosition(this.editorState.clientRect, evt);
            this.setState({ isMousedrag: true });
            this.scratchCtx.lineTo(
                (mouse.x * scale) + this.editorState.sx + this.editorState.cropX,
                (mouse.y * scale) + this.editorState.sy + this.editorState.cropY
            );
            this.scratchCtx.lineWidth = this.DEF_LINE_WIDTH;
            this.scratchCtx.strokeStyle = this.DEF_STROKE;
            this.scratchCtx.lineJoin = this.DEF_LINE_JOIN;
            this.scratchCtx.lineCap = this.DEF_LINE_CAP;
            this.scratchCtx.stroke();
            this.onPencilDrawing.emit({ data: true });
        }
    }

    handleMouseup(evt): void {
        this.onPencilDrawingFinished.emit({ data: true });
        this.setState({ isMousedown: false, isMousedrag: false });
    }

    draw(): void { }

    init(): void { }

}
