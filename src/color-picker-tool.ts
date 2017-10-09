import * as util from "./util";
import { Tool } from "./tool";
import * as events from "./event";

class ColorPickerTool extends Tool {
    private container: HTMLElement;
    private canvasSlider: HTMLCanvasElement;
    private canvasSliderCtx: CanvasRenderingContext2D;
    private canvasPicker: HTMLCanvasElement;
    private canvasPickerCtx: CanvasRenderingContext2D;
    private color: string = "rgba(255,0,0,1)";
    private mousedown: boolean = false;

    onColorPicked: events.Dispatcher<util.Color> = events.Dispatcher.createEventDispatcher();

    constructor() {
        super();
        this.container = document.createElement("div");
        this.container.id = "color-picker-container";
        this.canvasSlider = document.createElement("canvas");
        this.canvasSlider.id = "color-slider-canvas";
        this.canvasSlider.width = 224;
        this.canvasSlider.height = 30;
        this.canvasSliderCtx = this.canvasSlider.getContext("2d");
        this.canvasPicker = document.createElement("canvas");
        this.canvasPicker.id = "color-picker-canvas";
        this.canvasPickerCtx = this.canvasPicker.getContext("2d");
        this.canvasPicker.width = 224;
        this.canvasPicker.height = 224;
        this.container.appendChild(this.canvasSlider);
        this.container.appendChild(this.canvasPicker);

        this.drawSliderGradient();
        this.drawPickerGradient();
        this.addEvents();
    }

    private addEvents(): void {
        this.canvasSlider.addEventListener("mousedown", (evt) => {
            this.mousedown = true;
        });

        this.canvasSlider.addEventListener("mouseup", (evt) => {
            this.mousedown = false;
            this.handleSliderMouseEvent(evt);
        });

        this.canvasSlider.addEventListener("mousemove", (evt) => {
            if (this.mousedown) {
                this.handleSliderMouseEvent(evt);
            }
        });

        this.canvasSlider.addEventListener("mouseleave", (evt) => {
            if (this.mousedown) {
                this.mousedown = false;
            }
        });

        this.canvasPicker.addEventListener("mousedown", (evt) => {
            this.mousedown = true;
        });

        this.canvasPicker.addEventListener("mouseup", (evt) => {
            this.mousedown = false;
            this.handlePickerMouseEvent(evt);
        });

        this.canvasPicker.addEventListener("mousemove", (evt) => {
            if (this.mousedown) {
                this.handlePickerMouseEvent(evt);
            }
        });

        this.canvasPicker.addEventListener("mouseleave", (evt) => {
            if (this.mousedown) {
                this.mousedown = false;
            }
        });
    }

    getColorPickerElement(): HTMLElement {
        return this.container;
    }

    private handleSliderMouseEvent(evt): void {
        let cr: ClientRect = this.canvasSlider.getBoundingClientRect();
        let r: util.Rect = { x: cr.left, y: cr.top, w: cr.width, h: cr.height };
        let mouse: util.Point = util.getMousePosition(r, evt);
        this.setColorAtSliderPoint(mouse);
        this.drawPickerGradient();
    }

    private handlePickerMouseEvent(evt): void {
        let cr: ClientRect = this.canvasPicker.getBoundingClientRect();
        let r: util.Rect = { x: cr.left, y: cr.top, w: cr.width, h: cr.height };
        let mouse: util.Point = util.getMousePosition(r, evt);
        let color = this.getColorAtPickerPoint(mouse);
    }

    private setColorAtSliderPoint(mouse: util.Point): void {
        let imageData = this.canvasSliderCtx.getImageData(mouse.x, mouse.y, 1, 1);
        let data = imageData.data;
        this.color = "rgb(" + data[0] + "," + data[1] + "," + data[2] + ")";
        let color = { r: data[0], g: data[1], b: data[2], a: 1 };
        this.onColorPicked.emit({ data: color });
    }

    private getColorAtPickerPoint(mouse: util.Point): void {
        let imageData = this.canvasPickerCtx.getImageData(mouse.x, mouse.y, 1, 1);
        let data = imageData.data;
        let color = { r: data[0], g: data[1], b: data[2], a: 1 };
        this.onColorPicked.emit({ data: color });
    }

    private drawSliderGradient(): void {
        let gradient = this.canvasSliderCtx.createLinearGradient(0, 0, this.canvasSlider.width, 0);
        gradient.addColorStop(0, "rgba(255, 0, 0, 1)");
        gradient.addColorStop(0.17, "rgba(255, 255, 0, 1)");
        gradient.addColorStop(0.34, "rgba(0, 255, 0, 1)");
        gradient.addColorStop(0.50, "rgba(0, 255, 255, 1)");
        gradient.addColorStop(0.67, "rgba(0, 0, 255, 1)");
        gradient.addColorStop(0.84, "rgba(255, 0, 255, 1)");
        gradient.addColorStop(1, "rgba(255, 0, 0, 1)");
        this.canvasSliderCtx.fillStyle = gradient;
        this.canvasSliderCtx.fillRect(0, 0, this.canvasSlider.width, this.canvasSlider.height);
    }

    private drawPickerGradient(): void {
        this.canvasPickerCtx.fillStyle = this.color;
        this.canvasPickerCtx.fillRect(0,0, this.canvasPicker.width, this.canvasPicker.height);
        let g1 = this.canvasPickerCtx.createLinearGradient(0,0,this.canvasPicker.width, 0);
        g1.addColorStop(0, "rgba(255,255,255,1)");
        g1.addColorStop(1, "rgba(255,255,255,0)");
        this.canvasPickerCtx.fillStyle = g1;
        this.canvasPickerCtx.fillRect(0,0,this.canvasPicker.width, this.canvasPicker.height);

        let g2 = this.canvasPickerCtx.createLinearGradient(0,0,0,this.canvasPicker.height);
        g2.addColorStop(0, "rgba(0,0,0,0)");
        g2.addColorStop(1, "rgba(0,0,0,1)");
        this.canvasPickerCtx.fillStyle = g2;
        this.canvasPickerCtx.fillRect(0,0,this.canvasPicker.width, this.canvasPicker.height);
    }

    handleMouseup(evt): void {}
    handleMousedown(evt): void {}
    handleMousemove(evt): void {}
    init(): void {}
    draw(): void {}
}

export let colorPickerTool = new ColorPickerTool();
