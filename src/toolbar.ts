import * as Events from "./event";

export enum Tools {
    Crop
}

interface ToolbarState {
    activeTool: Tools | null;
}

export class Toolbar {
    private toolbar: DocumentFragment = document.createDocumentFragment();
    private savePngBtn: HTMLElement;
    private saveJpegBtn: HTMLElement;
    private cropBtn: HTMLElement;
    private container: DocumentFragment;
    state: ToolbarState = {
        activeTool: null
    }
    onJpegSaved: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPngSaved: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onActiveToolChange: Events.Dispatcher<Tools | null> = Events.Dispatcher.createEventDispatcher();

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
                             <button id="save-png-btn">Save png</button>
                             <button id="save-jpeg-btn">Save jpeg</button>`;
        this.toolbar.appendChild(element);
        this.savePngBtn = this.toolbar.querySelector("#save-png-btn") as HTMLElement;
        this.saveJpegBtn = this.toolbar.querySelector("#save-jpeg-btn") as HTMLElement;
        this.cropBtn = this.toolbar.querySelector("#crop-btn") as HTMLElement;
    }

    private addListeners(): void {
        this.savePngBtn.addEventListener("click", (evt) => this.handleSavePngBtn(evt));
        this.saveJpegBtn.addEventListener("click", (evt) => this.handleSaveJpegBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
    }

    private attach(): void {
        this.container.appendChild(this.toolbar);
    }

    private handleCropBtn(evt): void {
        this.state.activeTool = Tools.Crop;
        this.cropBtn.classList.add("active");
        this.onActiveToolChange.emit({ data: Tools.Crop });
    }

    private handleSavePngBtn(evt): void {
        this.onPngSaved.emit({ data: true });
    }

    private handleSaveJpegBtn(evt): void {
        // this.canvas.toDataURL("image/jpeg", 1.0)
        this.onJpegSaved.emit({ data: true });
    }
}
