// Auto-generated from res/y.blueprint.js

export class BPMathLib {
    public static add(a, b) {
        return a + b;
    }

    public static subtract(a, b) {
        return a - b;
    }

    public static multiply(a, b) {
        return a * b;
    }

    public static divide(a, b) {
        if (b === 0) {
            throw new Error("不允许除以0。");
        }
        return a / b;
    }

    public static power(base, exponent) {
        return Math.pow(base, exponent);
    }

    public static sqrt(value) {
        if (value < 0) {
            throw new Error("无法计算负数的平方根。");
        }
        return Math.sqrt(value);
    }

    public static abs(value) {
        return Math.abs(value);
    }

    public static sin(angle) {
        return Math.sin(angle);
    }

    public static cos(angle) {
        return Math.cos(angle);
    }

    public static tan(angle) {
        return Math.tan(angle);
    }

    public static asin(value) {
        return Math.asin(value);
    }

    public static acos(value) {
        return Math.acos(value);
    }

    public static atan(value) {
        return Math.atan(value);
    }

    public static atan2(y, x) {
        return Math.atan2(y, x);
    }

    public static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public static round(value, decimals) {
        if (decimals > 0) {
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        } else return Math.round(value);
    }

    public static floor(value) {
        return Math.floor(value);
    }

    public static ceil(value) {
        return Math.ceil(value);
    }

    public static mod(dividend, divisor) {
        return dividend % divisor;
    }

    public static min(a, b) {
        return Math.min(a, b);
    }

    public static max(a, b) {
        return Math.max(a, b);
    }

    public static random(min, max) {
        min = min !== null && min !== void 0 ? min : 0;
        max = max !== null && max !== void 0 ? max : 1;
        return min + Math.random() * (max - min);
    }

    public static greater(a, b) {
        return a > b;
    }

    public static less(a, b) {
        return a < b;
    }

    public static equal(a, b) {
        return a === b;
    }

    public static greaterEqual(a, b) {
        return a >= b;
    }

    public static lessEqual(a, b) {
        return a <= b;
    }

    public static bitAnd(a, b) {
        return a & b;
    }

    public static bitOr(a, b) {
        return a | b;
    }

    public static bitXor(a, b) {
        return a ^ b;
    }

    public static bitNot(a) {
        return ~a;
    }

    public static bitAndNot(a, b) {
        return a & ~b;
    }

    public static bitLeftShift(a, b) {
        return a << b;
    }

    public static bitRightShift(a, b) {
        return a >> b;
    }

    public static bitUnsignedRightShift(a, b) {
        return a >>> b;
    }
}
