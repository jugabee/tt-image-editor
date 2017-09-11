import { Command } from "./command";
import { Rect } from "./util";
import { editor } from "./editor";

export class CropCommand extends Command {

    private crop: Rect = { x: 0, y: 0, w: 0, h: 0 };
    private undoCrop: Rect = { x: 0, y: 0, w: 0, h: 0 };

    constructor(crop: Rect, undoCrop: Rect) {
        super();
        this.crop = crop;
        this.undoCrop = undoCrop;
    }

    execute(): void {
        editor.setState({
            cropX: this.crop.x,
            cropY: this.crop.y,
            cropW: this.crop.w,
            cropH: this.crop.h
        });
    }

    unexecute(): void {
        editor.setState({
            cropX: this.undoCrop.x,
            cropY: this.undoCrop.y,
            cropW: this.undoCrop.w,
            cropH: this.undoCrop.h
        });
    }
}
