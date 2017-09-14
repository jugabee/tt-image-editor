import { editor, ToolType } from "./editor";
import { pencilTool } from "./pencil-tool";
import { cropTool } from "./crop-tool";
import { sprayTool } from "./spray-tool";
import * as Events from "./event";
import * as util from "./util";
import { Rect, RectChange } from "./util";

class Toolbar {
    private toolbar: HTMLElement;
    private applyBtn: HTMLElement;
    private saveBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private loadBtn: HTMLElement;
    private loadFileInput: HTMLElement;
    private undoBtn: HTMLElement;
    private redoBtn: HTMLElement;
    private pencilBtn: HTMLElement;
    private sprayBtn: HTMLElement;
    private pencilSizeSel: HTMLElement;
    private pencilOpacitySel: HTMLElement;
    private pencilEraserBtn: HTMLElement;
    private toolSubBtnsDivs: NodeList;
    private pencilSubBtnsDiv: HTMLElement;
    private spraySubBtnsDiv: HTMLElement;
    private spraySizeSel: HTMLElement;
    private sprayOpacitySel: HTMLElement;
    private sprayEraserBtn: HTMLElement;
    private cropSubBtnsDiv: HTMLElement;
    private colorBtn: HTMLElement;

    constructor() { }

    init(): void {
        this.render();
        this.addListeners();
    }

    private render(): void {
        this.toolbar = document.querySelector("#tt-image-editor #toolbar") as HTMLElement;
        this.toolbar.innerHTML =
            `
            <a id="color-btn" class="btn">Color</a>
            <input type="file" id="load-file-input" style="display:none">
            <a id="load-btn" title="load an image" class="btn">Load</a>
            <a id="undo-btn" title="undo" class="btn"><img src="/images/Arrow Back.svg" /></a>
            <a id="redo-btn" title="redo" class="btn"><img src="/images/Arrow Forward.svg" /></a>
            <a id="pencil-btn" class="btn">Pencil</a>
            <div id="pencil-sub-btns" class="tool-sub-btns">
                <select id="pencil-size-sel" class="btn">
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
                <select id="pencil-opacity-sel" class="btn">
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
                <a id="pencil-eraser-btn" class="btn" title="eraser">&#9746;</a>
            </div>
            <a id="spray-btn" class="btn">Spray</a>
            <div id="spray-sub-btns" class="tool-sub-btns">
                <select id="spray-size-sel" class="btn">
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
                <select id="spray-opacity-sel" class="btn">
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
                <a id="spray-eraser-btn" class="btn" title="eraser">&#9746;</a>
            </div>
            <a id="crop-btn" class="btn">Crop</a>
            <div id="crop-sub-btns" class="tool-sub-btns">
                <a id="crop-btn-apply" class="btn">&#10004;</a>
            </div>
            <a id="save-btn" title="download png" class="btn">Save</a>
            `;
        this.loadFileInput = this.toolbar.querySelector("#load-file-input") as HTMLElement;
        this.loadBtn = this.toolbar.querySelector("#load-btn") as HTMLElement;
        this.applyBtn = this.toolbar.querySelector("#crop-btn-apply") as HTMLElement;
        this.saveBtn = this.toolbar.querySelector("#save-btn") as HTMLElement;
        this.cropBtn = this.toolbar.querySelector("#crop-btn") as HTMLElement;
        this.undoBtn = this.toolbar.querySelector("#undo-btn") as HTMLElement;
        this.redoBtn = this.toolbar.querySelector("#redo-btn") as HTMLElement;
        this.pencilBtn = this.toolbar.querySelector("#pencil-btn") as HTMLElement;
        this.sprayBtn = this.toolbar.querySelector("#spray-btn") as HTMLElement;
        this.toolSubBtnsDivs = this.toolbar.querySelectorAll(".tool-sub-btns");
        this.cropSubBtnsDiv = this.toolbar.querySelector("#crop-sub-btns") as HTMLElement;
        this.pencilSubBtnsDiv = this.toolbar.querySelector("#pencil-sub-btns") as HTMLElement;
        this.pencilSizeSel = this.toolbar.querySelector("#pencil-size-sel") as HTMLElement;
        this.pencilOpacitySel = this.toolbar.querySelector("#pencil-opacity-sel") as HTMLElement;
        this.pencilEraserBtn = this.toolbar.querySelector("#pencil-eraser-btn") as HTMLElement;
        this.spraySubBtnsDiv = this.toolbar.querySelector("#spray-sub-btns") as HTMLElement;
        this.spraySizeSel = this.toolbar.querySelector("#spray-size-sel") as HTMLElement;
        this.sprayOpacitySel = this.toolbar.querySelector("#spray-opacity-sel") as HTMLElement;
        this.sprayEraserBtn = this.toolbar.querySelector("#spray-eraser-btn") as HTMLElement;
        this.colorBtn = this.toolbar.querySelector("#color-btn") as HTMLElement;
    }

