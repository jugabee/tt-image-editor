import * as util from "./util";

interface Sections {
    [section: string] : Array<any>
}

export class KeyMap {

    private readonly SHIFT = 1;
    private readonly CTRL = 2;
    private readonly ALT = 4;
    private readonly META = 8;
    private map: any = {};

    private BASE_MAP = {
        wheelZoomModifier: {
            section: ["navigation"],
            desc: "Zoom in or out",
            template: "%m + mouse wheel",
            mod: this.META
        },
        dragToPanModifier: {
            section: ["navigation"],
            desc: "Pan the view",
            template: "%m + click & drag",
            mod: this.META
        },
        colorSampleModifier: {
            section: ["toolbar"],
            desc: "Sample a color",
            template: "%m + click & drag",
            mod: this.ALT
        },
        colorPickerTool: {
            section: ["toolbar"],
            desc: "Select color picker tool",
            keys: [[79 /*o*/]]
        },
        cropTool: {
            section: ["toolbar"],
            desc: "Select crop tool",
            keys: [[67 /*c*/]]
        },
        cropApplyTool: {
            section: ["toolbar"],
            desc: "Apply current crop rectangle",
            keys: [[65 /*a*/]]
        },
        pencilTool: {
            section: ["toolbar"],
            desc: "Select pencil tool",
            keys: [[80 /*p*/]]
        },
        pencilEraserTool: {
            section: ["toolbar"],
            desc: "Turn on pencil eraser mode if pencil is selected",
            keys: [[88 /*x*/]]
        },
        sprayTool: {
            section: ["toolbar"],
            desc: "Select spray tool",
            keys: [[83 /*s*/]]
        },
        sprayEraserTool: {
            section: ["toolbar"],
            desc: "Turn on spray eraser mode if spray is selected",
            keys: [[88 /*x*/]]
        },
        undo: {
            section: ["editing"],
            desc: "Undo",
            keys: [[90/*z*/, this.META]]
        },
        redo: {
            section: ["editing"],
            desc: "Redo",
            keys: [[90/*z*/, this.META | this.SHIFT]]
        },
        save: {
            section: ["toolbar"],
            desc: "Download the current image",
            keys: [[83/*s*/, this.META]]
        },
        load: {
            section: ["toolbar"],
            desc: "Load a new image",
            keys: [[76/*l*/, this.META]]
        },
        help: {
            section: ["misc"],
            desc: "Show this help modal",
            shortcutString: "?",
            keys: [[191 /*c*/, this.SHIFT]]
        },
    };

    private WIN_MAP = {
        wheelZoomModifier: {
            section: ["navigation"],
            desc: "Zoom in or out",
            template: "%m + mouse wheel",
            mod: this.SHIFT
        },
        dragToPanModifier: {
            section: ["navigation"],
            desc: "Pan the view",
            template: "%m + click & drag",
            mod: this.SHIFT
        },
        undo: {
            section: ["editing"],
            desc: "Undo",
            keys: [[90/*z*/, this.CTRL]]
        },
        redo: {
            section: ["editing"],
            desc: "Redo",
            keys: [[90/*z*/, this.CTRL | this.SHIFT]]
        },
        save: {
            section: ["toolbar"],
            desc: "Download the current image",
            keys: [[83/*s*/, this.ALT]]
        },
        load: {
            section: ["toolbar"],
            desc: "Load a new image",
            keys: [[76/*l*/, this.ALT]]
        }
    };

    constructor () {
        let isWin = this.isWinPlatform();
        this.map = isWin ? Object.assign(this.BASE_MAP, this.WIN_MAP) : this.BASE_MAP;
    }

    isMacPlatform(): boolean {
        return navigator.platform.indexOf("Mac") > -1;
    }

    isWinPlatform(): boolean {
        return navigator.platform.indexOf("Win") > -1;
    }

