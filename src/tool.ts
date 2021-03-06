export abstract class Tool {
    constructor() { }
    abstract handleMouseup(evt): void;
    abstract handleMousedown(evt): void;
    abstract handleMousemove(evt): void;
    abstract init(): void;
    abstract draw(): void;
}
