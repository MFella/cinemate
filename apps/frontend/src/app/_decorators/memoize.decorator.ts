const cacheMap = new Map<string, any>(); 

export function Memoize() {
    return function (
        target: Object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
         const cacheKey = `${propertyKey.toString()}:${JSON.stringify(args)}`;
        if (cacheMap.has(cacheKey)) {
         return cacheMap.get(cacheKey);
         }
        const result = originalMethod.apply(this, args);
         cacheMap.set(cacheKey, result);
        return result;
    }
    }
}