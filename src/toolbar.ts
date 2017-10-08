import { editor, ToolType } from "./editor";
import { keyMap } from "./key-map";
import { pencilTool } from "./pencil-tool";
import { cropTool } from "./crop-tool";
import { sprayTool } from "./spray-tool";
import { colorPickerTool } from "./color-picker-tool";
import * as util from "./util";
import { Rect, RectChange } from "./util";

class Toolbar {
    private toolbarWrapper: HTMLElement;
    private toolbar: HTMLElement;
    private cropApplyBtn: HTMLElement;
    private saveBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private loadBtn: HTMLElement;
    private loadFileInput: HTMLElement;
    private undoBtn: HTMLElement;
    private redoBtn: HTMLElement;
    private pencilBtn: HTMLElement;
    private sprayBtn: HTMLElement;
    private pencilSizeSel: HTMLElement;
    private pencilSizeVal: HTMLElement;
    private pencilOpacitySel: HTMLElement;
    private pencilOpacityVal: HTMLElement;
    private pencilEraserBtn: HTMLElement;
    private spraySizeSel: HTMLElement;
    private spraySizeVal: HTMLElement;
    private sprayOpacitySel: HTMLElement;
    private sprayOpacityVal: HTMLElement;
    private sprayEraserBtn: HTMLElement;
    private cropDropdown: HTMLElement;
    private colorBtn: HTMLElement;
    private colorDropdown: HTMLElement;
    private dropdownBtns: NodeList;
    private helpBtn: HTMLElement;
    private helpModal: HTMLElement;
    private helpModalCloseBtn: HTMLElement;

    constructor() { }

    init(): void {
        this.render();
        this.addListeners();
        this.initColorPickerTool();
    }

    private render(): void {
        this.helpModal = editor.editorElement.querySelector("#help-modal") as HTMLElement;
        this.helpModalCloseBtn = this.helpModal.getElementsByClassName("close")[0] as HTMLElement;
        this.toolbarWrapper = editor.editorElement.querySelector("#toolbar-wrapper") as HTMLElement;
        this.toolbar = editor.editorElement.querySelector("#toolbar") as HTMLElement;
        this.toolbar.innerHTML =
            `
            <input type="file" id="load-file-input" style="display:none">
            <div class="toolbar-item"><button id="load-btn" title="load an image" class="drop-btn">Load</button></div>
            <div class="toolbar-item"><button id="save-btn" title="download png" class="drop-btn">Save</button></div>
            <div class="toolbar-item"><button id="undo-btn" title="undo" class="drop-btn btn-sml"><img src="/images/Arrow Back.svg"></button></div>
            <div class="toolbar-item"><button id="redo-btn" title="redo" class="drop-btn btn-sml"><img src="/images/Arrow Forward.svg"></button></div>
            <div class="toolbar-item">
                <button id="pencil-btn" class="drop-btn">Pencil</button>
                <div class="dropdown-content" id="pencil-dropdown">
                    <div class="title">Pencil</div>
                    <div class="label-container">
                        <label>size <span id="pencil-size-val">4</span></label>
                        <input id="pencil-size-sel" type="range" value="4" min="1" max="200" step="1" />
                    </div>
                    <div class="label-container">
                        <label>opacity <span id="pencil-opacity-val">1</span></label>
                        <input id="pencil-opacity-sel" type="range" value="1" min="0" max="1" step=".1" />
                    </div>
                    <a id="pencil-eraser-btn" title="eraser" class="tool-sub-btn">Eraser</a>
                </div>
            </div>
            <div class="toolbar-item">
                <button id="spray-btn" class="drop-btn">Spray</button>
                <div class="dropdown-content" id="spray-dropdown">
                    <div class="title">Spray</div>
                    <div class="label-container">
                        <label>size <span id="spray-size-val">4</span></label>
                        <input id="spray-size-sel" type="range" value="4" min="1" max="200" step="1" />
                    </div>
                    <div class="label-container">
                        <label>opacity <span id="spray-opacity-val">1</span></label>
                        <input id="spray-opacity-sel" type="range" value="1" min="0" max="1" step=".1" />
                    </div>
                    <a id="spray-eraser-btn" title="eraser" class="tool-sub-btn">Eraser</a>
                </div>
            </div>
            <div class="toolbar-item">
                <button id="crop-btn" class="drop-btn">Crop</button>
                <div class="dropdown-content" id="crop-dropdown">
                    <div class="title">Crop</div>
                    <a id="crop-apply-btn" class="tool-sub-btn">&#10004;</a>
                </div>
            </div>
            <div class="toolbar-item">
                <button id="color-btn" class="btn-sml"></button>
                <div class="dropdown-content" id="color-dropdown">
                    <div class="title">Color Picker</div>
                </div>
            </div>
            <div class="toolbar-item"><button id="help-btn" title="help" class="drop-btn btn-sml">?</button></div>
            `;
        this.loadFileInput = this.toolbar.querySelector("#load-file-input") as HTMLElement;
        this.loadBtn = this.toolbar.querySelector("#load-btn") as HTMLElement;
        this.cropApplyBtn = this.toolbar.querySelector("#crop-apply-btn") as HTMLElement;
        this.saveBtn = this.toolbar.querySelector("#save-btn") as HTMLElement;
        this.cropBtn = this.toolbar.querySelector("#crop-btn") as HTMLElement;
        this.undoBtn = this.toolbar.querySelector("#undo-btn") as HTMLElement;
        this.redoBtn = this.toolbar.querySelector("#redo-btn") as HTMLElement;
        this.pencilBtn = this.toolbar.querySelector("#pencil-btn") as HTMLElement;
        this.sprayBtn = this.toolbar.querySelector("#spray-btn") as HTMLElement;
        this.cropDropdown = this.toolbar.querySelector("#crop-dropdown") as HTMLElement;
        this.pencilSizeSel = this.toolbar.querySelector("#pencil-size-sel") as HTMLElement;
        this.pencilSizeVal = this.toolbar.querySelector("#pencil-size-val") as HTMLElement;
        this.pencilOpacitySel = this.toolbar.querySelector("#pencil-opacity-sel") as HTMLElement;
        this.pencilOpacityVal = this.toolbar.querySelector("#pencil-opacity-val") as HTMLElement;
        this.pencilEraserBtn = this.toolbar.querySelector("#pencil-eraser-btn") as HTMLElement;
        this.spraySizeSel = this.toolbar.querySelector("#spray-size-sel") as HTMLElement;
        this.spraySizeVal = this.toolbar.querySelector("#spray-size-val") as HTMLElement;
        this.sprayOpacitySel = this.toolbar.querySelector("#spray-opacity-sel") as HTMLElement;
        this.sprayOpacityVal = this.toolbar.querySelector("#spray-opacity-val") as HTMLElement;
        this.sprayEraserBtn = this.toolbar.querySelector("#spray-eraser-btn") as HTMLElement;
        this.colorBtn = this.toolbar.querySelector("#color-btn") as HTMLElement;
        this.colorDropdown = this.toolbar.querySelector("#color-dropdown") as HTMLElement;
        this.helpBtn = this.toolbar.querySelector("#help-btn") as HTMLElement;
        this.dropdownBtns = this.toolbar.querySelectorAll(".drop-btn");
    }

