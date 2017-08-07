import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import { CropTool, Rect } from "./crop-tool";
import { PencilTool } from "./pencil-tool";
import { ZoomTool } from "./zoom-tool";
import { Tool } from "./tool";

interface CanvasState {
    activeTool: Tool | null;
    imgX: number;
    imgY: number;
    imgW: number;
    imgH: number;
    imgZoom: number;
}

export class TTImageEditor {
    private container: HTMLElement;
    private img: HTMLImageElement;
    private toolbar: Toolbar;
    private cropTool: CropTool;
    private pencilTool: PencilTool;
    private zoomTool: ZoomTool;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private inMemoryCanvas: HTMLCanvasElement = document.createElement("canvas");
    private inMemoryCtx: CanvasRenderingContext2D;
    private editor: DocumentFragment = document.createDocumentFragment();
    private readonly DEF_EDITOR_ID: string = "tt-image-editor";
    private readonly DEF_CANVAS_WIDTH: number = 800;
    private readonly DEF_CANVAS_HEIGHT: number = 436;
    private debug: boolean = false;
    private state: CanvasState = {
        activeTool: null,
        imgX: 0,
        imgY: 0,
        imgW: 0,
        imgH: 0,
        imgZoom: 1
    }

    constructor(container: HTMLElement, img: HTMLImageElement) {
        this.container = container;
        this.img = img;
        this.render();
        this.initCanvases();
        this.toolbar = new Toolbar(this.editor);
        this.cropTool = new CropTool(this.toolCanvas);
        this.pencilTool = new PencilTool(this.toolCanvas);
        this.zoomTool = new ZoomTool(this.toolCanvas);
        this.addListeners();
        this.attach();
    }

    private render(): void {
        const element = document.createElement("div");
        const html: string =
            `<canvas
                id="tt-image-editor-canvas-tools"
                height="${this.DEF_CANVAS_HEIGHT}",
                width="${this.DEF_CANVAS_WIDTH}"
                style="position: absolute;"
                tabindex="1">
            </canvas>
            <canvas
                id="tt-image-editor-canvas-image"
                height="${this.DEF_CANVAS_HEIGHT}",
                width="${this.DEF_CANVAS_WIDTH}">
            </canvas>`;
        element.innerHTML = html;
        element.id = this.DEF_EDITOR_ID;
        this.editor.appendChild(element);
    }

    private initCanvases(): void {
        this.imageCanvas = this.editor.querySelector("#tt-image-editor-canvas-image") as HTMLCanvasElement;
        this.toolCanvas = this.editor.querySelector("#tt-image-editor-canvas-tools") as HTMLCanvasElement;
        this.setCanvasSize(this.img.naturalWidth, this.img.naturalHeight);
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.inMemoryCtx = this.inMemoryCanvas.getContext("2d");
        this.toolCanvas.style.width = this.img.naturalWidth.toString() + "px";
        this.imageCanvas.style.width = this.img.naturalWidth.toString() + "px";
        this.setState({ imgW: this.img.naturalWidth, imgH: this.img.naturalHeight });
        // draw initial imageCanvas from source image
        this.imageCtx.drawImage(
            this.img,
            this.state.imgX, this.state.imgY,
            this.state.imgW, this.state.imgH,
            0, 0,
            this.state.imgW, this.state.imgH
        );
    }

    private addListeners(): void {
        this.toolbar.onActiveToolChange.addListener( (evt) => this.handleActiveToolChange(evt));
        this.toolbar.onCropApply.addListener( (evt) => this.handleCropApply(evt));
        this.toolbar.onSaveImage.addListener( (evt) => this.handleSaveImage(evt));

        this.cropTool.onCropRectVisibility.addListener( (evt) => this.handleCropRectVisibility(evt));
        this.pencilTool.onPencilDrawingFinished.addListener( (evt) => this.handlePencilDrawingFinished(evt));
        this.zoomTool.onZoom.addListener( (evt) => this.handleZoomTool(evt));

    	this.toolCanvas.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.toolCanvas.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.toolCanvas.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
    }

