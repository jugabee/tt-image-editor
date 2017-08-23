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
    private drawCanvas: HTMLCanvasElement;
    private drawCtx: CanvasRenderingContext2D;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private points: Array<Point> = [];
    private readonly DEF_STROKE = "green";
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
        let scale = Util.getCurrentScale(this.editorState.scale);
        let mouse = Util.getMousePosition(this.toolCanvas, evt);
        this.points.push(mouse);
        this.setState({ isMousedown: true });
        // this.drawCtx.beginPath();
    	// this.drawCtx.moveTo(
        //     (mouse.x * scale) + this.editorState.sourceX + this.editorState.cropRectX,
        //     (mouse.y * scale) + this.editorState.sourceY + this.editorState.cropRectY
        // );
    }

    handleMousemove(evt): void {
        if (this.state.isMousedown) {
            let scale = Util.getCurrentScale(this.editorState.scale);
            let mouse = Util.getMousePosition(this.toolCanvas, evt);
            this.points.push(mouse);
            this.setState({ isMousedrag: true });
            // this.drawCtx.lineTo(
            //     (mouse.x * scale) + this.editorState.sourceX + this.editorState.cropRectX,
            //     (mouse.y * scale) + this.editorState.sourceY + this.editorState.cropRectY
            // );
            // this.drawCtx.lineWidth = 5;
            // this.drawCtx.strokeStyle = "green";
            // this.drawCtx.stroke();
            let p1 = this.points[0];
            let p2 = this.points[1];
            this.drawCtx.lineWidth = this.DEF_LINE_WIDTH;
            this.drawCtx.lineJoin = this.DEF_LINE_JOIN;
            this.drawCtx.lineCap = this.DEF_LINE_CAP;
            this.drawCtx.beginPath();
            this.drawCtx.moveTo(p1.x, p1.y);
            console.log(this.points);

            for (let i = 1, len = this.points.length; i < len; i++) {
                // we pick the point between pi+1 & pi+2 as the
                // end point and p1 as our control point
                let midPoint = Util.midpoint(p1, p2);
                this.drawCtx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
                p1 = this.points[i];
                p2 = this.points[i+1];
            }
            // Draw last line as a straight line while
            // we wait for the next point to be able to calculate
            // the bezier control point
            this.drawCtx.lineTo(p1.x, p1.y);
            this.drawCtx.stroke();
            this.onPencilDrawing.emit({ data: true });
        }
    }

    handleMouseup(evt): void {
        this.points.length = 0;
        this.onPencilDrawingFinished.emit({ data: true });
        this.setState({ isMousedown: false, isMousedrag: false });
    }

    draw(): void { }

    init(): void { }

}
