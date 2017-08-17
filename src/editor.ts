import * as Events from "./event";
import { Toolbar, ToolType } from "./toolbar";
import * as Util from "./util";

interface CanvasState {
    sourceX: number;
    sourceY: number;
    sourceW: number;
    sourceH: number;
    scale: number;
    isMousedown: boolean;
    isMousedrag: boolean;
    mousedownX: number;
    mousedownY: number;
}

export class TTImageEditor {
    private editor: HTMLElement;
    private img: HTMLImageElement;
    private toolbar: Toolbar;
    private toolCanvas: HTMLCanvasElement;
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
        isMousedown: false,
        isMousedrag: false,
        mousedownX: 0,
        mousedownY: 0,
        sourceX: 0,
        sourceY: 0,
        sourceW: 0,
        sourceH: 0,
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
        this.toolCanvas = this.editor.querySelector("#tt-tool-canvas") as HTMLCanvasElement;
        this.viewCanvas = this.editor.querySelector("#tt-view-canvas") as HTMLCanvasElement;
        this.viewCtx = this.viewCanvas.getContext("2d");
        this.scratchCanvas = this.editor.querySelector("#tt-scratch-canvas") as HTMLCanvasElement;
        this.scratchCtx = this.scratchCanvas.getContext("2d");
        this.imageCanvas = this.editor.querySelector("#tt-image-canvas") as HTMLCanvasElement;
        this.imageCtx = this.imageCanvas.getContext("2d");
        this.memoryCanvas = document.querySelector("#tt-memory-canvas") as HTMLCanvasElement;
        this.memoryCtx = this.memoryCanvas.getContext("2d");
        this.scratchCanvas.width = this.img.naturalWidth;
        this.scratchCanvas.height = this.img.naturalHeight;
        this.imageCanvas.width = this.img.naturalWidth;
        this.imageCanvas.height = this.img.naturalHeight;
        this.memoryCanvas.width = this.img.naturalWidth;
        this.memoryCanvas.height = this.img.naturalHeight;
    }

    private addListeners(): void {
        this.toolbar.onCropApply.addListener( (evt) => this.handleCropApply(evt));
        this.toolbar.onSaveImage.addListener( (evt) => this.handleSaveImage(evt));

        this.toolbar.pencil.onPencilDrawingStart.addListener( (evt) => this.handlePencilDrawingStart(evt));
        this.toolbar.pencil.onPencilDrawingFinished.addListener( (evt) => this.handlePencilDrawingFinished(evt));
        this.toolbar.pencil.onPencilDrawing.addListener( (evt) => this.handlePencilDrawing(evt));

    	this.toolCanvas.addEventListener("mousedown", (evt) => this.handleMousedown(evt), false);
    	this.toolCanvas.addEventListener("mousemove", (evt) => this.handleMousemove(evt), false);
    	this.toolCanvas.addEventListener("mouseup", (evt) => this.handleMouseup(evt), false);
        // IE9, Chrome, Safari, Opera
        this.toolCanvas.addEventListener("mousewheel", (evt) => this.mouseWheelZoomHandler(evt), false);
        // Firefox
        this.toolCanvas.addEventListener("DOMMouseScroll", (evt) => this.mouseWheelZoomHandler(evt), false);
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
        // because resizing a canvas clears it, we need another canvas to store
        // the scratch canvas temporarily
        this.memoryCtx.drawImage(this.scratchCanvas, 0, 0);
        this.viewCanvas.width = window.innerWidth;
        this.viewCanvas.height = window.innerHeight;
        this.toolCanvas.width = window.innerWidth;
        this.toolCanvas.height = window.innerHeight;
        this.setState({ sourceW: this.viewCanvas.width * this.state.scale, sourceH: this.viewCanvas.height * this.state.scale });
        this.draw();
        // restore the scratch canvas from memory canvas after resize
        this.scratchCtx.drawImage(this.memoryCanvas, 0, 0);
    }

    /**
    * Handle mouse events with abstract activeTool
    */
    private handleMousedown(evt): void {
        let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
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
        let m1: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
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

    private pan(evt): void {
        if (evt.altKey) {
            let mouse: Util.Point = Util.getMousePosition(this.toolCanvas, evt);
            let dx = mouse.x - this.state.mousedownX;
            let dy = mouse.y - this.state.mousedownY;
            this.setState({ sourceX: this.state.sourceX - (dx * this.state.scale), sourceY: this.state.sourceY - (dy * this.state.scale) });
            this.draw();

            this.setState({
                isMousedrag: true,
                mousedownX: mouse.x,
                mousedownY: mouse.y
            });
        }
    }

    private handlePanning(evt): void {

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
        // TODO
        // let { x, y, w, h } = this.toolbar.crop.getCropRect();
        // this.setState({
        //     imgX: x, imgY: y,
        //     imgW: w, imgH: h,
        // });
        // this.toolbar.crop.resetState();
        // this.draw();
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
            0, 0,
            this.img.naturalWidth,
            this.img.naturalHeight,
            0, 0,
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