    private addListeners(): void {
        this.loadBtn.addEventListener("click", (evt) => this.handleLoadBtn(evt));
        this.loadFileInput.addEventListener("change", (evt) => this.handleLoadFileInput(evt));
        this.cropApplyBtn.addEventListener("click", (evt) => this.handleCropApplyBtn());
        this.saveBtn.addEventListener("click", (evt) => this.handleSaveBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn());
        this.undoBtn.addEventListener("click", (evt) => this.handleUndoBtn(evt));
        this.redoBtn.addEventListener("click", (evt) => this.handleRedoBtn(evt));
        this.colorBtn.addEventListener("click", (evt) => this.handleColorBtn());
        this.pencilBtn.addEventListener("click", (evt) => this.handlePencilBtn());
        this.pencilSizeSel.addEventListener("input", (evt) => this.handlePencilSizeSel(evt));
        this.pencilOpacitySel.addEventListener("input", (evt) => this.handlePencilOpacitySel(evt));
        this.pencilEraserBtn.addEventListener("click", (evt) => this.handlePencilEraserBtn());
        this.sprayBtn.addEventListener("click", (evt) => this.handleSprayBtn());
        this.spraySizeSel.addEventListener("input", (evt) => this.handleSpraySizeSel(evt));
        this.sprayOpacitySel.addEventListener("input", (evt) => this.handleSprayOpacitySel(evt));
        this.sprayEraserBtn.addEventListener("click", (evt) => this.handleSprayEraserBtn());
        this.helpBtn.addEventListener("click", (evt) => this.handleHelpBtn(evt));
        this.helpModalCloseBtn.addEventListener("click", (evt) => this.handleHelpModalCloseBtn(evt));
        editor.editorElement.addEventListener("click", (evt) => this.handleHelpModalBackgroundClick(evt));
        editor.onColorSampled.addListener((evt) => this.handleColorSampled(evt));
    }

    private initColorPickerTool(): void {
        colorPickerTool.onColorPicked.addListener((evt) => { this.handleColorPicked(evt) });
        this.colorDropdown.appendChild(colorPickerTool.getColorPickerElement());
    }

    private toggleDropdown(id): void {
        this.toolbar.querySelector(id).classList.toggle("show");
    }

    private hideDropdowns(): void {
        let nodes: NodeList = this.toolbar.querySelectorAll(".dropdown-content.show");
        for (let i = 0; i < nodes.length; i++) {
            let node: HTMLElement = nodes[i] as HTMLElement;
            node.classList.remove("show");
        }
    }

    private deactivateDropdownBtns(): void {
        let nodes: NodeList = this.toolbar.querySelectorAll(".drop-btn.active");
        for (let i = 0; i < nodes.length; i++) {
            let node: HTMLElement = nodes[i] as HTMLElement;
            node.classList.remove("active");
        }
    }

