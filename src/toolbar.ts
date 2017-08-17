import * as Events from "./event";
import { CropTool, Rect } from "./crop-tool";
import { PencilTool } from "./pencil-tool";
import { Tool } from "./tool";

export enum ToolType {
    Crop,
    Pencil
}

interface ToolbarState {
    activeTool: ToolType | null;
}

export class Toolbar {
    private toolCanvas: HTMLCanvasElement;
    crop: CropTool;
    pencil: PencilTool;
    private toolbar: DocumentFragment = document.createDocumentFragment();
    private applyBtn: HTMLElement;
    private saveBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private pencilBtn: HTMLElement;
    private container: HTMLElement;
    private state: ToolbarState = {
        activeTool: null
    }
    onSaveImage: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onCropApply: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onActiveToolChange: Events.Dispatcher<ToolType | null> = Events.Dispatcher.createEventDispatcher();

    constructor(container: HTMLElement) {
        this.container = container;
        this.toolCanvas = this.container.querySelector("#tt-tool-canvas") as HTMLCanvasElement;
        this.crop = new CropTool(this.toolCanvas);
        this.pencil = new PencilTool(this.toolCanvas);
        this.render();
        this.addListeners();
        this.attach();
    }

    private render(): void {
        const element: HTMLElement = document.createElement("div");
        this.toolbar = document.createDocumentFragment();
        element.id = "tt-toolbar";
        element.innerHTML = `<button id="pencil-btn">Pencil</button>
                             <button id="crop-btn">Crop</button>
                             <button id="apply-btn" style="display:none">Apply</button>
                             <button id="save-btn">Save</button>`;
        this.toolbar.appendChild(element);
        this.applyBtn = this.toolbar.querySelector("#apply-btn") as HTMLElement;
        this.saveBtn = this.toolbar.querySelector("#save-btn") as HTMLElement;
        this.cropBtn = this.toolbar.querySelector("#crop-btn") as HTMLElement;
        this.pencilBtn = this.toolbar.querySelector("#pencil-btn") as HTMLElement;
    }

    private addListeners(): void {
        this.applyBtn.addEventListener("click", (evt) => this.handleApplyBtn(evt));
        this.saveBtn.addEventListener("click", (evt) => this.handleSaveBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
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

    private handleCropBtn(evt): void {
        if (this.state.activeTool !== ToolType.Crop) {
            this.cropBtn.classList.add("active");
            this.pencilBtn.classList.remove("active");
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
            this.cropBtn.classList.remove("active");
            this.onActiveToolChange.emit({ data: ToolType.Pencil });
        } else {
            this.hideCropApplyBtn();
            this.pencilBtn.classList.remove("active");
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

    private removeAllActiveClasses(): void {
        let buttons = this.container.querySelectorAll("button.active");
        if (buttons.length !== 0) {
            for (let i = 0; i < buttons.length; ++i) {
                let item = buttons[i];
                item.classList.remove("active");
            }
        }
    }

    private handleActiveToolChange(evt) {
        this.state.activeTool = evt.data;
        if (evt.data !== null) {
            this.getActiveTool().activate();
        } else {
            console.log("active tool change")
            this.toolCanvas.style.cursor = "default";
            this.removeAllActiveClasses();
            this.toolCanvas.getContext("2d").clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
        }
    }

    getActiveTool(): Tool {
        switch(this.state.activeTool) {
            case ToolType.Crop:
                return this.crop;
            case ToolType.Pencil:
                return this.pencil;
            default:
                return null;
        }
    }
}
