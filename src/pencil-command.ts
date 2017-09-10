export class PencilCommand {

    img: HTMLImageElement;
    composite: string = "source-over";

    constructor(composite: string, img: HTMLImageElement) {
        this.composite = composite;
        this.img = img;
    }
}
