import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import { Transform } from "./transform";
import * as Util from "./util";

interface CanvasState {
    imgX: number;
    imgY: number;
    imgW: number;
    imgH: number;
}

export class TTImageEditor {
    private container: HTMLElement;
    private img: HTMLImageElement;
    private toolbar: Toolbar;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    private editor: DocumentFragment = document.createDocumentFragment();
    private readonly DEF_EDITOR_ID: string = "tt-image-editor";
    private readonly DEF_CANVAS_WIDTH: number = 800;
    private readonly DEF_CANVAS_HEIGHT: number = 436;
    private readonly DEF_Z_IN_FACTOR: number = 1.25;
    private readonly DEF_Z_OUT_FACTOR: number = .8;
    private readonly DEF_SCALE_STEP = 1.1;
    private transform: Transform;
    private debug: boolean = true;
    private state: CanvasState = {
        imgX: 0,
        imgY: 0,
        imgW: 0,
        imgH: 0
    }

    constructor(container: HTMLElement, img: HTMLImageElement) {
        this.container = container;
        this.img = img;
        this.render();
        this.initCanvases();
        this.transform = new Transform(this.imageCtx);
        this.toolbar = new Toolbar(this.editor, this.transform);
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
                width="${this.DEF_CANVAS_WIDTH}"
                style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIElEQVQoU2NkYGCQYsAEz9CFGIeIQix+wfQgyDODXSEANzEFjc0z43QAAAAASUVORK5CYII=');">
            </canvas>`;
        element.innerHTML = html;
        element.id = this.DEF_EDITOR_ID;
        this.editor.appendChild(element);
    }

    private initCanvases(): void {
        this.imageCanvas = this.editor.querySelector("#tt-image-editor-canvas-image") as HTMLCanvasElement;
        this.toolCanvas = this.editor.querySelector("#tt-image-editor-canvas-tools") as HTMLCanvasElement;
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.setCanvasSize(this.img.naturalWidth, this.img.naturalHeight);
        this.setState({ imgW: this.img.naturalWidth, imgH: this.img.naturalHeight });
        // draw initial imageCanvas from source image
        let { x, y } = Util.centerImageOnCanvas(this.imageCanvas, this.img);
        this.imageCtx.drawImage(
            this.img,
            0, 0,
            this.state.imgW, this.state.imgH,
            0, 0,
            this.state.imgW, this.state.imgH
        );
    }

    private addListeners(): void {
        this.toolbar.onCropApply.addListener( (evt) => this.handleCropApply(evt));
        this.toolbar.onSaveImage.addListener( (evt) => this.handleSaveImage(evt));

        this.toolbar.pencil.onPencilDrawingFinished.addListener( (evt) => this.handlePencilDrawingFinished(evt));
        this.toolbar.pan.onPanning.addListener( (evt) => this.handlePanning(evt));

    	this.toolCanvas.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.toolCanvas.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.toolCanvas.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
        // IE9, Chrome, Safari, Opera
        this.toolCanvas.addEventListener("mousewheel", (evt) => this.mouseWheelZoomHandler(evt), false);
        // Firefox
        this.toolCanvas.addEventListener("DOMMouseScroll", (evt) => this.mouseWheelZoomHandler(evt), false);
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
        let activeTool = this.toolbar.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMousedown(evt);
        }
    }

    private handleMousemove(evt): void {
        let mouse = Util.getMousePosition(this.toolCanvas, evt);
        let activeTool = this.toolbar.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMousemove(evt);
        }
    }

    private handleMouseup(evt): void {
        let activeTool = this.toolbar.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMouseup(evt);
        }
    }

    private mouseWheelZoomHandler(evt): void {
        evt.preventDefault();
        let mouseDelta: number = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
        if (mouseDelta === -1) {
            // zoom out
            this.zoomAtPoint(evt, 1 / this.DEF_SCALE_STEP);
        } else {
            // zoom in
            this.zoomAtPoint(evt, this.DEF_SCALE_STEP);
        }
    }

    private zoomAtPoint(evt, zoom): void {
        let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
        // world coordinate before zoom
        let w1: Util.Point = this.transform.getWorld(mouse.x, mouse.y);
        this.clearImageCanvas();
        this.transform.scale(zoom, zoom);
        // world coordinate after zoom
        let w2 = this.transform.getWorld(mouse.x, mouse.y);
        // translate by the change to zoom towards the point at the mouse cursor
        let dx = w2.x - w1.x;
        let dy = w2.y - w1.y;
        this.transform.translate(dx, dy);
        this.transform.setTransform(this.imageCtx);
        this.draw();
    }

    private handlePanning(evt): void {
        let w1 = this.transform.getWorld(evt.data.mouseX, evt.data.mouseY);
        let w2 = this.transform.getWorld(evt.data.mousedownX, evt.data.mousedownY);
        let wDx = w1.x - w2.x;
        let wDy = w1.y - w2.y;
        this.clearImageCanvas();
        this.transform.translate(wDx, wDy);
        this.transform.setTransform(this.imageCtx);
        this.draw();
    }

    private handlePencilDrawingFinished(evt): void {

    }

    private clearImageCanvas(): void {
        this.imageCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    }

    /**
    * Redraw the imageCanvas based on a crop tool's rect
    */
    private handleCropApply(evt): void {
        let { x, y, w, h } = this.toolbar.crop.getCropRect();
        this.setState({
            imgX: x, imgY: y,
            imgW: w, imgH: h,
        });
        this.toolbar.crop.resetState();
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

    private draw(): void {
        this.imageCtx.drawImage(
           this.img,
           0, 0
        );
        let scale = this.transform.getScale();
        this.imageCtx.strokeStyle = "#a6c8ff";
        this.imageCtx.lineWidth = 1 / scale.x;
        this.imageCtx.strokeRect(0, 0, this.state.imgW, this.state.imgH);
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
