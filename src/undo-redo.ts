import { Command } from "./command";
import { DrawingCommand } from "./drawing-command";
import { CropCommand } from "./crop-command";
import { Rect } from "./util";

export class UndoRedo {
    private ctx: CanvasRenderingContext2D; // memoryCtx
    private img: HTMLImageElement // source image
    private undoCommands: Array<Command> = [];
    private redoCommands: Array<Command> = [];
    private currentUndoIndex: number = -1;

    constructor(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
        this.ctx = ctx;
        this.img = img;
    }

    undo(): void {
        if (this.undoCommands.length !== 0) {
            let cmd: Command = this.undoCommands.pop();
            this.currentUndoIndex -= 1;
            cmd.unexecute();
            this.redrawFromHistory();
            this.redoCommands.push(cmd);
        }
    }

    redo(): void {
        if (this.redoCommands.length !== 0) {
            let cmd: Command = this.redoCommands.pop();
            this.currentUndoIndex += 1;
            this.undoCommands.push(cmd);
            cmd.execute();
            this.redrawFromHistory();
         }
    }

    insertDrawingCommand(composite: string, img: HTMLImageElement): void {
        let cmd = new DrawingCommand(composite, img);
        this.undoCommands.push(cmd);
        this.currentUndoIndex += 1;
        this.redoCommands = [];
    }

    insertCropCommand(crop: Rect, undoCrop: Rect): void {
        let cmd = new CropCommand(crop, undoCrop);
        this.undoCommands.push(cmd);
        this.currentUndoIndex += 1;
        this.redoCommands = [];
    }

    private redrawFromHistory() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(
            this.img, 0, 0
        );
        for (let cmd of this.undoCommands) {
            if (cmd instanceof DrawingCommand) {
                this.ctx.globalCompositeOperation = cmd.composite;
                this.ctx.drawImage(cmd.img, 0, 0);
            }
        }
    }
}
