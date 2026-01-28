import NodeCache from 'node-cache';

// Cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export const getCached = <T>(key: string): T | undefined => {
  return cache.get<T>(key);
};

export const setCached = <T>(key: string, value: T): void => {
  cache.set(key, value);
};

export const deleteCached = (key: string): void => {
  cache.del(key);
};

export const flushCache = (): void => {
  cache.flushAll();
};
