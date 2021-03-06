import * as events from "./event";
import { Tool } from "./tool";
import { toolbar } from "./toolbar";
import { pencilTool } from "./pencil-tool";
import { cropTool } from "./crop-tool";
import { sprayTool } from "./spray-tool";
import { colorPickerTool } from "./color-picker-tool";
import { undoRedo } from "./undo-redo";
import * as util from "./util";
import { Rect, RectChange, Color } from "./util";
import { keyMap } from "./key-map";
import "./wheel";

export enum ToolType {
    CROP,
    PENCIL,
    SPRAY,
    COLOR
}

export interface EditorState {
    activeTool: ToolType | null;
    isDrawing: boolean;
    drawCanvasNeedsUpdate: boolean;
    color: Color;
    clientRect: Rect;
    sx: number;
    sy: number;
    imgW: number;
    imgH: number;
    scale: number;
    isMousedown: boolean;
    mousedownX: number;
    mousedownY: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
}

class TTImageEditor {
    editorElement: HTMLElement;
    img: HTMLImageElement;
    private toolbarElement: HTMLElement;
    private canvasContainer: HTMLElement;
    private memoryCanvas: HTMLCanvasElement;
    memoryCtx: CanvasRenderingContext2D;
    private drawingCanvas: HTMLCanvasElement;
    drawingCtx: CanvasRenderingContext2D;
    toolCanvas: HTMLCanvasElement;
    toolCtx: CanvasRenderingContext2D;
    private viewCanvas: HTMLCanvasElement;
    viewCtx: CanvasRenderingContext2D;
    // enable debug to see state updates in console, and to draw stroked rectangles for
    // the original image and cropped image
    private debug: boolean = false;
    state: EditorState = {
        activeTool: null,
        isDrawing: false,
        drawCanvasNeedsUpdate: false,
        color: { r: 0, g: 0, b: 0, a: 1 },
        clientRect: { x: 0, y: 0, w: 0, h: 0 },
        isMousedown: false,
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

    onColorSampled: events.Dispatcher<string> = events.Dispatcher.createEventDispatcher();

    constructor() {}

    init(img: HTMLImageElement, container: HTMLElement): void {
        container.innerHTML =
            `<div id="tt-image-editor">
                <div id="help-modal-container">
                    <div id="help-modal" class="modal">
                        <div class="modal-content">
                            <span class="close">&times;</span>
                            ${ keyMap.getFormattedHelp() }
                        </div>
                    </div>
                </div>
                <div id="toolbar-wrapper">
                    <div id="toolbar"></div>
                </div>
                <div id="layers">
                    <canvas id="tool-layer" width="800" height="600"></canvas>
                    <canvas id="view-layer" width="800" height="600"></canvas>
                </div>
            </div>`;
        this.editorElement = container.querySelector("#tt-image-editor") as HTMLElement;
        this.editorElement.setAttribute("tabindex", "0");
        this.toolbarElement = this.editorElement.querySelector("#toolbar") as HTMLElement;
        this.canvasContainer = this.editorElement.querySelector("#layers") as HTMLCanvasElement;
        this.toolCanvas = this.editorElement.querySelector("#tool-layer") as HTMLCanvasElement;
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.viewCanvas = this.editorElement.querySelector("#view-layer") as HTMLCanvasElement;
        this.viewCtx = this.viewCanvas.getContext("2d");
        this.drawingCanvas = document.createElement("canvas");
        this.drawingCtx = this.drawingCanvas.getContext("2d");
        this.memoryCanvas = document.createElement("canvas");
        this.memoryCtx = this.memoryCanvas.getContext("2d");
        this.editorElement.focus();
        this.loadImage(img);
        toolbar.init();
        this.addListeners();
        this.handleResize(null);
        // center image on viewCanvas after it is intially resized
        this.centerImage();
    }

    private addListeners(): void {
        colorPickerTool.onColorPicked.addListener((evt) => { this.handleColorPicked(evt) });
        pencilTool.onDrawing.addListener((evt) => this.handleOnDrawing(evt));
        pencilTool.onDrawingFinished.addListener((evt) => this.handleDrawingFinished(evt));
        sprayTool.onDrawing.addListener((evt) => this.handleOnDrawing(evt));
        sprayTool.onDrawingFinished.addListener((evt) => this.handleDrawingFinished(evt));
        this.editorElement.addEventListener("keydown", (evt) => this.handleKeydown(evt));
    	this.canvasContainer.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.canvasContainer.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.canvasContainer.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
        window.addEventListener("resize", (evt) => this.handleResize(evt));
        (<any>window).addWheelListener(this.canvasContainer, (evt) => {
            this.handleMouseWheel(evt);
            evt.preventDefault();
        });
    }

    /**
    * Load a new image and reset the necessary editor state
    */
    loadImage(img: HTMLImageElement): void {
        let w: number = img.naturalWidth;
        let h: number = img.naturalHeight;
        this.setState({
            isDrawing: false,
            drawCanvasNeedsUpdate: false,
            isMousedown: false,
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
        });
        // reset the old undo / redo stack
        undoRedo.clear();
        this.img = img;
        this.setState({ imgW: w, imgH: h });
        this.setImageCanvasDimensions(w, h);
        this.memoryCtx.clearRect(0, 0, w, h);
        this.memoryCtx.drawImage(this.img, 0, 0);
        this.draw();
    }

    /**
    * Initialize drawing and memory canvas dimensions. They should always be the
    * size of the current image.
    */
    private setImageCanvasDimensions(w: number, h: number): void {
        this.drawingCanvas.width = w;
        this.drawingCanvas.height = h;
        this.memoryCanvas.width = w;
        this.memoryCanvas.height = h;
    }

    centerImage(): void {
        this.setState({
            sx: -(this.viewCanvas.width / 2) + (this.state.imgW / 2),
            sy: -(this.viewCanvas.height / 2) + (this.state.imgH / 2)
        })
        this.draw();
    }

    /**
    * State is set by shallow merge in the setState method.
    * setState takes an object parameter with valid state and merges it with
    * the existing state object.
    */
    setState(obj): void {
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
        let w: number = window.innerWidth;
        let h: number = window.innerHeight - this.toolbarElement.clientHeight;
        this.viewCanvas.width = w;
        this.viewCanvas.height = h;
        this.toolCanvas.width = w;
        this.toolCanvas.height = h;
        let r: ClientRect = this.canvasContainer.getBoundingClientRect();
        this.setState({ clientRect: { x: r.left, y: r.top, w: r.width, h: r.height } });
        this.draw();
    }

    private handleKeydown(evt): void {
        if (keyMap.isUndo(evt)) {
            this.undo();
        } else if (keyMap.isRedo(evt)) {
            this.redo();
        } else if (keyMap.isSave(evt)) {
            this.save();
        } else if (keyMap.isLoad(evt)) {
            toolbar.handleLoadBtn();
        } else if (keyMap.isCropTool(evt)) {
            toolbar.handleCropBtn();
        } else if (keyMap.isColorPickerTool(evt)) {
            toolbar.handleColorBtn();
        } else if (keyMap.isCropApplyTool(evt)) {
            if (this.state.activeTool === ToolType.CROP) {
                toolbar.handleCropApplyBtn();
            }
        } else if (keyMap.isPencilTool(evt)) {
            toolbar.handlePencilBtn();
        } else if (keyMap.isPencilEraserTool(evt) && this.state.activeTool === ToolType.PENCIL) {
                toolbar.handlePencilEraserBtn();
        } else if (keyMap.isSprayTool(evt)) {
            toolbar.handleSprayBtn();
        } else if (keyMap.isSprayEraserTool(evt) && this.state.activeTool === ToolType.SPRAY) {
            toolbar.handleSprayEraserBtn();
        } else if (keyMap.isHelp(evt)) {
            toolbar.toggleHelpModal();
        }
    }

    /**
    * Handle mouse events with abstract activeTool
    */
    private handleMousedown(evt): void {
        let mouse: util.Point = util.getMousePosition(this.state.clientRect, evt);
        this.setState({
            isMousedown: true,
            mousedownX: mouse.x,
            mousedownY: mouse.y
        });
        if (!this.state.isDrawing && keyMap.isColorSample(evt)) {
            this.sampleColorAtPoint(mouse);
        } else {
            let activeTool = this.getActiveTool();
            if (activeTool !== null) {
                activeTool.handleMousedown(evt);
            }
        }
    }

    private handleMousemove(evt): void {
        let mouse: util.Point = util.getMousePosition(this.state.clientRect, evt);
        if (this.state.isMousedown && !this.state.isDrawing && keyMap.isColorSample(evt)) {
            this.sampleColorAtPoint(mouse);
        } else if (this.state.isMousedown && !this.state.isDrawing && keyMap.isPan(evt)) {
            this.pan(mouse);
        } else {
            let activeTool = this.getActiveTool();
            if (activeTool !== null) {
                activeTool.handleMousemove(evt);
            }
        }
    }

    private handleMouseup(evt): void {
        this.setState({ isMousedown: false });
        let activeTool = this.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMouseup(evt);
        }
    }

