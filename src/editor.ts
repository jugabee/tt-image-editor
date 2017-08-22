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
    private debug: boolean = false;
    state: EditorState = {
        isMousedown: false,
        isMousedrag: false,
        mousedownX: 0,
        mousedownY: 0,
        sourceX: 0,
        sourceY: 0,
        sourceW: 0,
        sourceH: 0,
        scale: 0,
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
        let scale = Util.getCurrentScale(this.state.scale);
        this.setState({ sourceW: this.viewCanvas.width * scale, sourceH: this.viewCanvas.height * scale });
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
            this.zoomAtPoint(evt, 1);
        } else {
            // zoom in
            this.zoomAtPoint(evt, -1);
        }
    }

    private zoomAtPoint(evt, zoom): void {
        let s = Util.getCurrentScale(this.state.scale);
        let z = Util.getCurrentScale(this.state.scale + zoom);
        let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
        // translate by change in scale (before and after zoom) to give the illusion of zooming towards the mouse cursor
        let dx = (mouse.x * s) - (mouse.x * z);
        let dy = (mouse.y * s) - (mouse.y * z);
        this.setState({
            sourceX: this.state.sourceX + dx,
            sourceY: this.state.sourceY + dy,
            sourceW: this.state.sourceW,
            sourceH: this.state.sourceH,
            scale: this.state.scale + zoom
        });
        this.draw();
    }

    private pan(evt): void {
        if (evt.altKey) {
            let scale = Util.getCurrentScale(this.state.scale);
            let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
            let dx = mouse.x - this.state.mousedownX;
            let dy = mouse.y - this.state.mousedownY;
            this.setState({
                sourceX: this.state.sourceX - (dx * scale),
                sourceY: this.state.sourceY - (dy * scale)
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
        let scale = Util.getCurrentScale(this.state.scale);
        let r: Rect = this.getImageRect();
        img.onload = () => {
            this.editor.innerHTML = "";
            this.editor.style.display = "block";
            this.editor.appendChild(img);
        }

        this.memoryCanvas.width = r.w * scale;
        this.memoryCanvas.height = r.h * scale;
        // draw imageCanvas to memoryCanvas
        this.memoryCtx.drawImage(
           this.imageCanvas,
           0, 0,
        );
        // draw drawCanvas to memoryCanvas
        this.memoryCtx.drawImage(
           this.drawCanvas,
           -this.state.cropRectX, -this.state.cropRectY
        );
        // save result
        img.src = this.memoryCanvas.toDataURL();
    }

    private handlePencilDrawingFinished(evt): void {
        this.prevDrawImg.src = this.drawCanvas.toDataURL();
    }

    private handleCropApply(evt): void {
        let rc: RectChange = evt.data;
        // keep track of the total amount we have cropped; this is used in
        // calculating the source rectangle when drawing the source img to the imageCanvas
        // and when drawing the drawCanvas to the viewCanvas
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
        this.draw();
    }

    private draw(): void {
        let scale = Util.getCurrentScale(this.state.scale);
        this.clearImage();
        this.clearView();
        // draw source image to imageCanvas
        this.imageCtx.drawImage(
            this.img,
            this.state.cropRectX,
            this.state.cropRectY,
            this.img.naturalWidth + this.state.cropRectW,
            this.img.naturalHeight + this.state.cropRectH,
            0, 0,
            this.img.naturalWidth + this.state.cropRectW,
            this.img.naturalHeight + this.state.cropRectH
        );
        // draw imageCanvas to viewCanvas
        this.viewCtx.drawImage(
           this.imageCanvas,
           this.state.sourceX, this.state.sourceY,
           this.state.sourceW * scale,
           this.state.sourceH * scale,
           0, 0,
           this.viewCanvas.width,
           this.viewCanvas.height
        );
        // draw drawCanvas to viewCanvas
        this.viewCtx.drawImage(
           this.drawCanvas,
           this.state.sourceX + this.state.cropRectX,
           this.state.sourceY + this.state.cropRectY,
           this.state.sourceW * scale,
           this.state.sourceH * scale,
           0, 0,
           this.viewCanvas.width,
           this.viewCanvas.height
        );
        // clear drawing canvas marks outside boundary of image rect

        if (this.toolbar.getActiveToolType() === ToolType.Crop) {
            this.toolbar.crop.draw();
        }
        if (this.debug) {
            let r = this.getImageRect();
            this.viewCtx.strokeRect(r.x, r.y, r.w, r.h);
            let r2 = this.getImageRectWithoutCrop();
            this.viewCtx.strokeRect(r2.x, r2.y, r2.w, r2.h);
        } else {
            this.clearOutsideImageRect();
        }
    }

    private clearOutsideImageRect() {
        let r: Rect = this.getImageRect();
        this.viewCtx.clearRect(0, 0, this.viewCanvas.width, r.y);
        this.viewCtx.clearRect(0, r.y, r.x, Math.abs(r.y) + r.h);
        this.viewCtx.clearRect(r.x + r.w, r.y, this.viewCanvas.width - (r.x + r.w), Math.abs(r.y) + r.h);
        this.viewCtx.clearRect(0, r.y + r.h, this.viewCanvas.width, this.viewCanvas.height - (r.y + r.h));
    }

    // returns a Rect for the boundary of the image on the viewCanvas factoring in
    // the amount cropped so far
    getImageRect(): Rect {
        let scale = Util.getCurrentScale(this.state.scale);
        return {
            x: (-this.state.sourceX) / scale,
            y: (-this.state.sourceY) / scale,
            w: (this.imageCanvas.width + this.state.cropRectW) / scale,
            h: (this.imageCanvas.height + this.state.cropRectH) / scale
        }
    }

    // returns a Rect for the boundary of the image on the viewCanvas without
    // adjusting for cropping. This is used in debug mode only to show the original
    // image rect
    getImageRectWithoutCrop(): Rect {
        let scale = Util.getCurrentScale(this.state.scale);
        return {
            x: (-this.state.sourceX) / scale,
            y: (-this.state.sourceY) / scale,
            w: (this.imageCanvas.width) / scale,
            h: (this.imageCanvas.height) / scale
        }
    }
}
