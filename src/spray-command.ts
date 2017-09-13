import { Command } from "./command";
import { SprayToolDrawing } from "./spray-tool";

export class SprayCommand extends Command {

    drawing: SprayToolDrawing;

    constructor(drawing: SprayToolDrawing) {
        super();
        this.drawing = drawing;
    }

    execute(): void { }
    unexecute(): void { }
}