    private handleMouseWheel(evt): void {
        let dx = evt.deltaX;
        let dy = evt.deltaY;
        if (dx > 0 ) {
            dx = 1;
        } else if (dx < 0) {
            dx = -1;
        }
        if (dy > 0 ) {
            dy = 1;
        } else if (dy < 0) {
            dy = -1;
        }
        if (keyMap.isWheelZoom(evt)) {
            this.zoomAtPoint(evt, dy);
        }
    }

    private handleColorPicked(evt): void {
        this.setState({ color: evt.data });
    }

    private getActiveTool(): Tool {
        switch (this.state.activeTool) {
            case ToolType.PENCIL:
                return pencilTool;
            case ToolType.SPRAY:
                return sprayTool;
            case ToolType.CROP:
                return cropTool;
            case ToolType.COLOR:
                return colorPickerTool;
            default:
                return null;
        }
    }

    setActiveTool(type: ToolType | null): void {
        this.state.activeTool = type;
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
        this.toolCanvas.style.cursor = "default";
        if (type !== null) {
            this.getActiveTool().init();
        }
    }

    private sampleColorAtPoint(mouse): void {
        let pixel = this.viewCtx.getImageData(mouse.x, mouse.y, 1, 1);
        let data = pixel.data;
        let color = { r: data[0], g: data[1], b: data[2], a: 1 };
        this.setState({ color: color });
        this.onColorSampled.emit({ data: util.colorToString(color) });
    }