    toggleHelpModal(): void {
        this.helpModal.classList.toggle("show");
    }

    private handleHelpModalCloseBtn(evt): void {
        this.toggleHelpModal();
        editor.editorElement.focus();
    }

    private handleHelpModalBackgroundClick(evt): void {
        if (evt.target == this.helpModal) {
            this.toggleHelpModal();
            editor.editorElement.focus();
        }
    }

    private handleHelpBtn(evt): void {
        this.toggleHelpModal();
    }

    private handleUndoBtn(evt): void {
        editor.undo();
    }

    private handleRedoBtn(evt): void {
        editor.redo();
    }

    handleColorBtn(): void {
        if (editor.state.activeTool !== ToolType.COLOR) {
            this.hideDropdowns();
            this.deactivateDropdownBtns();
            this.colorBtn.classList.add("active");
            editor.setActiveTool(ToolType.COLOR);
        } else {
            this.colorBtn.classList.remove("active");
            editor.setActiveTool(null);
        }
        this.toggleDropdown("#color-dropdown");
    }

    handleCropBtn(): void {
        if (editor.state.activeTool !== ToolType.CROP) {
            this.hideDropdowns();
            this.deactivateDropdownBtns();
            this.cropBtn.classList.add("active");
            editor.setActiveTool(ToolType.CROP);
        } else {
            this.cropBtn.classList.remove("active");
            editor.setActiveTool(null);
        }
        this.toggleDropdown("#crop-dropdown");
    }

    handlePencilBtn(): void {
        if (editor.state.activeTool !== ToolType.PENCIL) {
            this.hideDropdowns();
            this.deactivateDropdownBtns();
            this.pencilBtn.classList.add("active");
            editor.setActiveTool(ToolType.PENCIL);
        } else {
            this.pencilBtn.classList.remove("active");
            editor.setActiveTool(null);
        }
        this.toggleDropdown("#pencil-dropdown");
    }

    handleSprayBtn(): void {
        if (editor.state.activeTool !== ToolType.SPRAY) {
            this.hideDropdowns();
            this.deactivateDropdownBtns();
            this.sprayBtn.classList.add("active");
            editor.setActiveTool(ToolType.SPRAY);
        } else {
            this.sprayBtn.classList.remove("active");
            editor.setActiveTool(null);
        }
        this.toggleDropdown("#spray-dropdown");
    }

    private handlePencilSizeSel(evt): void {
        let size = evt.target.value;
        this.pencilSizeVal.textContent = size;
        pencilTool.setLineWidth(size);
    }

    private handlePencilOpacitySel(evt): void {
        let opacity = evt.target.value;
        this.pencilOpacityVal.textContent = opacity;
        pencilTool.setOpacity(opacity);
    }

    handlePencilEraserBtn(): void {
        if (this.pencilEraserBtn.classList.contains("active")) {
            this.pencilEraserBtn.classList.remove("active");
            pencilTool.setEraser(false);
        } else {
            this.pencilEraserBtn.classList.add("active");
            pencilTool.setEraser(true);
        }
    }

    private handleSpraySizeSel(evt): void {
        let size = evt.target.value;
        this.spraySizeVal.textContent = size;
        sprayTool.setLineWidth(size);
    }

    private handleSprayOpacitySel(evt): void {
        let opacity = evt.target.value;
        this.sprayOpacityVal.textContent = opacity;
        sprayTool.setOpacity(opacity);
    }

    handleSprayEraserBtn(): void {
        if (this.sprayEraserBtn.classList.contains("active")) {
            this.sprayEraserBtn.classList.remove("active");
            sprayTool.setEraser(false);
        } else {
            this.sprayEraserBtn.classList.add("active");
            sprayTool.setEraser(true);
        }
    }

    handleCropApplyBtn(): void {
        this.toggleDropdown("#crop-dropdown");
        this.deactivateDropdownBtns();
        editor.crop(cropTool.getCropChange());
        editor.setActiveTool(null);
    }

    handleLoadBtn(evt?): void {
        if (this.loadFileInput) {
            this.loadFileInput.click();
        }
        if (evt) {
            evt.preventDefault();
        }
    }

    private handleLoadFileInput(evt): void {
        let file = evt.target.files[0];
        if (file) {
            this.toolbarWrapper.classList.add("loading");
            util.handleFile(file, (img) => {
                this.toolbarWrapper.classList.remove("loading");
                editor.loadImage(img);
                editor.centerImage();
            });
        }
    }

    private handleSaveBtn(evt): void {
        editor.save();
    }

    private handleColorSampled(evt) {
        this.colorBtn.style.background = evt.data;
        this.colorBtn.title = evt.data;
    }

    private handleColorPicked(evt): void {
        this.colorBtn.style.background = util.colorToString(evt.data);
        this.colorBtn.title = util.colorToString(evt.data);
    }
}

export let toolbar = new Toolbar();
