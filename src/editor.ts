import * as Events from "./event";
import { Tool } from "./tool";
import { ToolbarUI } from "./toolbar";
import { Pencil, PencilSize } from "./pencil-tool";
import { Crop } from "./crop-tool";
import * as Util from "./util";
import { Rect, RectChange } from "./util";

export enum ToolType {
    CROP,
    PENCIL
}

interface EditorState {
    activeTool: ToolType | null;
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
    private canvasContainer: HTMLElement;
    private memoryCanvas: HTMLCanvasElement;
    private memoryCtx: CanvasRenderingContext2D;
    private pencilCanvas: HTMLCanvasElement;
    pencilCtx: CanvasRenderingContext2D;
    toolCanvas: HTMLCanvasElement;
    toolCtx: CanvasRenderingContext2D;
    private viewCanvas: HTMLCanvasElement;
    viewCtx: CanvasRenderingContext2D;
    // enable debug to see state updates in console, and to draw stroked rectangles for
    // the original image and cropped image
    private debug: boolean = false;
    state: EditorState = {
        activeTool: null,
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

    constructor() { }

    init(img: HTMLImageElement): void {
        this.img = img;
        this.setState({ imgW: this.img.naturalWidth, imgH: this.img.naturalHeight });

        this.editor = document.getElementById("tt-image-editor");
        this.toolbarElement = this.editor.querySelector("#toolbar") as HTMLElement;
        this.canvasContainer = this.editor.querySelector("#layers") as HTMLCanvasElement;
        this.toolCanvas = this.editor.querySelector("#tool-layer") as HTMLCanvasElement;
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.viewCanvas = this.editor.querySelector("#view-layer") as HTMLCanvasElement;
        this.viewCtx = this.viewCanvas.getContext("2d");
        this.pencilCanvas = document.createElement("canvas");
        this.pencilCtx = this.pencilCanvas.getContext("2d");
        this.memoryCanvas = document.createElement("canvas");
        this.memoryCtx = this.memoryCanvas.getContext("2d");

        this.pencilCanvas.width = this.state.imgW;
        this.pencilCanvas.height = this.state.imgH;
        this.memoryCanvas.width = this.state.imgW;
        this.memoryCanvas.height = this.state.imgH;
        // Draw source image
        this.memoryCtx.drawImage(this.img, 0, 0);

        ToolbarUI.init();
        this.addListeners();
    }

    private addListeners(): void {
        Pencil.onPencilDrawing.addListener((evt) => this.handlePencilDrawing(evt));
        Pencil.onPencilDrawingFinished.addListener((evt) => this.handlePencilDrawingFinished(evt));
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

    /**
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
        let activeTool = this.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMousedown(evt);
        }
    }

    private handleMousemove(evt): void {
        if (this.state.isMousedown) {
            this.pan(evt);
        }
        let activeTool = this.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMousemove(evt);
        }
    }

    private handleMouseup(evt): void {
        this.setState({ isMousedown: false, isMousedrag: false });
        let activeTool = this.getActiveTool();
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

    private getActiveTool(): Tool {
        switch(this.state.activeTool) {
            case ToolType.PENCIL:
                return Pencil;
            case ToolType.CROP:
                return Crop;
            default:
                return null;
        }
    }

    setActiveTool(type: ToolType | null): void {
        this.state.activeTool = type;
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
        if (type !== null) {
            this.getActiveTool().init();
        } else {
            this.toolCanvas.style.cursor = "default";
            ToolbarUI.deactivateAllToolButtons();
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

    save(): void {
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
        // draw memoryCanvas to saveCanvas with crop applied to source rectangle
        saveCtx.drawImage(
            this.memoryCanvas,
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

    crop(rc: RectChange): void {
        // keep track of the total amount we have cropped
        this.setState({
            cropX: this.state.cropX + rc.dx,
            cropY: this.state.cropY + rc.dy,
            cropW: this.state.cropW - rc.dw,
            cropH: this.state.cropH - rc.dh
        });
        Crop.resetState();
        this.draw();
    }

    private handlePencilDrawingFinished(evt): void {
        this.memoryCtx.globalCompositeOperation = Pencil.getComposite();
        this.memoryCtx.drawImage(
            this.pencilCanvas,
            0, 0
        );
        this.pencilCtx.clearRect(0, 0, this.pencilCtx.canvas.width, this.pencilCtx.canvas.height);
        this.memoryCtx.globalCompositeOperation = "source-over";
        this.draw();
    }

    private handlePencilDrawing(evt): void {
        this.draw();
    }

    /**
    * memoryCanvas is the aggregate of the source image and all pencil drawings
    * with various composite effects, e.g destination-out for erasing.
    * It's never cleared and is drawn to the viewCanvas and used to
    * save the final image.
    *
    * Each pencil drawing is drawn to the memoryCanvas with a particular composite
    * when onPencilDrawingFinished is emitted.
    *
    * The memoryCanvas is drawn to the viewCanvas with a destination rectangle
    * defined by how much we have panned or scaled. This gives the illusion of
    * panning / zooming on particular mouse events.
    *
    * Cropping is handle by clearing everything on the viewCanvas outside of a
    * rect defined by the total amount the user has cropped.
    */
    private draw(): void {
        this.viewCtx.mozImageSmoothingEnabled = false;
        this.viewCtx.webkitImageSmoothingEnabled = false;
        this.viewCtx.imageSmoothingEnabled = false;
        this.drawFromMemory();
        this.drawPencil();
        if (this.debug) {
            this.drawDebug();
        } else {
            this.clearOutsideImageRect();
        }
        this.drawCropRect();
    }

    private drawFromMemory(): void {
        let r = this.getImageRect();
        let r2 = this.getCroppedImageRect();
        this.viewCtx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
        this.viewCtx.drawImage(
            this.memoryCanvas,
            r.x,
            r.y,
            r.w,
            r.h
        );

    }

    /**
    * Draws the pencilCanvas to the viewCanvas in order to see the pencil as
    * it is drawn.
    *
    * When the pencil drawing is finished it is drawn to the memoryCanvas
    * and draw is called again to clear the viewCanvas and redraw the memoryCanvas.
    */
    private drawPencil(): void {
        let r = this.getImageRect();
        this.viewCtx.globalCompositeOperation = Pencil.getComposite();
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
        // redraw the crop rectangle if it is active
        if (this.state.activeTool === ToolType.CROP) {
            Crop.draw();
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
            x: (-this.state.sx + this.state.cropX) / scale,
            y: (-this.state.sy + this.state.cropY) / scale,
            w: (this.state.imgW - this.state.cropW) / scale,
            h: (this.state.imgH - this.state.cropH) / scale
        }
    }

    // returns a Rect for the boundary of the image on the viewCanvas
    private getImageRect(): Rect {
        let scale = Util.getCurrentScale(this.state.scale);
        return {
            x: (-this.state.sx) / scale,
            y: (-this.state.sy) / scale,
            w: (this.state.imgW) / scale,
            h: (this.state.imgH) / scale
        }
    }

    // clear everything on the view canvas outside of a rect
    private clearOutsideImageRect(): void {
       let r: Rect = this.getCroppedImageRect();
       this.viewCtx.clearRect(0, 0, this.viewCanvas.width, r.y);
       this.viewCtx.clearRect(0, 0, r.x, this.viewCanvas.height);
       this.viewCtx.clearRect(r.x + r.w, 0, this.viewCanvas.width - (r.x + r.w), this.viewCanvas.height);
       this.viewCtx.clearRect(0, r.y + r.h, this.viewCanvas.width, this.viewCanvas.height - (r.y + r.h));
       this.viewCtx.strokeStyle = "rgba(0, 0, 0, .5)";
       this.viewCtx.strokeRect(r.x, r.y, r.w, r.h);
   }
}

export let Editor = new TTImageEditor();
