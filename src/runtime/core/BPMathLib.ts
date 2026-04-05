// Auto-generated from res/y.blueprint.js

export class BPMathLib {
    public static add(a: number, b: number): number {
        return a + b;
    }

    public static subtract(a: number, b: number): number {
        return a - b;
    }

    public static multiply(a: number, b: number): number {
        return a * b;
    }

    public static divide(a: number, b: number): number {
        if (b === 0) {
            throw new Error("不允许除以0。");
        }
        return a / b;
    }

    public static power(base: number, exponent: number): number {
        return Math.pow(base, exponent);
    }

    public static sqrt(value: number): number {
        if (value < 0) {
            throw new Error("无法计算负数的平方根。");
        }
        return Math.sqrt(value);
    }

    public static abs(value: number): number {
        return Math.abs(value);
    }

    public static sin(angle: number): number {
        return Math.sin(angle);
    }

    public static cos(angle: number): number {
        return Math.cos(angle);
    }

    public static tan(angle: number): number {
        return Math.tan(angle);
    }

    public static asin(value: number): number {
        return Math.asin(value);
    }

    public static acos(value: number): number {
        return Math.acos(value);
    }

    public static atan(value: number): number {
        return Math.atan(value);
    }

    public static atan2(y: number, x: number): number {
        return Math.atan2(y, x);
    }

    public static distance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public static round(value: number, decimals: number): number {
        if (decimals > 0) {
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        } else return Math.round(value);
    }

    public static floor(value: number): number {
        return Math.floor(value);
    }

    public static ceil(value: number): number {
        return Math.ceil(value);
    }

    public static mod(dividend: number, divisor: number): number {
        return dividend % divisor;
    }

    public static min(a: number, b: number): number {
        return Math.min(a, b);
    }

    public static max(a: number, b: number): number {
        return Math.max(a, b);
    }

    public static random(min: number | null | undefined, max: number | null | undefined): number {
        const lo = min !== null && min !== void 0 ? min : 0;
        const hi = max !== null && max !== void 0 ? max : 1;
        return lo + Math.random() * (hi - lo);
    }

    public static greater(a: number, b: number): boolean {
        return a > b;
    }

    public static less(a: number, b: number): boolean {
        return a < b;
    }

    public static equal(a: number, b: number): boolean {
        return a === b;
    }

    public static greaterEqual(a: number, b: number): boolean {
        return a >= b;
    }

    public static lessEqual(a: number, b: number): boolean {
        return a <= b;
    }

    public static bitAnd(a: number, b: number): number {
        return a & b;
    }

    public static bitOr(a: number, b: number): number {
        return a | b;
    }

    public static bitXor(a: number, b: number): number {
        return a ^ b;
    }

    public static bitNot(a: number): number {
        return ~a;
    }

    public static bitAndNot(a: number, b: number): number {
        return a & ~b;
    }

    public static bitLeftShift(a: number, b: number): number {
        return a << b;
    }

    public static bitRightShift(a: number, b: number): number {
        return a >> b;
    }

    public static bitUnsignedRightShift(a: number, b: number): number {
        return a >>> b;
    }
}
