import { Command } from "./command";
import { PencilToolDrawing } from "./pencil-tool";

export class PencilCommand extends Command {

    drawing: PencilToolDrawing;

    constructor(drawing: PencilToolDrawing) {
        super();
        this.drawing = drawing;
    }

    execute(): void { }
    unexecute(): void { }
}
