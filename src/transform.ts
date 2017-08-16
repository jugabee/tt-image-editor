import * as Util from "./util";
export class Transform {
    private ctx: CanvasRenderingContext2D;
    // a (m11) Horizontal scaling
    // b (m12) Horizontal skewing
    // c (m21) Vertical skewing
    // d (m22) Vertical scaling
    // e (dx) Horizontal moving
    // f (dy) Vertical moving
    // m = [a, b, c, d, e, f]
    m: Array<number> = [1,0,0,1,0,0];
    im: Array<number> = [1,0,0,1,0,0];

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    translate(x, y): void {
        this.m[4] += this.m[0] * x + this.m[2] * y;
        this.m[5] += this.m[1] * x + this.m[3] * y;
    }

    scale(sx, sy): void {
        this.m[0] *= sx;
        this.m[1] *= sx;
        this.m[2] *= sy;
        this.m[3] *= sy;
    }

    inverse(): void {
        let d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
        let m0 = this.m[3] * d;
        let m1 = -this.m[1] * d;
        let m2 = -this.m[2] * d;
        let m3 = this.m[0] * d;
        let m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
        let m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
        this.im[0] = m0;
        this.im[1] = m1;
        this.im[2] = m2;
        this.im[3] = m3;
        this.im[4] = m4;
        this.im[5] = m5;
    };

    multiply(matrix): void {
        var m11 = this.m[0] * matrix[0] + this.m[2] * matrix[1];
        var m12 = this.m[1] * matrix[0] + this.m[3] * matrix[1];

        var m21 = this.m[0] * matrix[2] + this.m[2] * matrix[3];
        var m22 = this.m[1] * matrix[2] + this.m[3] * matrix[3];

        var dx = this.m[0] * matrix[4] + this.m[2] * matrix[5] + this.m[4];
        var dy = this.m[1] * matrix[4] + this.m[3] * matrix[5] + this.m[5];

        this.m[0] = m11;
        this.m[1] = m12;
        this.m[2] = m21;
        this.m[3] = m22;
        this.m[4] = dx;
        this.m[5] = dy;
    };

    setTransform(ctx: CanvasRenderingContext2D): void {
        ctx.setTransform(
            this.m[0],
            this.m[1],
            this.m[2],
            this.m[3],
            this.m[4],
            this.m[5]
        );
    }

    getMatrix(): Array<number> {
        return this.m;
    }

    getScale(): Util.Point {
        return { x: this.m[0], y: this.m[3] };
    }

    // screen to world coordinates
    getWorld(x, y): Util.Point {
        this.inverse();
        // remove translation
        let wX = x - this.m[4];
        let wY = y - this.m[5];
        // multiply by inverse
        return {
            x:   wX * this.im[0] + wY * this.im[2],
            y:   wX * this.im[1] + wY * this.im[3]
        }
    }

    // convert world to screen coordinates
    getScreen(x, y): Util.Point {
        let sX =  x * this.m[0] + y * this.m[2] + this.m[4];
        let sY = x * this.m[1] + y * this.m[3] + this.m[5];
        return { x: sX, y: sY }
    }
}
