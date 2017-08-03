import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import { CropTool } from "./crop-tool";
import { Tool } from "./tool";

interface CanvasState {
    activeTool: Tool | null;
}

export class TTImageEditor {
    private container: HTMLElement;
    private toolbar: Toolbar;
    private cropTool: CropTool;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private editor: DocumentFragment = document.createDocumentFragment();
    private readonly DEF_EDITOR_ID: string = "tt-image-editor";
    private readonly DEF_CLEAR_COLOR = "white";
    private readonly DEF_CANVAS_HEIGHT: number = 100;
    private readonly DEF_CANVAS_WIDTH: number = 100;
    private debug: boolean = false;
    private state: CanvasState = {
        activeTool: null
    }

    constructor(container: HTMLElement, img: HTMLImageElement) {
        this.container = container;
        this.render();
        this.init(img);
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
    }

    private init(img: HTMLImageElement): void {
        if (this.imageCanvas.getContext && this.toolCanvas.getContext) {
            this.setCanvasSize(img.naturalWidth, img.naturalHeight);
            this.toolCtx = this.toolCanvas.getContext("2d");
            this.imageCtx = this.imageCanvas.getContext("2d");
            this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
            this.imageCtx.drawImage(img, 0, 0);
        }
    }

    private addListeners(): void {
        this.toolbar.onActiveToolChange.addListener( (evt) => this.handleActiveToolChange(evt));
        this.toolbar.onPngSaved.addListener( (evt) => this.handlePngSaved(evt));
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
        this.toolCtx.fillStyle = this.DEF_CLEAR_COLOR;
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
    }

    private handlePngSaved(evt): void {
        console.log(evt.data);
    }

    private handleJpegSaved(evt): void {
        console.log(evt.data);
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
}
