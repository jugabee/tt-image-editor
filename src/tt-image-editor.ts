import * as Util from "./util";
import { Toolbar } from "./toolbar";

export class TTImageEditor {
    private toolbar: Toolbar;
    private canvas: HTMLCanvasElement;
    private container: HTMLElement;
    private DEF_CANVAS_HEIGHT: number = 100;
    private DEF_CANVAS_WIDTH: number = 100;

    init(): void {
        this.container = document.getElementById("editor-container");
        this.render();
        this.bindEvents();
        // Initialize the UI controls
        this.toolbar = new Toolbar();
        this.toolbar.init();
    }

    private render() {
        const element: HTMLElement = document.createElement("div");
        const html: string = `<canvas id="editor" height="${this.DEF_CANVAS_HEIGHT}", width="${this.DEF_CANVAS_WIDTH}"></canvas>`;
        element.innerHTML = html;
        this.container.appendChild(element);
        this.canvas = document.getElementById("editor") as HTMLCanvasElement;
    }

    private bindEvents() {
        this.container.addEventListener("paste", (evt) => this.handlePaste(evt as ClipboardEvent));
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
