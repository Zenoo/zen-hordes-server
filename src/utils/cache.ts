import NodeCache from 'node-cache';
import type { TownResponseType } from '../routes/town.route.js';
import type { MapsResponseType } from '../routes/maps.route.js';

// Cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export function getCached(key: `town:${number}`): TownResponseType | undefined;
export function getCached(key: `town-map:${number}`): MapsResponseType['towns'][number] | undefined;
export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCached(key: `town:${number}`, value: TownResponseType): void;
export function setCached(key: `town-map:${number}`, value: MapsResponseType['towns'][number]): void;
export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}

export const deleteCached = (key: string): void => {
  cache.del(key);
};

export const flushCache = (): void => {
  cache.flushAll();
};
