export class Toolbar {
    private canvas: HTMLCanvasElement;
    private container: HTMLElement;
    private savePngBtn: HTMLElement;
    private saveJpegBtn: HTMLElement;

    init(): void {
        this.container = document.getElementById("editor-container");
        this.canvas = document.getElementById("editor") as HTMLCanvasElement;
        this.render();
        this.savePngBtn = this.container.querySelector("#save-png-btn") as HTMLElement;
        this.saveJpegBtn = this.container.querySelector("#save-jpeg-btn") as HTMLElement;
        this.bindEvents();
    }

    private render(): void {
        const element: HTMLElement = document.createElement("div");
        element.innerHTML = `<button id="save-png-btn">Save png</button>
                             <button id="save-jpeg-btn">Save jpeg</button>`;
        this.container.insertBefore(element, this.container.firstChild);
    }

    private bindEvents(): void {
        this.savePngBtn.addEventListener("click", (evt) => this.handleSavePngBtn(evt));
        this.saveJpegBtn.addEventListener("click", (evt) => this.handleSaveJpegBtn(evt));
    }

    private handleSavePngBtn(evt): void {
        console.log(this.canvas.toDataURL());
    }

    private handleSaveJpegBtn(evt): void {
        console.log(this.canvas.toDataURL("image/jpeg", 1.0))
    }
}
