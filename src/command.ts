export abstract class Command {
    abstract execute(): void;
    abstract unexecute(): void;
}
