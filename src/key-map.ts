class KeyMap {

    private readonly SHIFT = 1;
    private readonly CTRL = 2;
    private readonly ALT = 4;
    private readonly META = 8;
    private map: any;

    private BASE_MAP = {
        wheelZoomModifier: {
            mod: this.ALT
        },
        dragToPanModifier: {
            mod: this.ALT
        },
        colorSampleModifier: {
            mod: this.META
        },
        cropTool: {
            keys: [[67 /*c*/]]
        },
        cropApplyTool: {
            keys: [[13 /*enter*/]]
        },
        pencilTool: {
            keys: [[80 /*p*/]]
        },
        pencilEraserTool: {
            keys: [[88 /*x*/]]
        },
        sprayTool: {
            keys: [[83 /*s*/]]
        },
        sprayEraserTool: {
            keys: [[88 /*x*/]]
        },
        undo: {
            keys: [[90/*z*/, this.META]]
        },
        redo: {
            keys: [[90/*z*/, this.META | this.SHIFT]]
        },
        save: {
            keys: [[83/*s*/, this.META]]
        },
        load: {
            keys: [[76/*l*/, this.META]]
        }
    };

    private WIN_MAP = {
        colorSampleModifier: {
            mod: this.CTRL
        },
        undo: {
            keys: [[90/*z*/, this.CTRL]]
        },
        redo: {
            keys: [[90/*z*/, this.CTRL | this.SHIFT]]
        },
        save: {
            keys: [[83/*s*/, this.ALT]]
        },
        load: {
            keys: [[76/*l*/, this.ALT]]
        }
    };

    constructor () {
        let isWin = this.isWinPlatform();
        this.map = isWin ? Object.assign(this.BASE_MAP, this.WIN_MAP) : this.BASE_MAP;
    }

    isMacPlatform(): boolean {
        return navigator.platform.indexOf('Mac') > -1;
    }

    isWinPlatform(): boolean {
        return navigator.platform.indexOf('Win') > -1;
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
}

export let keyMap = new KeyMap();
