import { UpdateRequestType } from '../routes/update.route';
import { JSONGameObject } from './api/mh-api';
import { getCached, setCached } from './cache';

export const updateCacheAfterUserUpdate = (data: UpdateRequestType): void => {
  const { townId, x, y, buildingId, depleted, zombies, items } = data;

  let dangerLevel = 0;
  if (data.zombies > 5) {
    dangerLevel = 3;
  } else if (data.zombies > 2) {
    dangerLevel = 2;
  } else if (data.zombies > 0) {
    dangerLevel = 1;
  }

  // Update town cache
  const townCacheKey = `town:${townId}` as const;
  const townCached = getCached(townCacheKey);

  if (townCached?.town) {
    const zoneIndex = townCached.town.zones.findIndex((z) => z.x === x && z.y === y);

    const updatedZone = {
      x,
      y,
      visitedToday: true,
      dangerLevel,
      buildingId: buildingId ?? null,
      depleted,
      zombies,
      updatedAt: new Date().toISOString(),
      updatedById: data.userId,
      items,
    };

    if (zoneIndex !== -1) {
      townCached.town.zones[zoneIndex] = updatedZone;
    } else {
      townCached.town.zones.push(updatedZone);
    }

    setCached(townCacheKey, townCached);
  }

  // Update town-map cache
  const mapCacheKey = `town-map:${townId}` as const;
  const mapCached = getCached(mapCacheKey);

  if (mapCached) {
    const zoneIndex = mapCached.zones.findIndex((z) => z.x === x && z.y === y);

    const updatedMapZone = {
      x,
      y,
      visitedToday: true,
      dangerLevel,
      buildingId: buildingId ?? null,
    };

    if (zoneIndex !== -1) {
      mapCached.zones[zoneIndex] = updatedMapZone;
    } else {
      mapCached.zones.push(updatedMapZone);
    }

    setCached(mapCacheKey, mapCached);
  }
};

export const updateCacheAfterHourlyUpdate = (
  townId: number,
  data: JSONGameObject,
  citizensData: JSONGameObject
): void => {
  const townCacheKey = `town:${townId}` as const;
  const townCached = getCached(townCacheKey);

  if (townCached?.town) {
    if (data.city?.bank) {
      townCached.town.lastUpdate = new Date().toISOString();
      if (data.city.water !== undefined) townCached.town.waterInWell = data.city.water;
      if (data.city.chaos !== undefined) townCached.town.chaos = data.city.chaos;
      if (data.city.devast !== undefined) townCached.town.devastated = data.city.devast;
      if (data.city.door !== undefined) townCached.town.doorOpened = data.city.door;
      if (data.conspiracy !== undefined) townCached.town.insurrected = data.conspiracy;
      townCached.town.bank = data.city.bank.map((item) => ({
        id: item.id ?? 0,
        quantity: item.count ?? 1,
        broken: item.broken ?? false,
      }));
    }

    // Update zones
    if (data.zones?.length) {
      for (const _z of data.zones) {
        const z = _z as typeof _z & {
          nvt?: 1 | 0;
          danger?: number;
          details: [] | { dried?: boolean; z?: number };
          building?: { type: number };
        };

        const zoneIndex = townCached.town.zones.findIndex((zone) => zone.x === z.x && zone.y === z.y);
        const existingZone = zoneIndex !== -1 ? townCached.town.zones[zoneIndex] : null;

        if (!existingZone) {
          continue;
        }

        const updatedZone: (typeof townCached.town.zones)[number] = {
          x: existingZone.x,
          y: existingZone.y,
          visitedToday: typeof z.nvt === 'number' ? z.nvt === 0 : existingZone.visitedToday,
          dangerLevel: typeof z.danger === 'number' ? z.danger : existingZone.dangerLevel,
          buildingId: z.building?.type ?? existingZone.buildingId ?? null,
          depleted: 'dried' in z.details ? (z.details.dried ?? false) : existingZone.depleted,
          zombies: 'z' in z.details ? (z.details.z ?? 0) : existingZone.zombies,
          updatedAt: new Date().toISOString(),
          updatedById: existingZone.updatedById,
          items: existingZone.items,
        };

        townCached.town.zones[zoneIndex] = updatedZone;
      }
    }

    setCached(townCacheKey, townCached);
  }

  // Update town-map cache
  const mapCacheKey = `town-map:${townId}` as const;
  const mapCached = getCached(mapCacheKey);

  if (mapCached && data.zones?.length) {
    for (const _z of data.zones) {
      const z = _z as typeof _z & {
        nvt?: 1 | 0;
        danger?: number;
        building?: { type: number };
      };

      const zoneIndex = mapCached.zones.findIndex((zone) => zone.x === z.x && zone.y === z.y);
      const existingMapZone = zoneIndex !== -1 ? mapCached.zones[zoneIndex] : null;

      const updatedMapZone = {
        x: z.x ?? existingMapZone?.x ?? 0,
        y: z.y ?? existingMapZone?.y ?? 0,
        visitedToday: typeof z.nvt === 'number' ? z.nvt === 0 : (existingMapZone?.visitedToday ?? false),
        dangerLevel: typeof z.danger === 'number' ? z.danger : (existingMapZone?.dangerLevel ?? 0),
        buildingId: z.building?.type ?? existingMapZone?.buildingId ?? null,
      };

      if (zoneIndex !== -1) {
        mapCached.zones[zoneIndex] = updatedMapZone;
      } else {
        mapCached.zones.push(updatedMapZone);
      }
    }

    setCached(mapCacheKey, mapCached);
  }

  // Update citizens
  if (townCached?.town && citizensData.citizens?.length) {
    for (const citizen of citizensData.citizens) {
      const citizenIndex = townCached.town.citizens.findIndex((c) => c.userId === citizen.id);

      if (citizenIndex !== -1 && (citizen.x !== undefined || citizen.y !== undefined)) {
        const existingCitizen = townCached.town.citizens[citizenIndex];
        townCached.town.citizens[citizenIndex] = {
          ...existingCitizen,
          x: citizen.x ?? existingCitizen.x,
          y: citizen.y ?? existingCitizen.y,
        };
      }
    }

    setCached(townCacheKey, townCached);
  }

  // Update citizens in map cache
  if (mapCached && citizensData.citizens?.length) {
    for (const citizen of citizensData.citizens) {
      const citizenIndex = mapCached.citizens.findIndex((c) => c.x === citizen.x && c.y === citizen.y);

      if (citizenIndex !== -1 && (citizen.x !== undefined || citizen.y !== undefined)) {
        mapCached.citizens[citizenIndex] = {
          x: citizen.x ?? mapCached.citizens[citizenIndex].x,
          y: citizen.y ?? mapCached.citizens[citizenIndex].y,
        };
      }
    }

    setCached(mapCacheKey, mapCached);
  }
};
