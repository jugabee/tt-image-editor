import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import * as Util from "./util";
import { Rect, RectChange } from "./util";

export interface EditorState {
    sourceX: number;
    sourceY: number;
    sourceW: number;
    sourceH: number;
    scale: number;
    isMousedown: boolean;
    isMousedrag: boolean;
    mousedownX: number;
    mousedownY: number;
    cropRectX: number;
    cropRectY: number;
    cropRectW: number;
    cropRectH: number;
}

export class TTImageEditor {
    private editor: HTMLElement;
    private img: HTMLImageElement;
    private prevDrawImg: HTMLImageElement;
    private toolbar: Toolbar;
    private toolCanvas: HTMLCanvasElement;
    private viewCanvas: HTMLCanvasElement;
    private viewCtx: CanvasRenderingContext2D;
    private drawCanvas: HTMLCanvasElement;
    private drawCtx: CanvasRenderingContext2D;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private memoryCanvas: HTMLCanvasElement;
    private memoryCtx: CanvasRenderingContext2D;
    private readonly DEF_BG_FILL = "gray";
    private readonly DEF_STROKE = "blue";
    private readonly DEF_LINE_W = 2;
    private readonly DEF_SCALE_STEP = 1.1;
    private debug: boolean = false;
    private state: EditorState = {
        isMousedown: false,
        isMousedrag: false,
        mousedownX: 0,
        mousedownY: 0,
        sourceX: 0,
        sourceY: 0,
        sourceW: 0,
        sourceH: 0,
        scale: 1,
        cropRectX: 0,
        cropRectY: 0,
        cropRectW: 0,
        cropRectH: 0
    }

    constructor(img: HTMLImageElement) {
        this.img = img;
        this.init();
        this.toolbar = new Toolbar(this.state);
        this.addListeners();
    }

    private render(): void { }

    private init(): void {
        this.editor = document.getElementById("tt-image-editor");
        this.toolCanvas = this.editor.querySelector("#tt-tool-canvas") as HTMLCanvasElement;
        this.viewCanvas = this.editor.querySelector("#tt-view-canvas") as HTMLCanvasElement;
        this.viewCtx = this.viewCanvas.getContext("2d");
        this.drawCanvas = this.editor.querySelector("#tt-draw-canvas") as HTMLCanvasElement;
        this.drawCtx = this.drawCanvas.getContext("2d");
        this.imageCanvas = this.editor.querySelector("#tt-image-canvas") as HTMLCanvasElement;
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.memoryCanvas = document.querySelector("#tt-memory-canvas") as HTMLCanvasElement;
        this.memoryCtx = this.memoryCanvas.getContext("2d");
        this.drawCanvas.width = this.img.naturalWidth;
        this.drawCanvas.height = this.img.naturalHeight;
        this.imageCanvas.width = this.img.naturalWidth;
        this.imageCanvas.height = this.img.naturalHeight;
        this.memoryCanvas.width = this.img.naturalWidth;
        this.memoryCanvas.height = this.img.naturalHeight;
        this.prevDrawImg = new Image();
        this.prevDrawImg.width = this.imageCanvas.width;
        this.prevDrawImg.height = this.imageCanvas.height;
    }

    private addListeners(): void {
        this.toolbar.onSaveImage.addListener((evt) => this.handleSaveImage(evt));
        this.toolbar.onCropApply.addListener((evt) => this.handleCropApply(evt));
        this.toolbar.pencil.onPencilDrawing.addListener(() => this.draw());
        this.toolbar.pencil.onPencilDrawingFinished.addListener((evt) => this.handlePencilDrawingFinished(evt));
    	this.toolCanvas.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.toolCanvas.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.toolCanvas.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
        // IE9, Chrome, Safari, Opera
        this.toolCanvas.addEventListener("mousewheel", (evt) => this.handleMouseWheel(evt), false);
        // Firefox
        this.toolCanvas.addEventListener("DOMMouseScroll", (evt) => this.handleMouseWheel(evt), false);
        window.addEventListener("resize", (evt) => this.handleResize(evt));
        this.handleResize(null);
    }