    private zoomAtPoint(evt, zoom): void {
        let s = util.getCurrentScale(this.state.scale);
        let z = util.getCurrentScale(this.state.scale + zoom);
        let mouse: util.Point = util.getMousePosition(this.state.clientRect, evt);
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

    private pan(mouse): void {
        let scale = util.getCurrentScale(this.state.scale);
        let dx = mouse.x - this.state.mousedownX;
        let dy = mouse.y - this.state.mousedownY;
        this.setState({
            sx: this.state.sx - (dx * scale),
            sy: this.state.sy - (dy * scale)
        });
        this.draw();
        this.setState({
            mousedownX: mouse.x,
            mousedownY: mouse.y
        });
    }

    private panByScrollFunction(dx, dy): void {
        let scale = util.getCurrentScale(this.state.scale);
        this.setState({
            sx: this.state.sx - (dx * scale),
            sy: this.state.sy - (dy * scale)
        });
        this.draw();
    }

    save(): void {
        let saveCanvas = document.createElement("canvas");
        let saveCtx = saveCanvas.getContext("2d");
        saveCtx.mozImageSmoothingEnabled = false;
        saveCtx.webkitImageSmoothingEnabled = false;
        saveCtx.imageSmoothingEnabled = false;
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
        // convert data uri to blob to avoid restrictions imposed by Chrome on
        // the html5 download attribute, then download result
        let uri = saveCanvas.toDataURL();
        let blob: Blob = util.dataURIToBlob(uri);
        let url = URL.createObjectURL(blob);
        let a  = document.createElement("a");
        a.href = url;
        a.download = "tt-image.png";
        // add to dom to fix in firefox
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    crop(rc: RectChange): void {
        // Only crop if there was actually a change in the crop rectangle
        if (rc.dx > 0 || rc.dy > 0 || Math.abs(rc.dw) > 0 || Math.abs(rc.dh) > 0) {
            let crop: Rect = {
                x: this.state.cropX + rc.dx,
                y: this.state.cropY + rc.dy,
                w: this.state.cropW - rc.dw,
                h: this.state.cropH - rc.dh
            }
            let undoCrop: Rect = {
                x: this.state.cropX,
                y: this.state.cropY,
                w: this.state.cropW,
                h: this.state.cropH
            }
            // keep track of the total amount we have cropped
            this.setState({
                cropX: this.state.cropX + rc.dx,
                cropY: this.state.cropY + rc.dy,
                cropW: this.state.cropW - rc.dw,
                cropH: this.state.cropH - rc.dh
            });
            undoRedo.insertCropCommand(crop, undoCrop);
            cropTool.resetState();
            this.draw();
        }
    }

    private handleDrawingFinished(evt): void {
        let composite: string = "source-over";
        this.setState({ isDrawing: false });
        if (this.state.activeTool === ToolType.PENCIL) {
            composite = pencilTool.getComposite();
            undoRedo.insertPencilCommand(evt.data);
        } else if (this.state.activeTool === ToolType.SPRAY) {
            composite = sprayTool.getComposite();
            undoRedo.insertSprayCommand(evt.data);
        }
        this.memoryCtx.globalCompositeOperation = composite;
        this.memoryCtx.drawImage(
            this.drawingCanvas,
            0, 0
        );
        this.drawingCtx.clearRect(0, 0, this.drawingCtx.canvas.width, this.drawingCtx.canvas.height);
        this.draw();
    }

    private handleOnDrawing(evt): void {
        this.setState({ drawCanvasNeedsUpdate: true, isDrawing: true });
        this.draw();
    }

    undo(): void {
        undoRedo.undo();
        this.draw();
    }

    redo(): void {
        undoRedo.redo();
        this.draw();
    }

    drawFromHistory(): void {
        this.memoryCtx.globalCompositeOperation = "source-over";
        this.memoryCtx.clearRect(0, 0, this.memoryCtx.canvas.width, this.memoryCtx.canvas.height);
        this.memoryCtx.drawImage(
            this.img, 0, 0
        );
    }

    /**
    * Drawing:
    *
    * memoryCanvas is the aggregate of the source image and all drawings
    * with various composite effects, e.g destination-out for erasing.
    * It's never cleared and is used to draw the viewCanvas and to
    * save the final image.
    *
    * Each drawing is drawn to the memoryCanvas with a particular composite
    * when onDrawingFinished is emitted from a drawing tool.
    *
    * The memoryCanvas is drawn to the viewCanvas with a destination rectangle
    * defined by how much we have panned or scaled. This gives the illusion of
    * panning / zooming on particular mouse events.
    *
    * Cropping is handled by clearing everything on the viewCanvas outside of a
    * rect defined by the total amount the user has cropped.
    */
    draw(): void {
        this.viewCtx.mozImageSmoothingEnabled = false;
        this.viewCtx.webkitImageSmoothingEnabled = false;
        this.viewCtx.imageSmoothingEnabled = false;
        this.viewCtx.globalCompositeOperation = "source-over";
        this.drawFromMemory();
        this.drawDrawing();
        if (this.debug) {
            this.drawDebug();
        } else {
            this.clearOutsideImageRect();
        }
        this.drawCropRect();
    }

    private drawFromMemory(): void {
        let r = this.getImageRect();
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
    * Draws the drawingCanvas to the viewCanvas in real-time when drawCanvasNeedsUpdate
    * is true. This is done to prevent unecessary redraws.
    *
    * When the drawing is finished it is drawn to the memoryCanvas
    * and draw is called again to clear the viewCanvas and redraw the memoryCanvas.
    */
    private drawDrawing(): void {
        if (this.state.drawCanvasNeedsUpdate) {
            let r = this.getImageRect();
            if (this.state.activeTool === ToolType.PENCIL) {
                this.viewCtx.globalCompositeOperation = pencilTool.getComposite();
            } else if (this.state.activeTool === ToolType.SPRAY) {
                this.viewCtx.globalCompositeOperation = sprayTool.getComposite();
            }
            this.viewCtx.drawImage(
                this.drawingCanvas,
                r.x,
                r.y,
                r.w,
                r.h
            );
            this.setState({ drawCanvasNeedsUpdate: false });
        }
    }

    private drawCropRect() {
        if (this.state.activeTool === ToolType.CROP) {
            cropTool.draw();
        }
    }

    private drawDebug(): void {
        let r = this.getImageRect();
        let r2 = this.getCroppedImageRect();
        this.viewCtx.globalCompositeOperation = "source-over";
        this.viewCtx.strokeStyle = "blue";
        this.viewCtx.lineWidth = 3;
        this.viewCtx.strokeRect(r.x, r.y, r.w, r.h);
        this.viewCtx.strokeStyle = "red";
        this.viewCtx.strokeRect(r2.x, r2.y, r2.w, r2.h);
    }

    /**
    * Returns a Rect for the current cropped image on viewCanvas
    */
    private getCroppedImageRect(): Rect {
        let scale = util.getCurrentScale(this.state.scale);
        return {
            x: (-this.state.sx + this.state.cropX) / scale,
            y: (-this.state.sy + this.state.cropY) / scale,
            w: (this.state.imgW - this.state.cropW) / scale,
            h: (this.state.imgH - this.state.cropH) / scale
        }
    }

    /**
    * Returns a Rect for the current image on viewCanvas
    */
    private getImageRect(): Rect {
        let scale = util.getCurrentScale(this.state.scale);
        return {
            x: (-this.state.sx) / scale,
            y: (-this.state.sy) / scale,
            w: (this.state.imgW) / scale,
            h: (this.state.imgH) / scale
        }
    }

    private clearOutsideImageRect(): void {
       let r: Rect = this.getCroppedImageRect();
       this.viewCtx.globalCompositeOperation = "source-over";
       this.viewCtx.clearRect(0, 0, this.viewCanvas.width, r.y);
       this.viewCtx.clearRect(0, 0, r.x, this.viewCanvas.height);
       this.viewCtx.clearRect(r.x + r.w, 0, this.viewCanvas.width - (r.x + r.w), this.viewCanvas.height);
       this.viewCtx.clearRect(0, r.y + r.h, this.viewCanvas.width, this.viewCanvas.height - (r.y + r.h));
       this.viewCtx.strokeStyle = "rgba(0, 0, 0, .5)";
       this.viewCtx.strokeRect(r.x, r.y, r.w, r.h);
   }
}

export let editor = new TTImageEditor();
