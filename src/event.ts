export interface Event<T> {
    data: T
}

export type Handler<T> = (evt: Event<T>) => void

export class Dispatcher<T> {

    events: Array<Handler<T>> = [];

    constructor() {}

    static createEventDispatcher<T>() {
        return new Dispatcher<T>();
    }

    addListener(fn: Handler<T>) {
        this.events.push(fn);
    }

    removeListener(fn: Handler<T>) {
        var i = this.events.indexOf(fn);
        if (i > -1) this.events.splice(i, 1);
    }

    removeAllListeners() {
        this.events.splice(0, this.events.length);
    }

    emit(evt: Event<T>) {
        if (this.events.length > 0) {
            this.events.forEach((fn) => {
                fn(evt);
            });
        }
    }
}
