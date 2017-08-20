import * as Events from "./event";
import { Tool } from "./tool";
import * as Util from "./util";
import { EditorState } from "./editor";

interface PencilToolState {
    isMousedown: boolean;
    isMousedrag: boolean;
 }

export class PencilTool extends Tool{
    private editorState: EditorState;
    private drawCanvas: HTMLCanvasElement;
    private drawCtx: CanvasRenderingContext2D;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private readonly DEF_STROKE = "green";
    private readonly DEF_RESET_FILL = "white";
    private debug: boolean = false;
    state: PencilToolState = {
        isMousedown: false,
        isMousedrag: false
    }

    onPencilDrawing: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    constructor(state: EditorState) {
        super();
        this.editorState = state;
        this.drawCanvas = document.getElementById("tt-draw-canvas") as HTMLCanvasElement;
        this.drawCtx = this.drawCanvas.getContext("2d");
        this.toolCanvas = document.getElementById("tt-tool-canvas") as HTMLCanvasElement;
        this.toolCtx = this.toolCanvas.getContext("2d");
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
        let mouse = Util.getMousePosition(this.toolCanvas, evt);
        this.setState({ isMousedown: true });
        this.drawCtx.beginPath();
    	this.drawCtx.moveTo(
            (mouse.x * this.editorState.scale) + this.editorState.sourceX,
            (mouse.y * this.editorState.scale) + this.editorState.sourceY
        );
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let mouse = Util.getMousePosition(this.toolCanvas, evt);
            this.setState({ isMousedrag: true });
            this.drawCtx.lineTo(
                (mouse.x * this.editorState.scale) + this.editorState.sourceX,
                (mouse.y * this.editorState.scale) + this.editorState.sourceY
            );
            this.drawCtx.lineWidth = 5;
            this.drawCtx.strokeStyle = "green";
            this.drawCtx.stroke();
            this.onPencilDrawing.emit({ data: true });
        }
    }

    handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
    }

    draw(): void { }

    init(): void { }

}
