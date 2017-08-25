import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import * as Util from "./util";
import { Rect, RectChange } from "./util";

export interface EditorState {
    clientRect: Rect;
    sx: number;
    sy: number;
    imgW: number;
    imgH: number;
    scale: number;
    isMousedown: boolean;
    isMousedrag: boolean;
    mousedownX: number;
    mousedownY: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
}

export class TTImageEditor {
    private editor: HTMLElement;
    private img: HTMLImageElement;
    private toolbarElement: HTMLElement;
    private toolbar: Toolbar;
    private canvasContainer: HTMLElement;
    private pencilCanvas: HTMLCanvasElement;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private viewCanvas: HTMLCanvasElement;
    private viewCtx: CanvasRenderingContext2D;
    private readonly DEF_BG_FILL = "gray";
    private readonly DEF_STROKE = "blue";
    private readonly DEF_LINE_W = 2;
    // enable debug to see state updates in console, and to draw stroked rectangles for
    // the original image and cropped image
    private debug: boolean = false;
    state: EditorState = {
        clientRect: { x: 0, y: 0, w: 0, h: 0 },
        isMousedown: false,
        isMousedrag: false,
        mousedownX: 0,
        mousedownY: 0,
        sx: 0,
        sy: 0,
        imgW: 0,
        imgH: 0,
        scale: 0,
        cropX: 0,
        cropY: 0,
        cropW: 0,
        cropH: 0
    }

    constructor(img: HTMLImageElement) {
        this.img = img;
        this.init();
        this.toolbar = new Toolbar(this.state, this.toolCanvas, this.pencilCanvas);
        this.addListeners();
    }

    private render(): void { }

    private init(): void {
        this.editor = document.getElementById("tt-image-editor");
        this.toolbarElement = this.editor.querySelector("#tt-toolbar") as HTMLElement;
        this.canvasContainer = this.editor.querySelector("#tt-canvases") as HTMLCanvasElement;
        this.toolCanvas = this.editor.querySelector("#tt-tool-canvas") as HTMLCanvasElement;
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.viewCanvas = this.editor.querySelector("#tt-view-canvas") as HTMLCanvasElement;
        this.viewCtx = this.viewCanvas.getContext("2d");
        this.setState({ imgW: this.img.naturalWidth, imgH: this.img.naturalHeight });
        this.pencilCanvas = document.createElement("canvas");
        this.pencilCanvas.width = this.state.imgW;
        this.pencilCanvas.height = this.state.imgH;
    }

    private addListeners(): void {
        this.toolbar.onSaveImage.addListener((evt) => this.handleSaveImage(evt));
        this.toolbar.onCropApply.addListener((evt) => this.handleCropApply(evt));
        this.toolbar.pencil.onPencilDrawing.addListener((evt) => this.handlePencilDrawing(evt));
        this.toolbar.pencil.onPencilDrawingFinished.addListener((evt) => this.handlePencilDrawingFinished(evt));
    	this.canvasContainer.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.canvasContainer.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.canvasContainer.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
        // IE9, Chrome, Safari, Opera
        this.canvasContainer.addEventListener("mousewheel", (evt) => this.handleMouseWheel(evt), false);
        // Firefox
        this.canvasContainer.addEventListener("DOMMouseScroll", (evt) => this.handleMouseWheel(evt), false);
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
        this.viewCanvas.width = window.innerWidth;
        this.viewCanvas.height = window.innerHeight - this.toolbarElement.clientHeight;
        this.toolCanvas.width = window.innerWidth;
        this.toolCanvas.height = window.innerHeight - this.toolbarElement.clientHeight;
        let r: ClientRect = this.canvasContainer.getBoundingClientRect();
        this.setState({ clientRect: { x: r.left, y: r.top, w: r.width, h: r.height } });
        this.draw();
    }

    /**
    * Handle mouse events with abstract activeTool
    */
    private handleMousedown(evt): void {
        let mouse: Util.Point = Util.getMousePosition(this.state.clientRect, evt);
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
        let mouse: Util.Point = Util.getMousePosition(this.state.clientRect, evt);
        // translate by change in scale (before and after zoom) to give the illusion of zooming towards the mouse cursor
        let dx = (mouse.x * s) - (mouse.x * z);
        let dy = (mouse.y * s) - (mouse.y * z);
        this.setState({
            sx: this.state.sx + dx,
            sy: this.state.sy + dy,
            scale: this.state.scale + zoom
        });
        this.draw();
    }

    private pan(evt): void {
        if (evt.altKey) {
            let scale = Util.getCurrentScale(this.state.scale);
            let mouse: Util.Point = Util.getMousePosition(this.state.clientRect, evt);
            let dx = mouse.x - this.state.mousedownX;
            let dy = mouse.y - this.state.mousedownY;
            this.setState({
                sx: this.state.sx - (dx * scale),
                sy: this.state.sy - (dy * scale)
            });
            this.draw();
            this.setState({
                isMousedrag: true,
                mousedownX: mouse.x,
                mousedownY: mouse.y
            });
        }
    }

