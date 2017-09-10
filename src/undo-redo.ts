import { PencilCommand } from "./pencil-command";

export class UndoRedo {
    private ctx: CanvasRenderingContext2D; // memoryCtx
    private img: HTMLImageElement // source image
    private undoCommands: Array<PencilCommand> = [];
    private redoCommands: Array<PencilCommand> = [];

    constructor(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
        this.ctx = ctx;
        this.img = img;
    }

    undo(): void {
        if (this.undoCommands.length !== 0) {
            let cmd: PencilCommand = this.undoCommands.pop();
            this.redrawFromHistory();
            this.redoCommands.push(cmd);
            console.log(this.redoCommands)
        }
    }

    redo(): void {
        if (this.redoCommands.length !== 0) {
            let cmd: PencilCommand = this.redoCommands.pop();
            this.undoCommands.push(cmd);
            this.redrawFromHistory();
         }
    }

    insertPencilCommand(composite: string, img: HTMLImageElement): void {
        let cmd = new PencilCommand(composite, img);
        this.undoCommands.push(cmd);
        this.redoCommands = [];
    }

    private redrawFromHistory() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(
            this.img, 0, 0
        );
        for (let cmd of this.undoCommands) {
            this.ctx.globalCompositeOperation = cmd.composite;
            this.ctx.drawImage(cmd.img, 0, 0);
        }
    }
}
