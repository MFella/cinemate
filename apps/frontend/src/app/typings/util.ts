export class TypeUtil {
    static isNumber(arg: any): arg is number {
        return (typeof arg === 'number' || typeof parseInt(arg) === 'number') && !isNaN(arg)
            && typeof arg !== 'boolean'
            && typeof arg !== 'undefined'
            && arg !== null;
    }

    static isStringedNumber(arg: any): arg is string {
        return typeof arg === 'string' && typeof parseInt(arg) === 'number';
    }

    static isString(arg: any): arg is string {
        return typeof arg === 'string';
    }
}