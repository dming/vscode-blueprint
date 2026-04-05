// Auto-generated from res/y.blueprint.js

export class BPString {
    public static concat(a, ...strs) {
        return a + strs.join("");
    }

    public static split(str, separator) {
        return str.split(separator);
    }

    public static toUpperCase(str) {
        return str.toUpperCase();
    }

    public static toLowerCase(str) {
        return str.toLowerCase();
    }

    public static trim(str) {
        return str.trim();
    }

    public static trimStart(str) {
        return str.trimStart();
    }

    public static trimEnd(str) {
        return str.trimEnd();
    }

    public static includes(str, searchString, position) {
        return str.includes(searchString, position);
    }

    public static startsWith(str, searchString) {
        return str.startsWith(searchString);
    }

    public static endsWith(str, searchString) {
        return str.endsWith(searchString);
    }

    public static replace(str, searchValue, newValue) {
        return str.replace(searchValue, newValue);
    }

    public static indexOf(str, searchValue, position) {
        return str.indexOf(searchValue, position);
    }

    public static lastIndexOf(str, searchValue, position) {
        return str.lastIndexOf(searchValue, position);
    }

    public static repeat(str, count) {
        return str.repeat(count);
    }

    public static charAt(str, index) {
        return str.charAt(index);
    }

    public static charCodeAt(str, index) {
        return str.charCodeAt(index);
    }

    public static substring(str, start, end) {
        return str.substring(start, end);
    }

    public static slice(str, start, end) {
        return str.slice(start, end);
    }

    public static getLength(str) {
        return str.length;
    }

    public static parseInt(str, radix) {
        return parseInt(str, radix);
    }

    public static parseFloat(str) {
        return parseFloat(str);
    }
}
