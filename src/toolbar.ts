import * as Events from "./event";

export enum ToolType {
    Crop
}

interface ToolbarState {
    activeTool: ToolType | null;
}

export class Toolbar {
    private toolbar: DocumentFragment = document.createDocumentFragment();
    private applyBtn: HTMLElement;
    private saveJpegBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private container: DocumentFragment;
    private state: ToolbarState = {
        activeTool: null
    }
    onJpegSaved: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onCropApply: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onActiveToolChange: Events.Dispatcher<ToolType | null> = Events.Dispatcher.createEventDispatcher();

    constructor(container: DocumentFragment) {
        this.container = container;
        this.render();
        this.addListeners();
        this.attach();
    }

    private render(): void {
        const element: HTMLElement = document.createElement("div");
        this.toolbar = document.createDocumentFragment();
        element.id = "tt-image-editor-toolbar";
        element.innerHTML = `<button id="crop-btn">Crop</button>
                             <button id="apply-btn" style="display:none">Apply</button>
                             <button id="save-jpeg-btn" style="display:none">Save jpeg</button>`;
        this.toolbar.appendChild(element);
        this.applyBtn = this.toolbar.querySelector("#apply-btn") as HTMLElement;
        this.saveJpegBtn = this.toolbar.querySelector("#save-jpeg-btn") as HTMLElement;
        this.cropBtn = this.toolbar.querySelector("#crop-btn") as HTMLElement;
    }

    private addListeners(): void {
        this.applyBtn.addEventListener("click", (evt) => this.handleApplyBtn(evt));
        this.saveJpegBtn.addEventListener("click", (evt) => this.handleSaveJpegBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
        this.onActiveToolChange.addListener((evt) => this.handleActiveToolChange(evt));
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
            this.onActiveToolChange.emit({ data: ToolType.Crop });
        } else {
            this.hideCropApplyBtn();
            this.cropBtn.classList.remove("active");
            this.onActiveToolChange.emit({ data: null });
        }
    }

    private handleApplyBtn(evt): void {
        this.hideCropApplyBtn();
        this.onCropApply.emit({ data: true });
        this.onActiveToolChange.emit({ data: null });
    }

    private handleSaveJpegBtn(evt): void {
        // this.canvas.toDataURL("image/jpeg", 1.0)
        this.onJpegSaved.emit({ data: true });
    }

    private handleActiveToolChange(evt) {
        this.state.activeTool = evt.data;
    }
}
