import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import * as Util from "./util";

interface CanvasState {
    sourceX: number;
    sourceY: number;
    sourceW: number;
    sourceH: number;
    offX: number;
    offY: number;
    scale: number;
}

export class TTImageEditor {
    private editor: HTMLElement;
    private img: HTMLImageElement;
    private toolbar: Toolbar;
    private viewCanvas: HTMLCanvasElement;
    private viewCtx: CanvasRenderingContext2D;
    private scratchCanvas: HTMLCanvasElement;
    private scratchCtx: CanvasRenderingContext2D;
    private imageCanvas: HTMLCanvasElement;
    private imageCtx: CanvasRenderingContext2D;
    private memoryCanvas: HTMLCanvasElement;
    private memoryCtx: CanvasRenderingContext2D;
    private readonly DEF_BG_FILL = "rgba(0,0,0,.25)";
    private readonly DEF_STROKE = "blue";
    private readonly DEF_LINE_W = 2;
    private readonly DEF_SCALE_STEP = 1.1;
    private debug: boolean = true;
    private state: CanvasState = {
        sourceX: 0,
        sourceY: 0,
        sourceW: 0,
        sourceH: 0,
        offX: 0,
        offY: 0,
        scale: 1
    }

    constructor(img: HTMLImageElement) {
        this.img = img;
        this.init();
        this.toolbar = new Toolbar(this.editor);
        this.addListeners();
    }

    private render(): void { }

    private init(): void {
        this.editor = document.getElementById("tt-image-editor");
        this.viewCanvas = this.editor.querySelector("#tt-view-canvas") as HTMLCanvasElement;
        this.viewCtx = this.viewCanvas.getContext("2d");
        this.scratchCanvas = this.editor.querySelector("#tt-scratch-canvas") as HTMLCanvasElement;
        this.scratchCtx = this.scratchCanvas.getContext("2d");
        this.imageCanvas = this.editor.querySelector("#tt-image-canvas") as HTMLCanvasElement;
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.memoryCanvas = document.querySelector("#tt-memory-canvas") as HTMLCanvasElement;
        this.memoryCtx = this.memoryCanvas.getContext("2d");
    }