    private addListeners(): void {
        this.loadBtn.addEventListener("click", (evt) => this.handleLoadBtn(evt));
        this.loadFileInput.addEventListener("change", (evt) => this.handleLoadFileInput(evt));
        this.applyBtn.addEventListener("click", (evt) => this.handleApplyBtn(evt));
        this.saveBtn.addEventListener("click", (evt) => this.handleSaveBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
        this.undoBtn.addEventListener("click", (evt) => this.handleUndoBtn(evt));
        this.redoBtn.addEventListener("click", (evt) => this.handleRedoBtn(evt));
        this.pencilBtn.addEventListener("click", (evt) => this.handlePencilBtn(evt));
        this.pencilSizeSel.addEventListener("change", (evt) => this.handlePencilSizeSel(evt));
        this.pencilOpacitySel.addEventListener("change", (evt) => this.handlePencilOpacitySel(evt));
        this.pencilEraserBtn.addEventListener("click", (evt) => this.handlePencilEraserBtn(evt));
        this.sprayBtn.addEventListener("click", (evt) => this.handleSprayBtn(evt));
        this.spraySizeSel.addEventListener("change", (evt) => this.handleSpraySizeSel(evt));
        this.sprayOpacitySel.addEventListener("change", (evt) => this.handleSprayOpacitySel(evt));
        this.sprayEraserBtn.addEventListener("click", (evt) => this.handleSprayEraserBtn(evt));
        editor.onColorSampled.addListener((evt) => this.handleColorSampled(evt));
    }

    private handleUndoBtn(evt): void {
        editor.undo();
    }

    private handleRedoBtn(evt): void {
        editor.redo();
    }

    private handleCropBtn(evt): void {
        if (editor.state.activeTool !== ToolType.CROP) {
            this.deactivateSelector(".btn");
            this.showElement(this.cropSubBtnsDiv);
            evt.target.classList.add("active");
            editor.setActiveTool(ToolType.CROP);
        } else {
            this.hideElement(this.cropSubBtnsDiv);
            evt.target.classList.remove("active");
            editor.setActiveTool(null);
        }
    }

    private handlePencilBtn(evt): void {
        if (editor.state.activeTool !== ToolType.PENCIL) {
            this.deactivateSelector(".btn");
            this.showElement(this.pencilSubBtnsDiv);
            evt.target.classList.add("active");
            editor.setActiveTool(ToolType.PENCIL);
        } else {
            evt.target.classList.remove("active");
            this.hideElement(this.pencilSubBtnsDiv);
            editor.setActiveTool(null);
        }
    }

    private handleSprayBtn(evt): void {
        if (editor.state.activeTool !== ToolType.SPRAY) {
            this.deactivateSelector(".btn");
            this.showElement(this.spraySubBtnsDiv);
            evt.target.classList.add("active");
            editor.setActiveTool(ToolType.SPRAY);
        } else {
            evt.target.classList.remove("active");
            this.hideElement(this.spraySubBtnsDiv);
            editor.setActiveTool(null);
        }
    }

    private handlePencilSizeSel(evt): void {
        let size = evt.target.value;
        pencilTool.setLineWidth(size);
    }

    private handlePencilOpacitySel(evt): void {
        let opacity = evt.target.value;
        pencilTool.setOpacity(opacity);
    }

    private handlePencilEraserBtn(evt): void {
        if (evt.target.classList.contains("active")) {
            evt.target.classList.remove("active");
            pencilTool.setEraser(false);
        } else {
            evt.target.classList.add("active");
            pencilTool.setEraser(true);
        }
    }

    private handleSpraySizeSel(evt): void {
        let size = evt.target.value;
        sprayTool.setLineWidth(size);
    }

    private handleSprayOpacitySel(evt): void {
        let opacity = evt.target.value;
        sprayTool.setOpacity(opacity);
    }

    private handleSprayEraserBtn(evt): void {
        if (evt.target.classList.contains("active")) {
            evt.target.classList.remove("active");
            sprayTool.setEraser(false);
        } else {
            evt.target.classList.add("active");
            sprayTool.setEraser(true);
        }
    }

    private handleApplyBtn(evt): void {
        this.hideElement(this.cropSubBtnsDiv);
        editor.crop(cropTool.getCropChange());
        editor.setActiveTool(null);
    }

    private handleLoadBtn(evt): void {
        if (this.loadFileInput) {
            this.loadFileInput.click();
        }
        evt.preventDefault();
    }

    private handleLoadFileInput(evt): void {
        let file = evt.target.files[0];
        if (file) {
            util.handleFile(file, (img) => { editor.loadImage(img) });
        }
    }

    private handleSaveBtn(evt): void {
        editor.save();
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
        element.style.display = "table";
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
        this.colorBtn.style.background = evt.data;
        this.colorBtn.title = evt.data;
    }
}

export let toolbar = new Toolbar();
