const DEF_SCALE_STEP = 1.1;

export enum Direction {
    HORIZONTAL,
    VERTICAL
}

export interface Point {
    x: number,
    y: number
};

export interface Rect {
    x: number,
    y: number,
    w: number,
    h: number
};

export interface RectChange {
    dx: number,
    dy: number,
    dw: number,
    dh: number
};

export interface RectOverlap {
    t: boolean,
    l: boolean,
    r: boolean,
    b: boolean
};

// determine current scale factor by integer increment
export function getCurrentScale(inc: number): number {
    let scale = 1;
    if (inc < 0) {
        for (let i = 0; i < Math.abs(inc); i++) {
            scale *= 1 / DEF_SCALE_STEP;
        }
    } else if (inc > 0) {
        for (let i = 0; i < Math.abs(inc); i++) {
            scale *= DEF_SCALE_STEP;
        }
    }
    return scale;
}

export function clearCanvasOutsideRect(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    let r: Rect = this.getImageRect();
    ctx.clearRect(0, 0, canvas.width, r.y);
    ctx.clearRect(0, r.y, r.x, Math.abs(r.y) + r.h);
    ctx.clearRect(r.x + r.w, r.y, canvas.width - (r.x + r.w), Math.abs(r.y) + r.h);
    ctx.clearRect(0, r.y + r.h, canvas.width, canvas.height - (r.y + r.h));
}

export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

export function dist(p1: Point, p2: Point) {
    return Math.sqrt(
        (p2.x - p1.x) * (p2.x - p1.x) +
        (p2.y - p1.y) * (p2.y - p1.y)
    );
}

export function getMousePosition(rect: Rect, evt): Point {
    let x = evt.clientX - rect.x;
    let y = evt.clientY - rect.y;
    return { x: x, y: y };
}

export function centerImageOnCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement): Point {
    return { x: (canvas.width / 2) - (img.naturalWidth / 2), y: (canvas.height / 2)  - (img.naturalHeight / 2) };
}

// test if rect r1 contains rect r2
export function contains(r1: Rect, r2: Rect): boolean {
    if (
        (r2.x + r2.w) <= (r1.x + r1.w)
        && r2.w > 0
        && r2.h > 0
        && r2.x >= r1.x
        && r2.y >= r1.y
        && (r2.y + r2.h) <= (r1.y + r1.h)
    ) {
        return true;
    } else {
        return false;
    }
}

// Returns the sides of r2 that overlap r1
export function getRectOverlap(r1: Rect, r2: Rect): RectOverlap {
    let overlap: RectOverlap = { l: false, t: false, r: false, b: false };
    if ((r2.x + r2.w) > (r1.x + r1.w) || r2.w < 0) {
        overlap.r = true;
    }
    if ((r2.y + r2.h) > (r1.y + r1.h) || r2.h < 0) {
        overlap.b = true;
    }
    if (r2.x < r1.x || r2.w < 0) {
        overlap.l = true;
    }
    if (r2.y < r1.y || r2.h < 0) {
        overlap.t = true;
    }

    return overlap;
}