    private addListeners(): void {

        this.toolbar.onCropApply.addListener( (evt) => this.handleCropApply(evt));
        this.toolbar.onSaveImage.addListener( (evt) => this.handleSaveImage(evt));

        this.toolbar.pencil.onPencilDrawingStart.addListener( (evt) => this.handlePencilDrawingStart(evt));
        this.toolbar.pencil.onPencilDrawingFinished.addListener( (evt) => this.handlePencilDrawingFinished(evt));
        this.toolbar.pencil.onPencilDrawing.addListener( (evt) => this.handlePencilDrawing(evt));
        this.toolbar.pan.onPanning.addListener( (evt) => this.handlePanning(evt));

    	this.viewCanvas.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.viewCanvas.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.viewCanvas.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
        // IE9, Chrome, Safari, Opera
        this.viewCanvas.addEventListener("mousewheel", (evt) => this.mouseWheelZoomHandler(evt), false);
        // Firefox
        this.viewCanvas.addEventListener("DOMMouseScroll", (evt) => this.mouseWheelZoomHandler(evt), false);
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
        //TODO get pencil working with resized canvas
        this.scratchCanvas.width = window.innerWidth;
        this.scratchCanvas.height = window.innerHeight;
        this.imageCanvas.width = window.innerWidth;
        this.imageCanvas.height = window.innerHeight;
        this.viewCanvas.width = window.innerWidth;
        this.viewCanvas.height = window.innerHeight;
        this.memoryCanvas.width = window.innerWidth;
        this.memoryCanvas.height = window.innerHeight;
        let center: Util.Point = Util.centerImageOnCanvas(this.viewCanvas, this.img);
        this.setState({ offX: center.x, offY: center.y, sourceW: this.viewCanvas.width * this.state.scale, sourceH: this.viewCanvas.height * this.state.scale });
        this.draw();
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
        let mouse = Util.getMousePosition(this.viewCanvas, evt);
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
            this.zoomAtPoint(evt, this.DEF_SCALE_STEP);
        } else {
            // zoom in
            this.zoomAtPoint(evt, 1 / this.DEF_SCALE_STEP);
        }
    }

    private zoomAtPoint(evt, zoom): void {
        let m1: Util.Point = Util.getMousePosition(this.viewCanvas, evt);
        // translate by change in scale (before and after zoom) to give the illusion of zooming towards the mouse cursor
        let dx = (m1.x * this.state.scale) - (m1.x * this.state.scale * zoom);
        let dy = (m1.y * this.state.scale) - (m1.y * this.state.scale * zoom);
        this.setState({
            sourceX: this.state.sourceX + dx,
            sourceY: this.state.sourceY + dy,
            sourceW: this.state.sourceW * zoom,
            sourceH: this.state.sourceH * zoom,
            scale: this.state.scale * zoom
        });
        this.draw();
    }

    private handlePanning(evt): void {
        let dx = evt.data.mouseX - evt.data.mousedownX;
        let dy = evt.data.mouseY - evt.data.mousedownY;
        this.setState({ sourceX: this.state.sourceX - (dx * this.state.scale), sourceY: this.state.sourceY - (dy * this.state.scale) });
        this.draw();
    }

    private handlePencilDrawingStart(evt): void {
        this.scratchCtx.beginPath();
		this.scratchCtx.moveTo((evt.data.x * this.state.scale) + this.state.sourceX, (evt.data.y * this.state.scale) + this.state.sourceY);
    }

    private handlePencilDrawingFinished(evt): void { }

    private handlePencilDrawing(evt): void {
        this.scratchCtx.lineTo((evt.data.x * this.state.scale) + this.state.sourceX, (evt.data.y * this.state.scale) + this.state.sourceY);
        this.scratchCtx.lineWidth = 5;
        this.scratchCtx.strokeStyle = "green";
        this.scratchCtx.stroke();
        this.draw();
    }

    private clearView(): void {
        this.viewCtx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
    }

    private clearScratch(): void {
        this.scratchCtx.clearRect(0, 0, this.scratchCanvas.width, this.scratchCanvas.height);
    }

    private clearImage(): void {
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
            this.editor.innerHTML = "";
            this.editor.appendChild(img);
        }
        this.clearView();
        this.draw();
        img.src = this.viewCanvas.toDataURL();
    }

    private draw(): void {
        this.clearImage();
        this.imageCtx.drawImage(
            this.img,
            0,0,
            this.img.naturalWidth,
            this.img.naturalHeight,
            this.state.offX,
            this.state.offY,
            this.img.naturalWidth,
            this.img.naturalHeight
        );
        this.drawViewport();
        this.viewCtx.drawImage(
           this.imageCanvas,
           this.state.sourceX, this.state.sourceY,
           this.state.sourceW,
           this.state.sourceH,
           0, 0,
           this.viewCanvas.width,
           this.viewCanvas.height
        );
        this.viewCtx.drawImage(
           this.scratchCanvas,
           this.state.sourceX, this.state.sourceY,
           this.state.sourceW,
           this.state.sourceH,
           0, 0,
           this.viewCanvas.width,
           this.viewCanvas.height
        );
    }

    private drawViewport(): void {
        this.clearView();
        this.viewCtx.lineWidth = 0;
        //this.viewCtx.strokeStyle = this.DEF_STROKE;
        this.viewCtx.fillStyle = this.DEF_BG_FILL;
        this.viewCtx.fillRect(
            0, 0, this.viewCanvas.width, this.viewCanvas.height
        );
        this.viewCtx.clearRect(
            -this.state.sourceX / this.state.scale, -this.state.sourceY / this.state.scale,
            this.scratchCanvas.width / this.state.scale,
            this.scratchCanvas.height / this.state.scale
        );
    }

    /**
    * Simultaneously set canvas size for tool and image layers;
    * they should always be the same because the tool layer overlays the
    * image layer
    */
    private setCanvasSize(w: number, h: number) {
        this.viewCanvas.width = w;
        this.viewCanvas.height = h;
    }
}
