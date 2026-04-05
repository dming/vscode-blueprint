// Auto-generated from res/y.blueprint.js

export class BPString {
    public static concat(a: unknown, ...strs: unknown[]): string {
        return String(a) + strs.map(String).join("");
    }

    public static split(str: string, separator: string | RegExp): string[] {
        return str.split(separator);
    }

    public static toUpperCase(str: string): string {
        return str.toUpperCase();
    }

    public static toLowerCase(str: string): string {
        return str.toLowerCase();
    }

    public static trim(str: string): string {
        return str.trim();
    }

    public static trimStart(str: string): string {
        return str.trimStart();
    }

    public static trimEnd(str: string): string {
        return str.trimEnd();
    }

    public static includes(str: string, searchString: string, position?: number): boolean {
        return str.includes(searchString, position);
    }

    public static startsWith(str: string, searchString: string): boolean {
        return str.startsWith(searchString);
    }

    public static endsWith(str: string, searchString: string): boolean {
        return str.endsWith(searchString);
    }

    public static replace(str: string, searchValue: string | RegExp, newValue: string): string {
        return str.replace(searchValue, newValue);
    }

    public static indexOf(str: string, searchValue: string, position?: number): number {
        return str.indexOf(searchValue, position);
    }

    public static lastIndexOf(str: string, searchValue: string, position?: number): number {
        return str.lastIndexOf(searchValue, position);
    }

    public static repeat(str: string, count: number): string {
        return str.repeat(count);
    }

    public static charAt(str: string, index: number): string {
        return str.charAt(index);
    }

    public static charCodeAt(str: string, index: number): number {
        return str.charCodeAt(index);
    }

    public static substring(str: string, start: number, end?: number): string {
        return str.substring(start, end);
    }

    public static slice(str: string, start: number, end?: number): string {
        return str.slice(start, end);
    }

    public static getLength(str: string): number {
        return str.length;
    }

    public static parseInt(str: string, radix?: number): number {
        return parseInt(str, radix);
    }

    public static parseFloat(str: string): number {
        return parseFloat(str);
    }
}
