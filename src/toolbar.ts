import * as Events from "./event";

export enum Tools {
    Crop
}

export class Toolbar {
    private fragment: DocumentFragment;
    private savePngBtn: HTMLElement;
    private saveJpegBtn: HTMLElement;
    private cropBtn: HTMLElement;
    activeTool: Tools | null = null;
    onJpegSaved: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onPngSaved: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();
    onCropToolActive: Events.Dispatcher<boolean> = Events.Dispatcher.createEventDispatcher();

    init(): DocumentFragment {
        this.render();
        this.savePngBtn = this.fragment.querySelector("#save-png-btn") as HTMLElement;
        this.saveJpegBtn = this.fragment.querySelector("#save-jpeg-btn") as HTMLElement;
        this.cropBtn = this.fragment.querySelector("#crop-btn") as HTMLElement;
        this.addListeners();

        return this.fragment;
    }

    private render(): void {
        const element: HTMLElement = document.createElement("div");
        this.fragment = document.createDocumentFragment();
        element.id = "tt-image-editor-toolbar";
        element.innerHTML = `<button id="crop-btn">Crop</button>
                             <button id="save-png-btn">Save png</button>
                             <button id="save-jpeg-btn">Save jpeg</button>`;
        this.fragment.appendChild(element);
    }

    private addListeners(): void {
        this.savePngBtn.addEventListener("click", (evt) => this.handleSavePngBtn(evt));
        this.saveJpegBtn.addEventListener("click", (evt) => this.handleSaveJpegBtn(evt));
        this.cropBtn.addEventListener("click", (evt) => this.handleCropBtn(evt));
    }

    private handleCropBtn(evt): void {
        this.activeTool = Tools.Crop;
        this.cropBtn.classList.add("active");
        this.onCropToolActive.emit({ data: true });
    }

    private handleSavePngBtn(evt): void {
        this.onPngSaved.emit({ data: true });
    }

    private handleSaveJpegBtn(evt): void {
        // this.canvas.toDataURL("image/jpeg", 1.0)
        this.onJpegSaved.emit({ data: true });
    }
}
