import * as Events from "./event";
import * as Util from "./util";
import { CropTool } from "./crop-tool";
import { PencilTool } from "./pencil-tool";
import { Tool } from "./tool";
import { EditorState } from "./editor";
import { Rect, RectChange } from "./util";

export enum ToolType {
    CROP,
    PENCIL
}

export enum PencilSize {
    SIZE_1 = .5,
    SIZE_2 = 2,
    SIZE_3 = 4,
    SIZE_4 = 8,
    SIZE_5 = 12,
    SIZE_6 = 18,
    SIZE_7 = 24,
    SIZE_8 = 36
}

export interface ToolbarState {
    activeTool: ToolType | null;
    pencilSize: PencilSize;
    pencilIsEraser: boolean;
    pencilIsSpray: boolean;
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
    private pencilEraserBtn: HTMLElement;
    private pencilSprayBtn: HTMLElement;
    private pencilSizeBtns: NodeList;
    private toolSubBtnsDivs: NodeList;
    private pencilSubBtnsDiv: HTMLElement;
    private cropSubBtnsDiv: HTMLElement;
    private colorSelectionDiv: HTMLElement;
    private state: ToolbarState = {
        activeTool: null,
        pencilSize: PencilSize.SIZE_3,
        pencilIsEraser: false,
        pencilIsSpray: false
    }
    onSaveImage: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onCropApply: Events.Dispatcher<RectChange> = Events.Dispatcher.createEventDispatcher();
    onActiveToolChange: Events.Dispatcher<ToolType | null> = Events.Dispatcher.createEventDispatcher();

    constructor(editorState: EditorState, toolCanvas: HTMLCanvasElement, pencilCanvas: HTMLCanvasElement, viewCanvas: HTMLCanvasElement) {
        this.toolCanvas = toolCanvas;
        this.toolCtx = this.toolCanvas.getContext("2d");
        this.pencil = new PencilTool(editorState, this.state, pencilCanvas, viewCanvas);
        this.crop = new CropTool(editorState, toolCanvas);
        this.render();
        this.addListeners();
    }

    private render(): void {
        this.toolbar = document.querySelector("#tt-image-editor #toolbar") as HTMLElement;
        this.toolbar.innerHTML =
            `
            <div id="color-selection-div"></div>
            <button id="pencil-btn" class="btn">Pencil</button>
            <div id="pencil-sub-btns" class="tool-sub-btns">
                <button id="pencil-spray-btn" class="sub-btn" title="Spray">&there4;</button>
                <button id="pencil-eraser-btn" class="sub-btn" title="Eraser">&#9746;</button>
                <div id="pencil-size-btns">
                    <button id="pencil-btn-size-1" class="sub-btn"><span class="pencil-size-icon"></span></button>
                    <button id="pencil-btn-size-2" class="sub-btn"><span class="pencil-size-icon"></span></button>
                    <button id="pencil-btn-size-3" class="sub-btn active"><span class="pencil-size-icon"></span></button>
                    <button id="pencil-btn-size-4" class="sub-btn"><span class="pencil-size-icon"></span></button>
                    <button id="pencil-btn-size-5" class="sub-btn"><span class="pencil-size-icon"></span></button>
                    <button id="pencil-btn-size-6" class="sub-btn"><span class="pencil-size-icon"></span></button>
                    <button id="pencil-btn-size-7" class="sub-btn"><span class="pencil-size-icon"></span></button>
                    <button id="pencil-btn-size-8" class="sub-btn"><span class="pencil-size-icon"></span></button>
                </div>
            </div>
            <button id="crop-btn" class="btn">Crop</button>
            <div id="crop-sub-btns" class="tool-sub-btns">
                <button id="crop-btn-apply" class="sub-btn">&#10004;</button>
            </div>
            <button id="save-btn" class="btn">Save png</button>
            `;
        this.applyBtn = this.toolbar.querySelector("#crop-btn-apply") as HTMLElement;
        this.saveBtn = this.toolbar.querySelector("#save-btn") as HTMLElement;
        this.cropBtn = this.toolbar.querySelector("#crop-btn") as HTMLElement;
        this.pencilBtn = this.toolbar.querySelector("#pencil-btn") as HTMLElement;
        this.toolSubBtnsDivs = this.toolbar.querySelectorAll(".tool-sub-btns");
        this.pencilSizeBtns = this.toolbar.querySelectorAll("#pencil-size-btns .sub-btn");
        this.cropSubBtnsDiv = this.toolbar.querySelector("#crop-sub-btns") as HTMLElement;
        this.pencilSubBtnsDiv = this.toolbar.querySelector("#pencil-sub-btns") as HTMLElement;
        this.pencilEraserBtn = this.toolbar.querySelector("#pencil-eraser-btn") as HTMLElement;
        this.pencilSprayBtn = this.toolbar.querySelector("#pencil-spray-btn") as HTMLElement;
        this.colorSelectionDiv = this.toolbar.querySelector("#color-selection-div") as HTMLElement;
    }

