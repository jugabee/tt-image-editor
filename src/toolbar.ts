import { Editor, ToolType } from "./editor";
import { Pencil, PencilSize } from "./pencil-tool";
import { Crop } from "./crop-tool";
import * as Events from "./event";
import * as Util from "./util";
import { Rect, RectChange } from "./util";

class Toolbar {
    private toolbar: HTMLElement;
    private applyBtn: HTMLElement;
    private saveBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private pencilBtn: HTMLElement;
    private pencilOpacitySel: HTMLElement;
    private pencilEraserBtn: HTMLElement;
    private pencilSprayBtn: HTMLElement;
    private pencilSizeBtns: NodeList;
    private toolSubBtnsDivs: NodeList;
    private pencilSubBtnsDiv: HTMLElement;
    private cropSubBtnsDiv: HTMLElement;
    private colorSelectionDiv: HTMLElement;

    constructor() { }

    init(): void {
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
                <button id="pencil-opacity-btn" class="sub-btn" title="opacity" disabled>
                    <span class="pencil-size-icon"></span>
                    <span class="pencil-size-icon"></span>
                    <span class="pencil-size-icon"></span>
                </button>
                <select id="pencil-opacity-sel" class="sub-btn">
                    <option value="1" selected>1</option>
                    <option value=".9">.9</option>
                    <option value=".8">.8</option>
                    <option value=".7">.7</option>
                    <option value=".6">.6</option>
                    <option value=".5">.5</option>
                    <option value=".4">.4</option>
                    <option value=".3">.3</option>
                    <option value=".2">.2</option>
                    <option value=".1">.1</option>
                </select>
                <button id="pencil-spray-btn" class="sub-btn" title="spray">&there4;</button>
                <button id="pencil-eraser-btn" class="sub-btn" title="eraser">&#9746;</button>
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
        this.pencilOpacitySel = this.toolbar.querySelector("#pencil-opacity-sel") as HTMLElement;
        this.pencilEraserBtn = this.toolbar.querySelector("#pencil-eraser-btn") as HTMLElement;
        this.pencilSprayBtn = this.toolbar.querySelector("#pencil-spray-btn") as HTMLElement;
        this.colorSelectionDiv = this.toolbar.querySelector("#color-selection-div") as HTMLElement;
    }

    private addListeners(): void {
        this.applyBtn.addEventListener("click", (evt) => this.handleApplyBtn(evt));
        this.saveBtn.addEventListener("click", (evt) => this.handleSaveBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
        this.pencilBtn.addEventListener("click", (evt) => this.handlePencilBtn(evt));
        this.pencilOpacitySel.addEventListener("change", (evt) => this.handlePencilOpacitySel(evt));
        this.pencilEraserBtn.addEventListener("click", (evt) => this.handlePencilEraserBtn(evt));
        this.pencilSprayBtn.addEventListener("click", (evt) => this.handlePencilSprayBtn(evt));
        Util.addEventListenerList(this.pencilSizeBtns, "click", (evt) => this.handlePencilSizeBtns(evt));
        Pencil.onColorSampled.addListener((evt) => this.handleColorSampled(evt));
    }

    private handleCropBtn(evt): void {
        if (Editor.state.activeTool !== ToolType.CROP) {
            this.deactivateSelector(".btn");
            this.showElement(this.cropSubBtnsDiv);
            evt.target.classList.add("active");
            Editor.setActiveTool(ToolType.CROP);
        } else {
            this.hideElement(this.cropSubBtnsDiv);
            evt.target.classList.remove("active");
            Editor.setActiveTool(null);
        }
    }

    private handlePencilBtn(evt): void {
        if (Editor.state.activeTool !== ToolType.PENCIL) {
            this.deactivateSelector(".btn");
            this.showElement(this.pencilSubBtnsDiv);
            evt.target.classList.add("active");
            Editor.setActiveTool(ToolType.PENCIL);
        } else {
            evt.target.classList.remove("active");
            this.hideElement(this.pencilSubBtnsDiv);
            Editor.setActiveTool(null);
        }
    }

    private handlePencilOpacitySel(evt): void {
        let opacity = evt.target.value;
        Pencil.setOpacity(opacity);
    }

    private handlePencilEraserBtn(evt): void {
        if (evt.target.classList.contains("active")) {
            evt.target.classList.remove("active");
            Pencil.setEraser(false);
        } else {
            evt.target.classList.add("active");
            Pencil.setEraser(true);
        }
    }

    private handlePencilSprayBtn(evt): void {
        if (evt.target.classList.contains("active")) {
            evt.target.classList.remove("active");
            Pencil.setSpray(false);
        } else {
            evt.target.classList.add("active");
            Pencil.setSpray(true);
        }
    }

    private handlePencilSizeBtns(evt): void {
        let id: string = evt.target.id.split("").pop();
        let size: number = PencilSize.SIZE_3;
        this.deactivateSelector("#pencil-size-btns .sub-btn.active");
        evt.target.classList.add("active");
        switch (id) {
            case "1":
                size = PencilSize.SIZE_1;
                break;
            case "2":
                size = PencilSize.SIZE_2;
                break;
            case "3":
                size = PencilSize.SIZE_3;
                break;
            case "4":
                size = PencilSize.SIZE_4;
                break;
            case "5":
                size = PencilSize.SIZE_5;
                break;
            case "6":
                size = PencilSize.SIZE_6;
                break;
            case "7":
                size = PencilSize.SIZE_7;
                break;
            case "8":
                size = PencilSize.SIZE_8;
                break;
        }
        Pencil.setLineWidth(size);
    }

    private handleApplyBtn(evt): void {
        this.hideElement(this.cropSubBtnsDiv);
        Editor.crop(Crop.getCropChange());
        Editor.setActiveTool(null);
    }

    private handleSaveBtn(evt): void {
        Editor.save();
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

    // deactive parent tool buttons
    deactivateAllToolButtons(): void {
        this.deactivateSelector(".btn.active");
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

    private handleColorSampled(evt) {
        this.colorSelectionDiv.style.background = evt.data;
        this.colorSelectionDiv.title = evt.data;
    }
}

export let ToolbarUI = new Toolbar();
