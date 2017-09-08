import { Editor, ToolType } from "./editor";
import { Pencil } from "./pencil-tool";
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
    private pencilSizeSel: HTMLElement;
    private pencilOpacitySel: HTMLElement;
    private pencilEraserBtn: HTMLElement;
    private pencilSprayBtn: HTMLElement;
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
                <button id="pencil-size-btn" class="sub-btn" title="size" disabled>
                    <span class="pencil-size-icon"></span>
                </button>
                <select id="pencil-size-sel" class="sub-btn">
                    <option value=".5">.5</option>
                    <option value="2">2</option>
                    <option value="4" selected>4</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="14">14</option>
                    <option value="18">18</option>
                    <option value="24">24</option>
                    <option value="36">36</option>
                    <option value="48">48</option>
                    <option value="60">60</option>
                </select>
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
        this.cropSubBtnsDiv = this.toolbar.querySelector("#crop-sub-btns") as HTMLElement;
        this.pencilSubBtnsDiv = this.toolbar.querySelector("#pencil-sub-btns") as HTMLElement;
        this.pencilSizeSel = this.toolbar.querySelector("#pencil-size-sel") as HTMLElement;
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
        this.pencilSizeSel.addEventListener("change", (evt) => this.handlePencilSizeSel(evt));
        this.pencilOpacitySel.addEventListener("change", (evt) => this.handlePencilOpacitySel(evt));
        this.pencilEraserBtn.addEventListener("click", (evt) => this.handlePencilEraserBtn(evt));
        this.pencilSprayBtn.addEventListener("click", (evt) => this.handlePencilSprayBtn(evt));
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

    private handlePencilSizeSel(evt): void {
        let size = evt.target.value;
        Pencil.setLineWidth(size);
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