    private handleSaveImage(evt): void {
        let img: HTMLImageElement = new Image();
        let scale = Util.getCurrentScale(this.state.scale);
        let saveCanvas = document.createElement("canvas");
        let saveCtx = saveCanvas.getContext("2d");
        img.onload = () => {
            this.editor.innerHTML = "";
            this.editor.style.display = "block";
            this.editor.appendChild(img);
        }
        saveCanvas.width = this.state.imgW - this.state.cropW;
        saveCanvas.height = this.state.imgH - this.state.cropH;
        // draw source img to saveCanvas
        saveCtx.drawImage(
            this.img,
            this.state.cropX,
            this.state.cropY,
            (this.state.imgW - this.state.cropW),
            (this.state.imgH - this.state.cropH),
            0, 0,
            saveCanvas.width,
            saveCanvas.height
        );
        // draw pencilCanvas to saveCanvas
        saveCtx.drawImage(
            this.pencilCanvas,
            this.state.cropX,
            this.state.cropY,
            (this.state.imgW - this.state.cropW),
            (this.state.imgH - this.state.cropH),
            0, 0,
            saveCanvas.width,
            saveCanvas.height
        );
        // save result
        img.src = saveCanvas.toDataURL();
    }

    private handlePencilDrawingFinished(evt): void { }

    private handlePencilDrawing(evt): void {
        this.draw();
    }

    private handleCropApply(evt): void {
        let rc: RectChange = evt.data;
        // keep track of the total amount we have cropped
        this.setState({
            cropX: this.state.cropX + rc.dx,
            cropY: this.state.cropY + rc.dy,
            cropW: this.state.cropW - rc.dw,
            cropH: this.state.cropH - rc.dh,
            // adjust sx and sy so cropped image redraws in the same location
            // that it was cropped in
            sx: this.state.sx - (rc.dx),
            sy: this.state.sy - (rc.dy)
        });
        this.toolbar.crop.resetState();
        this.draw();
    }

    private draw(): void {
        this.viewCtx.mozImageSmoothingEnabled = false;
        this.viewCtx.webkitImageSmoothingEnabled = false;
        this.viewCtx.imageSmoothingEnabled = false;
        this.drawImg();
        this.drawPencil();
        if (this.debug) {
            this.drawDebug();
        }
        this.drawCropRect();
    }

    private drawImg(): void {
        let r = this.getImageRect();
        let r2 = this.getCroppedImageRect();
        this.viewCtx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
        if (!this.debug) {
            this.viewCtx.fillStyle = "white";
            // fill a crop rect that the source image will be composited with
            this.viewCtx.fillRect(r2.x, r2.y, r2.w, r2.h);
            // source-atop: The new shape is only drawn where it overlaps the existing canvas content.
            this.viewCtx.globalCompositeOperation = "source-atop";
        }
        this.viewCtx.drawImage(
            this.img,
            r.x,
            r.y,
            r.w,
            r.h
        );
        this.viewCtx.globalCompositeOperation = "source-over";
    }

    private drawPencil(): void {
        let r = this.getImageRect();
        // draw the pencilCanvas to the viewCanvas
        // source-atop: The new shape is only drawn where it overlaps the existing canvas content.
        this.viewCtx.globalCompositeOperation = "source-atop";
        this.viewCtx.drawImage(
            this.pencilCanvas,
            r.x,
            r.y,
            r.w,
            r.h
        );
        this.viewCtx.globalCompositeOperation = "source-over";
    }

    private drawCropRect() {
        // update the crop rectangle if it is active
        if (this.toolbar.getActiveToolType() === ToolType.Crop) {
            this.toolbar.crop.draw();
        }
    }

    private drawDebug(): void {
        let r = this.getImageRect();
        let r2 = this.getCroppedImageRect();
        this.viewCtx.strokeStyle = "blue";
        this.viewCtx.lineWidth = 3;
        this.viewCtx.strokeRect(r.x, r.y, r.w, r.h);
        this.viewCtx.strokeStyle = "red";
        this.viewCtx.strokeRect(r2.x, r2.y, r2.w, r2.h);
    }

    // returns a Rect for the boundary of the cropped image
    private getCroppedImageRect(): Rect {
        let scale = Util.getCurrentScale(this.state.scale);
        return {
            x: (-this.state.sx) / scale,
            y: (-this.state.sy) / scale,
            w: (this.state.imgW - this.state.cropW) / scale,
            h: (this.state.imgH - this.state.cropH) / scale
        }
    }

    // returns a Rect for the boundary of the image on the viewCanvas
    private getImageRect(): Rect {
        let scale = Util.getCurrentScale(this.state.scale);
        return {
            x: (-this.state.sx - this.state.cropX) / scale,
            y: (-this.state.sy - this.state.cropY) / scale,
            w: (this.state.imgW) / scale,
            h: (this.state.imgH) / scale
        }
    }
}
