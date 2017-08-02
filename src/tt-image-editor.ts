import * as Events from "./event";
import { Toolbar, Tools } from "./toolbar";
import { CropTool } from "./crop-tool";

interface Point { x: number, y: number };

interface CanvasState {
    lastMousedownPos: Point;
    dragging: boolean;
    activeTool: Tools | null;
}

export class TTImageEditor {
    private container: HTMLElement;
    private toolbar: Toolbar;
    private crop: CropTool;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private editor: DocumentFragment = document.createDocumentFragment();
    private readonly DEF_EDITOR_ID: string = "tt-image-editor";
    private readonly DEF_CANVAS_HEIGHT: number = 100;
    private readonly DEF_CANVAS_WIDTH: number = 100;
    private readonly UI_COLOR = 0x1B83DE;
    private debug: boolean = true;
    private state: CanvasState = {
        lastMousedownPos: { x: 0, y: 0 },
        dragging: false,
        activeTool: null
    }

    constructor(container: HTMLElement, img: HTMLImageElement) {
        this.container = container;
        this.toolbar = new Toolbar(this.editor);
        this.crop = new CropTool;
        this.render();
        this.drawImage(img, img.naturalWidth, img.naturalHeight);
        this.addListeners();
        this.attach();
    }

    private render(): void {
        const element = document.createElement("div");
        const html: string =
            `<canvas
                id="tt-image-editor-canvas"
                height="${this.DEF_CANVAS_HEIGHT}",
                width="${this.DEF_CANVAS_WIDTH}">
            </canvas>`;
        element.innerHTML = html;
        element.id = this.DEF_EDITOR_ID;
        this.editor.appendChild(element);
        this.canvas = this.editor.querySelector("#tt-image-editor-canvas") as HTMLCanvasElement;
    }

    private attach() {
        this.container.appendChild(this.editor);
    }

    private addListeners(): void {
        this.toolbar.onActiveToolChange.addListener( (evt) => this.handleActiveToolChange(evt));
        this.toolbar.onPngSaved.addListener( (evt) => this.handlePngSaved(evt));
        this.toolbar.onJpegSaved.addListener( (evt) => this.handleJpegSaved(evt));

    	this.canvas.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.canvas.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.canvas.addEventListener("mouseup",	 (evt) => this.handleMouseup(evt), false);
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
        console.log("mousedown")
        this.setLastMousedownPos(evt);
        this.setState({ dragging: true });
    }

    private handleMousemove(evt): void {
        if (this.state.dragging) {
            console.log("dragging")
            if (this.state.activeTool === Tools.Crop) {
                let pos = this.getMousePosition(evt);
                this.crop.draw(
                    this.ctx,
                    this.state.lastMousedownPos.x,
                    this.state.lastMousedownPos.y,
                    pos.x,
                    pos.y
                );
            }
        }
    }

    private handleMouseup(evt): void {
        this.setState({ dragging: false });
        console.log("mouse up");
        console.log(this.crop.state);
    }

    private handleActiveToolChange(evt: Events.Event<Tools | null>): void {
        console.log(evt.data);
        let tool: Tools | null = evt.data;
        this.setState({ activeTool: tool });
        if (tool === Tools.Crop) {
            this.canvas.style.cursor = "crosshair";
        }
    }

    private handlePngSaved(evt): void {
        console.log(evt.data);
    }

    private handleJpegSaved(evt): void {
        console.log(evt.data);
    }

    private drawImage(img: HTMLImageElement, width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.canvas.getContext) {
            this.ctx = this.canvas.getContext("2d");
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        }
    }

    private setLastMousedownPos(evt) {
        let rect = this.canvas.getBoundingClientRect();
        this.setState({ lastMousedownPos: this.getMousePosition(evt) });
    }

    private getMousePosition(evt): Point {
        let rect = this.canvas.getBoundingClientRect();
        let offsetX = evt.clientX - rect.left;
        let offsetY = evt.clientY - rect.top;
        return { x: offsetX, y: offsetY };
    }
}
