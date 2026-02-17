import { BankItemCreateManyInput, ZoneItemCreateManyInput } from '../generated/prisma/models.js';
import { JSONGameObject } from './api/mh-api.js';

export const getBankItems = (data: JSONGameObject): BankItemCreateManyInput[] => {
  if (!data.city?.bank?.length) {
    return [];
  }

  // Group items by id and broken status to avoid unique constraint violations (ex: poisoned items)
  const groupedItems = new Map<string, BankItemCreateManyInput>();

  for (const item of data.city.bank) {
    const key = `${item.id ?? 0}-${item.broken ?? false}`;
    const existing = groupedItems.get(key);

    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + (item.count ?? 1);
    } else {
      groupedItems.set(key, {
        townId: data.id ?? 0,
        id: item.id ?? 0,
        quantity: item.count ?? 1,
        broken: item.broken ?? false,
      });
    }
  }

  return Array.from(groupedItems.values());
};

export const getZoneItems = (data: JSONGameObject): ZoneItemCreateManyInput[] => {
  if (!data.zones?.length) {
    return [];
  }

  // Group items by id and broken status to avoid unique constraint violations (ex: poisoned items)
  const groupedItems = new Map<string, ZoneItemCreateManyInput>();

  for (const z of data.zones) {
    if (!z.items) continue;

    for (const item of z.items) {
      const x = (z.x ?? 0) - (data.city?.x ?? 0);
      const y = -(z.y ?? 0) + (data.city?.y ?? 0);
      const key = `${x}-${y}-${item.id ?? 0}-${item.broken ?? false}`;
      const existing = groupedItems.get(key);

      if (existing) {
        existing.quantity = (existing.quantity ?? 0) + (item.count ?? 1);
      } else {
        groupedItems.set(key, {
          townId: data.id ?? 0,
          x,
          y,
          id: item.id ?? 0,
          quantity: item.count ?? 1,
          broken: item.broken ?? false,
        });
      }
    }
  }

  return Array.from(groupedItems.values());
};
