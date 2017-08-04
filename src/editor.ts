import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import { CropTool, Rect } from "./crop-tool";
import { Tool } from "./tool";

interface CanvasState {
    activeTool: Tool | null;
    imgX: number;
    imgY: number;
    imgW: number;
    imgH: number;
    ratio: number;
}

export class TTImageEditor {
    private container: HTMLElement;
    private img: HTMLImageElement;
    private toolbar: Toolbar;
    private cropTool: CropTool;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private editor: DocumentFragment = document.createDocumentFragment();
    private readonly DEF_EDITOR_ID: string = "tt-image-editor";
    private readonly DEF_CLEAR_COLOR = "black";
    private readonly DEF_CANVAS_WIDTH: number = 800;
    private readonly DEF_CANVAS_HEIGHT: number = 436;
    private debug: boolean = true;
    private state: CanvasState = {
        activeTool: null,
        imgX: 0,
        imgY: 0,
        imgW: 0,
        imgH: 0,
        ratio: 1
    }

    constructor(container: HTMLElement, img: HTMLImageElement) {
        this.container = container;
        this.img = img;
        this.render();
        this.toolbar = new Toolbar(this.editor);
        this.cropTool = new CropTool(this.toolCanvas);
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
                style="position: absolute">
            </canvas>
            <canvas
                id="tt-image-editor-canvas-image"
                height="${this.DEF_CANVAS_HEIGHT}",
                width="${this.DEF_CANVAS_WIDTH}">
            </canvas>`;
        element.innerHTML = html;
        element.id = this.DEF_EDITOR_ID;
        this.editor.appendChild(element);
        this.imageCanvas = this.editor.querySelector("#tt-image-editor-canvas-image") as HTMLCanvasElement;
        this.toolCanvas = this.editor.querySelector("#tt-image-editor-canvas-tools") as HTMLCanvasElement;
        this.setCanvasSize(this.img.naturalWidth, this.img.naturalHeight);
        if (this.imageCanvas.getContext && this.toolCanvas.getContext) {
            this.toolCtx = this.toolCanvas.getContext("2d");
            this.imageCtx = this.imageCanvas.getContext("2d");
            this.setState({ imgW: this.img.naturalWidth, imgH: this.img.naturalHeight });
            this.draw();
        }
    }

    private addListeners(): void {
        this.toolbar.onActiveToolChange.addListener( (evt) => this.handleActiveToolChange(evt));
        this.toolbar.onCropApply.addListener( (evt) => this.handleCropApply(evt));
        this.toolbar.onJpegSaved.addListener( (evt) => this.handleJpegSaved(evt));

    	this.toolCanvas.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.toolCanvas.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.toolCanvas.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
    }

    private attach() {
        this.container.appendChild(this.editor);
    }

    /* *
    * All CanvasState is updated by shallow merge in the setState method.
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

    private handleMousedown(evt): void {
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
            case ToolType.Crop:
                this.setState({ activeTool: this.cropTool });
                // draw the current state to canvas for activeTool
                this.state.activeTool.draw();
                break;
            default:
                this.clearToolCanvas();
                this.toolCanvas.style.cursor = "default";
                this.setState({ activeTool: null });
        }
    }

    private clearToolCanvas(): void {
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
    }

    private clearImageCanvas(): void {
        this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    }

    private handleCropApply(evt): void {
        let { x, y, w, h } = this.cropTool.getCropRect();
        /**
        * imgX and imgY are added to, not re-assigned. Initially the dimensions
        * of the canvas match that of the source image, but on subsequent crops
        * the canvas size changes. We need to keep track of the offset to
        * determine what piece of the image to draw to the canvas based on
        * the crop tools x,y canvas position.
        */
        this.setState({
            imgX: this.state.imgX += x,
            imgY: this.state.imgY += y,
            imgW: w, imgH: h
        });
        this.cropTool.resetState();
        this.draw();
    }

    private handleJpegSaved(evt): void {
        console.log(evt.data);
    }

    private draw(): void {
        this.clearImageCanvas();
        this.setCanvasSize(this.state.imgW, this.state.imgH);
        this.imageCtx.drawImage(
            this.img,
            this.state.imgX, this.state.imgY,
            this.state.imgW, this.state.imgH,
            0, 0,
            this.state.imgW, this.state.imgH
        );
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

    /**
    * Conserve aspect ratio of the orignal region. Useful when shrinking/enlarging
    * images to fit into a certain area.
    */
    private calculateAspectRatio(
        srcWidth: number, srcHeight: number,
        maxWidth: number, maxHeight: number): { width: number, height: number, ratio: number} {

        let ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

        return { width: srcWidth * ratio, height: srcHeight * ratio, ratio: ratio };
    }
}
