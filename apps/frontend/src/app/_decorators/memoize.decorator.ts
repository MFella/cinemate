const cacheMap = new Map<string, any>();

export function Memoize() {
  return function (
    _target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      const cacheKey = `${propertyKey.toString()}:${JSON.stringify(args)}`;
      if (cacheMap.has(cacheKey)) {
        return cacheMap.get(cacheKey);
      }
      const result = originalMethod.apply(this, args);
      cacheMap.set(cacheKey, result);
      return result;
    };
  };
}