    /* *
    * State is set by shallow merge in the setState method.
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

    private handleResize(evt): void {
        let element = this.editor.querySelector("#tt-toolbar");
        this.viewCanvas.width = window.innerWidth;
        this.viewCanvas.height = window.innerHeight - element.clientHeight;
        this.toolCanvas.width = window.innerWidth;
        this.toolCanvas.height = window.innerHeight - element.clientHeight;
        this.setState({ sourceW: this.viewCanvas.width * this.state.scale, sourceH: this.viewCanvas.height * this.state.scale });
        this.draw();
    }

    /**
    * Handle mouse events with abstract activeTool
    */
    private handleMousedown(evt): void {
        let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
        this.setState({
            isMousedown: true,
            mousedownX: mouse.x,
            mousedownY: mouse.y
        });
        let activeTool = this.toolbar.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMousedown(evt);
        }
    }

    private handleMousemove(evt): void {
        if (this.state.isMousedown) {
            this.pan(evt);
        }
        let activeTool = this.toolbar.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMousemove(evt);
        }
    }

    private handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
        let activeTool = this.toolbar.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMouseup(evt);
        }
    }

    private handleMouseWheel(evt): void {
        evt.preventDefault();
        let mouseDelta: number = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
        if (mouseDelta === -1) {
            // zoom out
            this.zoomAtPoint(evt, this.DEF_SCALE_STEP);
        } else {
            // zoom in
            this.zoomAtPoint(evt, 1 / this.DEF_SCALE_STEP);
        }
    }

    private zoomAtPoint(evt, zoom): void {
        let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
        // translate by change in scale (before and after zoom) to give the illusion of zooming towards the mouse cursor
        let dx = (mouse.x * this.state.scale) - (mouse.x * this.state.scale * zoom);
        let dy = (mouse.y * this.state.scale) - (mouse.y * this.state.scale * zoom);
        this.setState({
            sourceX: this.state.sourceX + dx,
            sourceY: this.state.sourceY + dy,
            sourceW: this.state.sourceW * zoom,
            sourceH: this.state.sourceH * zoom,
            scale: this.state.scale * zoom
        });
        this.draw();
    }

    private pan(evt): void {
        if (evt.altKey) {
            let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
            let dx = mouse.x - this.state.mousedownX;
            let dy = mouse.y - this.state.mousedownY;
            this.setState({
                sourceX: this.state.sourceX - (dx * this.state.scale),
                sourceY: this.state.sourceY - (dy * this.state.scale)
            });
            this.draw();
            this.setState({
                isMousedrag: true,
                mousedownX: mouse.x,
                mousedownY: mouse.y
            });
        }
    }

    private clearView(): void {
        this.viewCtx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
    }

    private clearImage(): void {
        this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    }

    private handleSaveImage(evt): void {
        let img: HTMLImageElement = new Image();
        img.onload = () => {
            this.editor.innerHTML = "";
            this.editor.appendChild(img);
        }
        // draw imageCanvas to memoryCanvas
        this.memoryCtx.drawImage(
           this.imageCanvas,
           0, 0,
        );
        // overlay drawCanvas on memoryCanvas
        this.memoryCtx.drawImage(
           this.drawCanvas,
           0, 0,
        );
        // save result
        img.src = this.memoryCanvas.toDataURL();
    }

    private handlePencilDrawingFinished(evt): void {
        this.prevDrawImg.src = this.drawCanvas.toDataURL();
    }

    private handleCropApply(evt): void {
        let rc: RectChange = evt.data;
        // In order to apply a crop to the imageCanvas, cropRectX and Y are used
        // to adjust the source rectangle that draws the imageCanvas onto the
        // viewCanvas. The cropRectW and H are used to adjust the width and
        // height of the imageCanvas. Used in conjunction, they reframe the source
        // image.
        this.setState({
            cropRectX: this.state.cropRectX + rc.dx,
            cropRectY: this.state.cropRectY + rc.dy,
            cropRectW: this.state.cropRectW + rc.dw,
            cropRectH: this.state.cropRectH + rc.dh,
            // adjust sourceX and Y so cropped image draws in the same location
            // that it was cropped in
            sourceX: this.state.sourceX - (rc.dx),
            sourceY: this.state.sourceY - (rc.dy)
        });
        this.drawCanvas.width = this.img.naturalWidth + this.state.cropRectW;
        this.drawCanvas.height = this.img.naturalHeight + this.state.cropRectH;
        this.imageCanvas.width = this.img.naturalWidth + this.state.cropRectW;
        this.imageCanvas.height = this.img.naturalHeight + this.state.cropRectH;
        this.memoryCanvas.width = this.img.naturalWidth + this.state.cropRectW;
        this.memoryCanvas.height = this.img.naturalHeight + this.state.cropRectH;
        this.draw();
        // TODO drawing disappears when cropped; maybe draw to memory canvas,
        // then change the sx and sy when drawing it to draw canvas, then finally
        // draw to view canvas
    }

    private draw(): void {
        this.clearImage();
        this.clearView();
        // draw source image to imageCanvas
        this.imageCtx.drawImage(
            this.img,
            0 + this.state.cropRectX, 0 + this.state.cropRectY,
            this.img.naturalWidth,
            this.img.naturalHeight,
            0, 0,
            this.img.naturalWidth,
            this.img.naturalHeight
        );
        // draw imageCanvas to viewCanvas using a source rectangle transformed by scale and translation state
        this.viewCtx.drawImage(
           this.imageCanvas,
           this.state.sourceX, this.state.sourceY,
           this.state.sourceW,
           this.state.sourceH,
           0, 0,
           this.viewCanvas.width,
           this.viewCanvas.height
        );
        // draw drawCanvas to viewCanvas using a source rectangle transformed by scale and translation state
        this.viewCtx.drawImage(
           this.drawCanvas,
           this.state.sourceX, this.state.sourceY,
           this.state.sourceW,
           this.state.sourceH,
           0, 0,
           this.viewCanvas.width,
           this.viewCanvas.height
        );
        if (this.toolbar.getActiveToolType() === ToolType.Crop) {
            this.toolbar.crop.draw();
        }
    }
}