    private addListeners(): void {
        this.applyBtn.addEventListener("click", (evt) => this.handleApplyBtn(evt));
        this.saveBtn.addEventListener("click", (evt) => this.handleSaveBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
        this.pencilBtn.addEventListener("click", (evt) => this.handlePencilBtn(evt));
        this.pencilEraserBtn.addEventListener("click", (evt) => this.handlePencilEraserBtn(evt));
        this.pencilSprayBtn.addEventListener("click", (evt) => this.handlePencilSprayBtn(evt));
        Util.addEventListenerList(this.pencilSizeBtns, "click", (evt) => this.handlePencilSizeBtns(evt));
        this.onActiveToolChange.addListener((evt) => this.handleActiveToolChange(evt));
        this.pencil.onColorSampled.addListener((evt) => this.handleColorSampled(evt));
    }

    private handleCropBtn(evt): void {
        if (this.state.activeTool !== ToolType.CROP) {
            this.deactivateSelector(".btn");
            this.showElement(this.cropSubBtnsDiv);
            evt.target.classList.add("active");
            this.onActiveToolChange.emit({ data: ToolType.CROP });
        } else {
            this.hideElement(this.cropSubBtnsDiv);
            evt.target.classList.remove("active");
            this.onActiveToolChange.emit({ data: null });
        }
    }

    private handlePencilBtn(evt): void {
        if (this.state.activeTool !== ToolType.PENCIL) {
            this.deactivateSelector(".btn");
            this.showElement(this.pencilSubBtnsDiv);
            evt.target.classList.add("active");
            this.onActiveToolChange.emit({ data: ToolType.PENCIL });
        } else {
            evt.target.classList.remove("active");
            this.hideElement(this.pencilSubBtnsDiv);
            this.onActiveToolChange.emit({ data: null });
        }
    }

    private handlePencilEraserBtn(evt): void {
        if (evt.target.classList.contains("active")) {
            evt.target.classList.remove("active");
            this.pencil.setEraser(false);
            this.state.pencilIsEraser = false;
        } else {
            evt.target.classList.add("active");
            this.pencil.setEraser(true);
            this.state.pencilIsEraser = true;
        }
    }

    private handlePencilSprayBtn(evt): void {
        if (evt.target.classList.contains("active")) {
            evt.target.classList.remove("active");
            this.pencil.setSpray(false);
            this.state.pencilIsSpray = false;
        } else {
            evt.target.classList.add("active");
            this.pencil.setSpray(true);
            this.state.pencilIsSpray = true;
        }
    }

    private handlePencilSizeBtns(evt): void {
        let id: string = evt.target.id.split("").pop();
        this.deactivateSelector("#pencil-size-btns .sub-btn.active");
        evt.target.classList.add("active");
        switch (id) {
            case "1":
                this.state.pencilSize = PencilSize.SIZE_1;
                break;
            case "2":
                this.state.pencilSize = PencilSize.SIZE_2;
                break;
            case "3":
                this.state.pencilSize = PencilSize.SIZE_3;
                break;
            case "4":
                this.state.pencilSize = PencilSize.SIZE_4;
                break;
            case "5":
                this.state.pencilSize = PencilSize.SIZE_5;
                break;
            case "6":
                this.state.pencilSize = PencilSize.SIZE_6;
                break;
            case "7":
                this.state.pencilSize = PencilSize.SIZE_7;
                break;
            case "8":
                this.state.pencilSize = PencilSize.SIZE_8;
                break;
        }
        this.pencil.setLineWidth(this.state.pencilSize);
    }

    private handleApplyBtn(evt): void {
        this.hideElement(this.cropSubBtnsDiv);
        this.onCropApply.emit({ data: this.crop.getCropChange() });
        this.onActiveToolChange.emit({ data: null });
    }

    private handleSaveBtn(evt): void {
        this.onSaveImage.emit({ data: true });
    }

    private deactivateSelector(selector: string): void {
        let buttons = this.toolbar.querySelectorAll(selector);
        if (buttons.length !== 0) {
            for (let i = 0; i < buttons.length; ++i) {
                let item = buttons[i];
                item.classList.remove("active");
            }
        }
    }

    private showElement(element: HTMLElement): void {
        this.hideElements(this.toolSubBtnsDivs);
        element.style.display = "flex";
    }

    private hideElement(element: HTMLElement): void {
        element.style.display = "none";
    }

    private hideElements(elements: NodeList): void {
        for (let i = 0; i < elements.length; i++) {
            let element: HTMLElement = elements[i] as HTMLElement;
            element.style.display = "none";
        }
    }

    private handleActiveToolChange(evt) {
        this.state.activeTool = evt.data;
        this.toolCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
        if (evt.data !== null) {
            this.getActiveTool().init();
        } else {
            this.toolCanvas.style.cursor = "default";
            this.deactivateSelector(".btn.active");
        }
    }

    private handleColorSampled(evt) {
        this.colorSelectionDiv.style.background = evt.data;
        this.colorSelectionDiv.title = evt.data;
    }

    getActiveTool(): Tool {
        switch(this.state.activeTool) {
            case ToolType.PENCIL:
                return this.pencil;
            case ToolType.CROP:
                return this.crop;
            default:
                return null;
        }
    }

    getActiveToolType(): ToolType | null {
        return this.state.activeTool;
    }
}
