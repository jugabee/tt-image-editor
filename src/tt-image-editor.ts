import * as Util from "./util";
import * as Events from "./event";
import { Toolbar, Tools } from "./toolbar";

export class TTImageEditor {
    private toolbar: Toolbar;
    private canvas: HTMLCanvasElement;
    private editor: HTMLElement;
    private fragment: DocumentFragment;
    private DEF_EDITOR_ID: string = "tt-image-editor";
    private DEF_CANVAS_HEIGHT: number = 100;
    private DEF_CANVAS_WIDTH: number = 100;

    // TODO init returning doc frag seems unintuitive
    init(): DocumentFragment {
        this.toolbar = new Toolbar();
        this.render();
        this.addListeners();

        return this.fragment;
    }

    private render() {
        this.fragment = document.createDocumentFragment();
        this.editor = document.createElement("div");
        this.editor.id = this.DEF_EDITOR_ID;
        const html: string =
            `<canvas
                id="tt-image-editor-canvas"
                height="${this.DEF_CANVAS_HEIGHT}",
                width="${this.DEF_CANVAS_WIDTH}">
            </canvas>`;
        this.editor.innerHTML = html;
        // Initialize the UI controls
        this.editor.appendChild(this.toolbar.init());
        this.fragment.appendChild(this.editor);
        this.canvas = this.fragment.querySelector("#tt-image-editor-canvas") as HTMLCanvasElement;
    }

    private addListeners() {
        this.editor.addEventListener("paste", (evt) => this.handlePaste(evt as ClipboardEvent));
        this.toolbar.onCropToolActive.addListener( (evt) => this.handleCropToolActive(evt));
        this.toolbar.onPngSaved.addListener( (evt) => this.handlePngSaved(evt))
        this.toolbar.onJpegSaved.addListener( (evt) => this.handleJpegSaved(evt))
    }

    private handleCropToolActive(evt) {
        console.log(evt.data);
        this.canvas.style.cursor = "crosshair";
    }

    private handlePngSaved(evt) {
        console.log(evt.data);
    }

    private handleJpegSaved(evt) {
        console.log(evt.data);
    }

    private handlePaste(evt) {
        const items: DataTransferItemList = (evt.clipboardData || evt.originalEvent.clipboardData).items;
        Util.getDataUrl(items, (dataUrl) => this.handleDataUrlSuccess(dataUrl));
    }

    private handleDataUrlSuccess(dataUrl: string): void {
        const img = new Image();
        img.addEventListener("load", (evt) => {
            this.drawCanvas(img, img.naturalWidth, img.naturalHeight);
        });
        img.src = dataUrl;
    }

    private drawCanvas(img: HTMLImageElement, width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.canvas.getContext) {
            const ctx = this.canvas.getContext("2d");
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.drawImage(img, 0, 0);
        }
    }
}
