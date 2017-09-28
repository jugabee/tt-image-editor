import { editor } from "./editor";
import { Command } from "./command";
import { PencilCommand } from "./pencil-command";
import { SprayCommand } from "./spray-command";
import { CropCommand } from "./crop-command";
import { sprayTool, SprayToolDrawing } from "./spray-tool";
import { pencilTool, PencilToolDrawing } from "./pencil-tool";
import { Rect } from "./util";

export class UndoRedo {
    private undoCommands: Array<Command> = [];
    private redoCommands: Array<Command> = [];

    constructor() { }

    undo(): void {
        if (this.undoCommands.length !== 0) {
            let cmd: Command = this.undoCommands.pop();
            cmd.unexecute();
            this.drawFromHistory();
            this.redoCommands.push(cmd);
        }
    }

    redo(): void {
        if (this.redoCommands.length !== 0) {
            let cmd: Command = this.redoCommands.pop();
            this.undoCommands.push(cmd);
            cmd.execute();
            this.drawFromHistory();
         }
    }

    insertPencilCommand(drawing: PencilToolDrawing): void {
        let cmd = new PencilCommand(drawing);
        this.undoCommands.push(cmd);
        this.redoCommands = [];
    }

    insertSprayCommand(drawing: SprayToolDrawing): void {
        let cmd = new SprayCommand(drawing);
        this.undoCommands.push(cmd);
        this.redoCommands = [];
    }

    // TODO don't insert crop if there was no change in the rectangle
    insertCropCommand(crop: Rect, undoCrop: Rect): void {
        let cmd = new CropCommand(crop, undoCrop);
        this.undoCommands.push(cmd);
        this.redoCommands = [];
    }

    clear() {
        this.redoCommands = [];
        this.undoCommands = [];
    }

    private drawFromHistory() {
        editor.drawFromHistory();
        for (let cmd of this.undoCommands) {
            if (cmd instanceof PencilCommand) {
                pencilTool.drawFromHistory(cmd.drawing);
            } else if (cmd instanceof SprayCommand) {
                sprayTool.drawFromHistory(cmd.drawing);
            }
        }
    }
}

export let undoRedo = new UndoRedo();