    isIOSPlatform(): boolean {
        return navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) ? true : false;
    }

    private eventMods(evt): number {
        let result = 0;
        if (evt.shiftKey) result |= this.SHIFT;
        if (evt.altKey) result |= this.ALT;
        if (evt.ctrlKey) result |= this.CTRL;
        if (evt.metaKey) result |= this.META;
        return result;
    }

    private keyEquals(evt, entry): boolean {
        let key = entry.keys;
        for (let i = 0; i < key.length; i++) {
            let info = key[i];
            if (evt.which != info[0]) continue;
            let mods = info.length > 1 ? info[1] : 0;
            if (this.eventMods(evt) != mods) continue;
            return true;
        }
        return false;
    }

    isPan(evt): boolean {
        return this.eventMods(evt) == this.map.dragToPanModifier.mod;
    }

    isWheelZoom(evt): boolean {
        return this.eventMods(evt) == this.map.wheelZoomModifier.mod;
    }

    isColorSample(evt): boolean {
        return this.eventMods(evt) == this.map.colorSampleModifier.mod;
    }

    isColorPickerTool(evt): boolean {
        let entry = this.map.colorPickerTool;
        return this.keyEquals(evt, entry);
    }

    isCropTool(evt): boolean {
        let entry = this.map.cropTool;
        return this.keyEquals(evt, entry);
    }

    isCropApplyTool(evt): boolean {
        let entry = this.map.cropApplyTool;
        return this.keyEquals(evt, entry);
    }

    isPencilTool(evt): boolean {
        let entry = this.map.pencilTool;
        return this.keyEquals(evt, entry);
    }

    isPencilEraserTool(evt): boolean {
        let entry = this.map.pencilEraserTool;
        return this.keyEquals(evt, entry);
    }

    isSprayTool(evt): boolean {
        let entry = this.map.sprayTool;
        return this.keyEquals(evt, entry);
    }

    isSprayEraserTool(evt): boolean {
        let entry = this.map.sprayEraserTool;
        return this.keyEquals(evt, entry);
    }

    isUndo(evt): boolean {
        let entry = this.map.undo;
        return this.keyEquals(evt, entry);
    }

    isRedo(evt): boolean {
        let entry = this.map.redo;
        return this.keyEquals(evt, entry);
    }

    isSave(evt): boolean {
        let entry = this.map.save;
        return this.keyEquals(evt, entry);
    }

    isLoad(evt): boolean {
        let entry = this.map.load;
        return this.keyEquals(evt, entry);
    }

    isHelp(evt): boolean {
        let entry = this.map.help;
        return this.keyEquals(evt, entry);
    }

    private modifierString(mods) {
        var all = [];
        if ((mods & this.SHIFT) > 0) all.push("Shift");
        if ((mods & this.CTRL) > 0) all.push("Ctrl");
        if ((mods & this.ALT) > 0) all.push("Alt");
        if ((mods & this.META) > 0) {
            if (this.isMacPlatform()) all.push("⌘");
            else all.push("META");
        }
        return all.join(" + ");
    }

    private keyString(keyCode) {
        switch (keyCode) {
        case 37: return "←";
        case 38: return "↑";
        case 39: return "→";
        case 40: return "↓";
        case 8: return "Backspace";
        case 46: return "Delete";
        }
        return String.fromCharCode(keyCode).toLowerCase();
    }

    prettyShortcut(entry) {
        if (entry.shortcutString) {
            return entry.shortcutString;
        } else if (entry.keys) {
            var result = "";
            for (var i = 0; i < entry.keys.length; i++) {
                if (i > 0) result += " or ";
                var alternative = entry.keys[i];
                var desc = this.keyString(alternative[0]);
                if (alternative.length > 1) {
                    desc = this.modifierString(alternative[1]) + " + " + desc;
                }
                result += desc;
            }
            return result;
        } else if (entry.mod) {
            return entry.template.replace("%m", this.modifierString(entry.mod));
        } else if (entry.template) {
            return entry.template;
        }
        return "ERROR";
    }

    private getHelpBySection(): Sections {
        let sections: Sections = {};
        for (let entry in this.map) {
            let section = this.map[entry].section;
            if (!(section)) {
                throw "KeyMap entry has no property.";
            } else {
                if (!(section in sections)) {
                    sections[section] = [entry];
                } else {
                    sections[section].push(entry);
                }
            }
        }
        return sections;
    }

    getFormattedHelp(): string {
        let sections: Sections = this.getHelpBySection();
        let html: string = "";
        for (let section in sections) {
            html += `<div class="help-section">
                            <div class="help-header">${util.convertCase(section)}</div>`;
            for (let entry of sections[section]) {
                html += `<div class="help-row">
                                <div class="help-desc">
                                    ${this.map[entry].desc}
                                </div>
                                <div class="help-shortcut">
                                    ${this.prettyShortcut(this.map[entry])}
                                </div>
                            </div>`;
            }
            html += `</div>`;
        }
        return html;
    }
}

export let keyMap = new KeyMap();
