import * as Events from "./event";
import { CropTool } from "./crop-tool";
import { PencilTool } from "./pencil-tool";
import { Tool } from "./tool";
import { EditorState } from "./editor";
import { Rect, RectChange } from "./util";

export enum ToolType {
    Crop,
    Pencil
}

interface ToolbarState {
    activeTool: ToolType | null;
}

export class Toolbar {
    private toolCanvas: HTMLCanvasElement;
    private toolCtx: CanvasRenderingContext2D;
    pencil: PencilTool;
    crop: CropTool;
    private toolbar: HTMLElement;
    private applyBtn: HTMLElement;
    private saveBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private pencilBtn: HTMLElement;
    private state: ToolbarState = {
        activeTool: null
    }
    onSaveImage: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onCropApply: Events.Dispatcher<RectChange> = Events.Dispatcher.createEventDispatcher();
    onActiveToolChange: Events.Dispatcher<ToolType | null> = Events.Dispatcher.createEventDispatcher();

    constructor(state: EditorState) {
        this.toolCanvas = document.getElementById("tt-tool-canvas") as HTMLCanvasElement;
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.pencil = new PencilTool(state);
        this.crop = new CropTool(state);
        this.render();
        this.addListeners();
    }

    private render(): void {
        this.toolbar = document.getElementById("tt-toolbar") as HTMLElement;
        this.toolbar.id = "tt-toolbar";
        this.toolbar.innerHTML = `<button id="pencil-btn">Pencil</button>
                             <button id="crop-btn">Crop</button>
                             <button id="apply-btn" style="display:none">Apply</button>
                             <button id="save-btn">Save</button>`;
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
    }

    showCropApplyBtn(): void {
        this.applyBtn.style.display = "";
    }

    hideCropApplyBtn(): void {
        this.applyBtn.style.display = "none";
    }

    private handleCropBtn(evt): void {
        if (this.state.activeTool !== ToolType.Crop) {
            this.showCropApplyBtn();
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
        this.onCropApply.emit({ data: this.crop.getCropChange() });
        this.crop.resetState();
        this.onActiveToolChange.emit({ data: null });
    }

    private handleSaveBtn(evt): void {
        this.onSaveImage.emit({ data: true });
    }

    private removeAllActiveClasses(): void {
        let buttons = this.toolbar.querySelectorAll("button.active");
        if (buttons.length !== 0) {
            for (let i = 0; i < buttons.length; ++i) {
                let item = buttons[i];
                item.classList.remove("active");
            }
        }
    }

    private handleActiveToolChange(evt) {
        this.state.activeTool = evt.data;
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
        if (evt.data !== null) {
            this.getActiveTool().init();
        } else {
            this.toolCanvas.style.cursor = "default";
            this.removeAllActiveClasses();
        }
    }

    getActiveTool(): Tool {
        switch(this.state.activeTool) {
            case ToolType.Pencil:
                return this.pencil;
            case ToolType.Crop:
                return this.crop;
            default:
                return null;
        }
    }

    getActiveToolType(): ToolType | null {
        return this.state.activeTool;
    }
}
