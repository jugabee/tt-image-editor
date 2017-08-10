export interface Point {
    x: number,
    y: number
};

export function dist(p1: Point, p2: Point) {
    return Math.sqrt(
        (p2.x - p1.x) * (p2.x - p1.x) +
        (p2.y - p1.y) * (p2.y - p1.y)
    );
}

export function getMousePosition(canvas, evt): Point {
    let rect = canvas.getBoundingClientRect();
    let x = evt.clientX - rect.left;
    let y = evt.clientY - rect.top;

    // adjust for any scaling of the canvas element done by css
    let sx = canvas.width / rect.width;
    let sy = canvas.height / rect.height;

    return { x: Math.round(x * sx), y: Math.round(y * sy) };
}

export function centerImageOnCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement): Point {
    return { x: (canvas.width / 2) - (img.naturalWidth / 2), y: (canvas.height / 2)  - (img.naturalHeight / 2) };
}
