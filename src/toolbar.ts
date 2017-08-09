import * as Events from "./event";
import { CropTool, Rect } from "./crop-tool";
import { PencilTool } from "./pencil-tool";
import { PanTool } from "./pan-tool";
import { Tool } from "./tool";

export enum ToolType {
    Crop,
    Pencil,
    Zoom
}

interface ToolbarState {
    activeTool: ToolType | null;
}

export class Toolbar {
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    crop: CropTool;
    pencil: PencilTool;
    pan: PanTool;
    private toolbar: DocumentFragment = document.createDocumentFragment();
    private applyBtn: HTMLElement;
    private saveBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private pencilBtn: HTMLElement;
    private panBtn: HTMLElement;
    private container: HTMLElement;
    private state: ToolbarState = {
        activeTool: null
    }
    onSaveImage: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onCropApply: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onActiveToolChange: Events.Dispatcher<ToolType | null> = Events.Dispatcher.createEventDispatcher();

    constructor(container: DocumentFragment) {
        this.container = container.querySelector("#tt-image-editor") as HTMLElement;
        this.toolCanvas = container.querySelector("#tt-image-editor-canvas-tools") as HTMLCanvasElement;
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.crop = new CropTool(this.toolCanvas);
        this.pencil = new PencilTool(this.toolCanvas);
        this.pan = new PanTool(this.toolCanvas);
        this.render();
        this.addListeners();
        this.attach();
    }

    private render(): void {
        const element: HTMLElement = document.createElement("div");
        this.toolbar = document.createDocumentFragment();
        element.id = "tt-image-editor-toolbar";
        element.style.userSelect = "none";
        element.innerHTML = `<button id="pan-btn">Pan</button>
                             <button id="pencil-btn">Pencil</button>
                             <button id="crop-btn">Crop</button>
                             <button id="apply-btn" style="display:none">Apply</button>
                             <button id="save-btn">Save</button>`;
        this.toolbar.appendChild(element);
        this.applyBtn = this.toolbar.querySelector("#apply-btn") as HTMLElement;
        this.saveBtn = this.toolbar.querySelector("#save-btn") as HTMLElement;
        this.cropBtn = this.toolbar.querySelector("#crop-btn") as HTMLElement;
        this.pencilBtn = this.toolbar.querySelector("#pencil-btn") as HTMLElement;
        this.panBtn = this.toolbar.querySelector("#pan-btn") as HTMLElement;
    }

    private addListeners(): void {
        this.applyBtn.addEventListener("click", (evt) => this.handleApplyBtn(evt));
        this.saveBtn.addEventListener("click", (evt) => this.handleSaveBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
        this.panBtn.addEventListener("click", (evt) => this.handlePanBtn(evt));
        this.pencilBtn.addEventListener("click", (evt) => this.handlePencilBtn(evt));
        this.onActiveToolChange.addListener((evt) => this.handleActiveToolChange(evt));
        this.crop.onCropRectVisibility.addListener((evt) => this.handleCropRectVisibility(evt));
    }

    private attach(): void {
        this.container.insertBefore(this.toolbar, this.container.firstChild);
    }

    showCropApplyBtn(): void {
        this.applyBtn.style.display = "";
    }

    hideCropApplyBtn(): void {
        this.applyBtn.style.display = "none";
    }

    private handlePanBtn(evt): void {
        if (this.state.activeTool !== ToolType.Zoom) {
            this.panBtn.classList.add("active");
            this.onActiveToolChange.emit({ data: ToolType.Zoom });
        } else {
            this.hideCropApplyBtn();
            this.panBtn.classList.remove("active");
            this.onActiveToolChange.emit({ data: null });
        }
    }

    private handleCropBtn(evt): void {
        if (this.state.activeTool !== ToolType.Crop) {
            this.cropBtn.classList.add("active");
            this.onActiveToolChange.emit({ data: ToolType.Crop });
        } else {
            this.hideCropApplyBtn();
            this.cropBtn.classList.remove("active");
            this.onActiveToolChange.emit({ data: null });
        }
    }

    private handlePencilBtn(evt): void {
        if (this.state.activeTool !== ToolType.Pencil) {
            this.pencilBtn.classList.add("active");
            this.onActiveToolChange.emit({ data: ToolType.Pencil });
        } else {
            this.cropBtn.classList.remove("active");
            this.onActiveToolChange.emit({ data: null });
        }
    }

    private handleApplyBtn(evt): void {
        this.hideCropApplyBtn();
        this.onCropApply.emit({ data: true });
        this.onActiveToolChange.emit({ data: null });
    }

    private handleSaveBtn(evt): void {
        this.onSaveImage.emit({ data: true });
    }

    private handleCropRectVisibility(evt): void {
        if (evt.data === true) {
            this.showCropApplyBtn();
        } else {
            this.hideCropApplyBtn();
        }
    }

    private handleActiveToolChange(evt) {
        this.state.activeTool = evt.data;
        if (evt.data !== null) {
            this.getActiveTool().activate();
        } else {
            this.clearToolCanvas();
            this.toolCanvas.style.cursor = "default";
        }
    }

    getActiveTool(): Tool {
        switch(this.state.activeTool) {
            case ToolType.Crop:
                return this.crop;
            case ToolType.Zoom:
                return this.pan;
            case ToolType.Pencil:
                return this.pencil;
            default:
                return null;
        }
    }

    private clearToolCanvas(): void {
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
    }
}
