import { Command } from "./command";

export class DrawingCommand extends Command {

    img: HTMLImageElement;
    composite: string = "source-over";

    constructor(composite: string, img: HTMLImageElement) {
        super();
        this.composite = composite;
        this.img = img;
    }

    execute(): void { }
    unexecute(): void { }
}
