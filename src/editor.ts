import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import * as Util from "./util";

interface CanvasState {
    mouseX: number;
    mouseY: number;
    imgX: number;
    imgY: number;
    imgW: number;
    imgH: number;
    translateX: number;
    translateY: number;
    scale: number;
}

export class TTImageEditor {
    private container: HTMLElement;
    private img: HTMLImageElement;
    private toolbar: Toolbar;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private toolCanvas: HTMLCanvasElement;
    private inMemoryCanvas: HTMLCanvasElement = document.createElement("canvas");
    private inMemoryCtx: CanvasRenderingContext2D;
    private editor: DocumentFragment = document.createDocumentFragment();
    private readonly DEF_EDITOR_ID: string = "tt-image-editor";
    private readonly DEF_CANVAS_WIDTH: number = 800;
    private readonly DEF_CANVAS_HEIGHT: number = 436;
    private readonly DEF_Z_IN_FACTOR: number = 1.25;
    private readonly DEF_Z_OUT_FACTOR: number = .8;
    private debug: boolean = true;
    private state: CanvasState = {
        mouseX: 0,
        mouseY: 0,
        imgX: 0,
        imgY: 0,
        imgW: 0,
        imgH: 0,
        translateX: 0,
        translateY: 0,
        scale: 1
    }

    constructor(container: HTMLElement, img: HTMLImageElement) {
        this.container = container;
        this.img = img;
        this.render();
        this.initCanvases();
        this.toolbar = new Toolbar(this.editor);
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
        //this.setCanvasSize(this.img.naturalWidth, this.img.naturalHeight);
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.inMemoryCtx = this.inMemoryCanvas.getContext("2d");
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
        this.toolbar.pan.onPanningFinished.addListener( (evt) => this.handlePanningFinished(evt));
        this.toolbar.pan.onZooming.addListener( (evt) => this.handleZooming(evt));

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
        let activeTool = this.toolbar.getActiveTool();
        if (activeTool !== null) {
            activeTool.handleMousedown(evt);
        }
    }

    private handleMousemove(evt): void {
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

    private handleZooming(evt): void {
        this.setState({ scale: evt.data });
        this.imageCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.clearImageCanvas();
        this.imageCtx.setTransform(
            this.state.scale,
            0, 0,
            this.state.scale,
            this.state.translateX,
            this.state.translateY
        );
        this.draw();
    }

    private handlePanning(evt): void {
        this.imageCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.clearImageCanvas();
        this.imageCtx.setTransform(
            this.state.scale,
            0, 0,
            this.state.scale,
            evt.data.x + this.state.translateX,
            evt.data.y + this.state.translateY
        );
        if (this.debug) {
            this.drawDebug(evt);
        }
    	this.draw();
    }

    private handlePanningFinished(evt) {
        this.setState({
            translateX: evt.data.x,
            translateY: evt.data.y
        });
    }

    // TODO could store state of each pencil drawing here for undo history
    private handlePencilDrawingFinished(evt): void {
        this.imageCtx.drawImage(this.toolCanvas, 0, 0);
    }

    private clearImageCanvas(): void {
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

    private drawDebug(evt): void {
        this.imageCtx.font = "12px sans-serif";
        this.imageCtx.textBaseline = "middle";
        this.imageCtx.fillStyle = "black";
        let text =
            (this.state.translateX + evt.data.x) +
            ", " + (this.state.translateY + evt.data.y);
        this.imageCtx.fillText(
            text, 0, -10
        );
        this.imageCtx.beginPath();
        this.imageCtx.moveTo(0, 0);
        this.imageCtx.lineTo(100, 0);
        this.imageCtx.moveTo(0, 0);
        this.imageCtx.lineTo(0, 100);
        this.imageCtx.stroke();
    }

    private draw(): void {
        /**
        * Because canvas is cleared when resized, use a inMemory canvas to
        * transfer the cropped image to, then resize image canvas to desired
        * size and finally transfer the image from the inMemory to image canvas.
        */
        // this.inMemoryCanvas.width = this.imageCanvas.width;
        // this.inMemoryCanvas.height = this.imageCanvas.height;
        // this.inMemoryCtx.drawImage(
        //     this.imageCanvas, 0, 0
        // );
        this.imageCtx.drawImage(
            this.img,
            0, 0
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
}