    private attach() {
        this.container.appendChild(this.editor);
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

    /**
    * Handle mouse events with abstract activeTool
    */
    private handleMousedown(evt): void {
        // TODO need this? evt.preventDefault();
        if (this.state.activeTool !== null) {
            this.state.activeTool.handleMousedown(evt);
        }
    }

    private handleMousemove(evt): void {
        if (this.state.activeTool !== null) {
            this.state.activeTool.handleMousemove(evt);
        }
    }

    private handleMouseup(evt): void {
        if (this.state.activeTool !== null) {
            this.state.activeTool.handleMouseup(evt);
        }
    }

    private handleActiveToolChange(evt: Events.Event<ToolType | null>): void {
        let tool: ToolType | null = evt.data;
        switch (tool) {
            case ToolType.Zoom:
                this.setState({ activeTool: this.zoomTool });
                // TODO activate doesn't make sense as a name
                this.state.activeTool.activate();
                break;
            case ToolType.Pencil:
                this.setState({ activeTool: this.pencilTool });
                this.state.activeTool.activate();
                break;
            case ToolType.Crop:
                this.setState({ activeTool: this.cropTool });
                // draw the current state to canvas
                this.state.activeTool.activate();
                break;
            default:
                this.clearToolCanvas();
                this.toolCanvas.style.cursor = "default";
                this.setState({ activeTool: null });
        }
    }

    // TODO could store state of each pencil drawing here for undo history
    private handlePencilDrawingFinished(evt): void {
        this.imageCtx.drawImage(this.toolCanvas, 0, 0);
    }

    private handleZoomTool(evt): void {
        if (evt.data.ctrlKey) {
            this.scaleCanvasCss(.8);
        } else {
            this.scaleCanvasCss(1.25);
        }
    }

    private handleCropRectVisibility(evt): void {
        if (evt.data === true) {
            this.toolbar.showCropApplyBtn();
        } else {
            this.toolbar.hideCropApplyBtn();
        }
    }

    private clearToolCanvas(): void {
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
    }

    private clearImageCanvas(): void {
        this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    }

    /**
    * Redraw the imageCanvas based on a cropTool's rect
    */
    private handleCropApply(evt): void {
        let { x, y, w, h } = this.cropTool.getCropRect();
        this.setState({
            imgX: x, imgY: y,
            imgW: w, imgH: h
        });
        this.cropTool.resetState();
        this.draw();
    }

    private handleSaveImage(evt): void {
        let img: HTMLImageElement = new Image();
        img.onload = () => {
            this.container.innerHTML = "";
            this.container.appendChild(img);
        }
        img.src = this.imageCanvas.toDataURL();
    }

    private draw(zoomFactor?: number): void {
        /**
        * Because canvas is cleared when resized, use a inMemory canvas to
        * transfer the cropped image to, then resize image canvas to desired
        * size and finally transfer the image from the inMemory to image canvas.
        */
        this.inMemoryCanvas.width = this.state.imgW;
        this.inMemoryCanvas.height = this.state.imgH;
        this.inMemoryCtx.drawImage(
            this.imageCanvas,
            this.state.imgX, this.state.imgY,
            this.state.imgW, this.state.imgH,
            0, 0,
            this.state.imgW,
            this.state.imgH
        );
        this.setCanvasSize(this.state.imgW, this.state.imgH);
        this.imageCtx.drawImage(this.inMemoryCanvas, 0, 0);
    }

    /**
    * Simultaneously set canvas size for tool and image layers;
    * they should always be the same because the tool layer overlays the
    * image layer
    */
    private setCanvasSize(w: number, h: number) {
        this.imageCanvas.width = w;
        this.imageCanvas.height = h;
        this.toolCanvas.width = w;
        this.toolCanvas.height = h;
    }

    private scaleCanvasCss(zoomFactor: number) {
        let w1: number = parseInt(this.imageCanvas.style.width, 10);
        let w2: number = parseInt(this.toolCanvas.style.width, 10);
        this.imageCanvas.style.width = (zoomFactor * w1).toString() + "px";
        this.toolCanvas.style.width = (zoomFactor * w2).toString() + "px";
    }
}
