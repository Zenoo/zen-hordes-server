import dayjs from 'dayjs';
import { Job, Locale, TownPhase, TownType } from '../generated/prisma/enums.js';
import { ZoneCreateManyInput, ZoneItemCreateManyInput } from '../generated/prisma/models.js';
import { Api, JSONGameObject } from './api/mh-api.js';
import { prisma } from './prisma.js';
import { updateCacheAfterHourlyUpdate } from './cache-update.js';
import { LOGGER } from '../context.js';
import { checkApiAvailability } from './api/mh-api.helper.js';
import { ExpectedError } from './error.js';
import { Town } from '../generated/prisma/client.js';

const getCitizenJob = (citizen: NonNullable<JSONGameObject['citizens']>[number]) => {
  const jobIcon = citizen.job?.uid;

  switch (jobIcon) {
    case 'basic':
      return Job.RESIDENT;
    case 'dig':
      return Job.SCAVENGER;
    case 'shield':
      return Job.GUARDIAN;
    case 'vest':
      return Job.SCOUT;
    case 'tamer':
      return Job.TAMER;
    case 'tech':
      return Job.TECHNICIAN;
    case 'book':
      return Job.SURVIVALIST;
  }
};

const mapZoneData = (
  townId: number,
  city: Pick<NonNullable<JSONGameObject['city']>, 'x' | 'y'> | undefined,
  _zone: NonNullable<JSONGameObject['zones']>[number]
): ZoneCreateManyInput => {
  const zone = _zone as typeof _zone & {
    // The Swagger is not up to date, those fields exist
    nvt?: 1 | 0;
    danger?: number;
    details: [] | { dried?: boolean; z?: number };
  } & {
    building?: { type: number };
  };

  return {
    townId,
    x: (zone.x ?? 0) - (city?.x ?? 0),
    y: -(zone.y ?? 0) + (city?.y ?? 0),
    visitedToday: typeof zone.nvt === 'number' ? zone.nvt === 0 : false,
    dangerLevel: typeof zone.danger === 'number' ? zone.danger : 0,
    depleted: 'dried' in zone.details ? zone.details.dried : false,
    zombies: 'z' in zone.details ? zone.details.z : 0,
    buildingId: zone.building?.type,
  };
};

export const updateCity = async (api: Api<unknown>, townId: number) => {
  await checkApiAvailability(api);

  // Fetch city data from MyHordes API
  const { data } = await api.json.getJson2({
    mapId: townId,
    fields: `
      conspiracy,
      city.fields(x,y,bank,water,chaos,devast,door),
      zones.fields(
        x,
        y,
        nvt,
        danger,
        details,
        items,
        building
      ),
      citizens.fields(id,twinId,etwinId,name,locale,avatar,x,y)
    `.replace(/\s+/g, ''),
  });

  if (data.city?.bank) {
    const bankItems = data.city.bank.map((item) => ({
      townId,
      id: item.id ?? 0,
      quantity: item.count ?? 1,
      broken: item.broken ?? false,
    }));

    await prisma.$transaction([
      // Delete old bank items
      prisma.bankItem.deleteMany({
        where: { townId },
      }),

      // Create new bank items
      prisma.bankItem.createMany({
        data: bankItems,
      }),

      // Update town data
      prisma.town.update({
        where: { id: townId },
        data: {
          lastUpdate: new Date(),
          waterInWell: data.city.water,
          chaos: data.city.chaos,
          devastated: data.city.devast,
          doorOpened: data.city.door,
          insurrected: data.conspiracy,
        },
      }),
    ]);
  }

  // Update zones
  if (data.zones?.length) {
    const existingZones = await prisma.zone.findMany({
      where: { townId },
    });

    const missingZones = data.zones.filter(
      (z) =>
        !existingZones.some(
          (ez) => ez.x === (z.x ?? 0) - (data.city?.x ?? 0) && ez.y === -(z.y ?? 0) + (data.city?.y ?? 0)
        )
    );

    // Create missing zones
    if (missingZones.length > 0) {
      await prisma.zone.createMany({
        data: missingZones.map((z) => {
          const zoneData = mapZoneData(townId, data.city, z);
          return { ...zoneData, townId };
        }),
      });
    }

    // Update existing zones if needed
    for (const _z of data.zones) {
      const existingZone = existingZones.find(
        (ez) => ez.x === (_z.x ?? 0) - (data.city?.x ?? 0) && ez.y === -(_z.y ?? 0) + (data.city?.y ?? 0)
      );

      if (!existingZone) {
        continue;
      }

      const z = _z as typeof _z & {
        // The Swagger is not up to date, those fields exist
        nvt?: 1 | 0;
        danger?: number;
        details: [] | { dried?: boolean; z?: number };
      } & {
        building?: { type: number };
      };

      let needUpdate = false;

      if ('dried' in z.details && existingZone.depleted !== z.details.dried) {
        needUpdate = true;
      } else if ('z' in z.details && existingZone.zombies !== z.details.z) {
        needUpdate = true;
      } else if (typeof z.nvt === 'number' && existingZone.visitedToday !== (z.nvt === 0)) {
        needUpdate = true;
      } else if (typeof z.danger === 'number' && existingZone.dangerLevel !== z.danger) {
        needUpdate = true;
      } else if (existingZone.buildingId !== z.building?.type) {
        needUpdate = true;
      }

      if (needUpdate) {
        const zoneData = mapZoneData(townId, data.city, z);
        await prisma.zone.update({
          where: {
            townId_x_y: {
              townId,
              x: existingZone.x,
              y: existingZone.y,
            },
          },
          data: zoneData,
        });
      }
    }
  }

  // Update citizen positions
  const existingCitizens = await prisma.citizen.findMany({
    where: { townId },
  });

  const newDeadCitizens = existingCitizens.filter((ec) => !ec.dead && !data.citizens?.some((c) => c.id === ec.userId));

  // Mark citizens as dead if they are no longer present
  await prisma.citizen.updateMany({
    where: {
      townId,
      userId: { in: newDeadCitizens.map((dc) => dc.userId) },
    },
    data: {
      dead: true,
    },
  });

  if (data.citizens?.length) {
    for (const citizen of data.citizens) {
      const existingCitizen = existingCitizens.find((ec) => ec.userId === citizen.id);

      if (!existingCitizen) {
        // New citizen in the town, create it
        await prisma.citizen.create({
          data: {
            user: {
              connectOrCreate: {
                where: { id: citizen.id ?? 0 },
                create: {
                  id: citizen.id ?? 0,
                  twinoidId: citizen.twinId,
                  etwinId: citizen.etwinId,
                  name: citizen.name ?? 'Unknown',
                  locale:
                    citizen.locale && Object.values(Locale).includes(citizen.locale as Locale)
                      ? (citizen.locale as Locale)
                      : Locale.EN,
                  avatar: citizen.avatar,
                  key: '',
                },
              },
            },
            town: {
              connect: { id: townId },
            },
            x: citizen.x ?? 0,
            y: citizen.y ?? 0,
          },
        });
        continue;
      }

      if (existingCitizen.x !== citizen.x || existingCitizen.y !== citizen.y) {
        await prisma.citizen.update({
          where: {
            userId_townId: {
              userId: existingCitizen.userId,
              townId,
            },
          },
          data: {
            x: citizen.x ?? existingCitizen.x,
            y: citizen.y ?? existingCitizen.y,
          },
        });
      }
    }
  }

  // Update cache
  updateCacheAfterHourlyUpdate(townId, data);

  const result = await prisma.town.findUnique({
    where: { id: townId },
    select: { id: true, lastUpdate: true, x: true, y: true },
  });

  if (!result) {
    throw new Error('Town not found');
  }

  return result;
};

export const createOrUpdateTowns = async (api: Api<unknown>, ids: number[], userId: number) => {
  const towns = await prisma.town.findMany({
    where: { id: { in: ids } },
    select: { id: true, lastUpdate: true, x: true, y: true },
  });

  const results: Pick<Town, 'id' | 'lastUpdate' | 'x' | 'y'>[] = [];

  for (const id of ids) {
    const town = towns.find((t) => t.id === id);

    if (town) {
      if (dayjs().diff(dayjs(town.lastUpdate), 'hour') >= 1) {
        results.push(await updateCity(api, town.id));
      } else {
        results.push(town);
      }
      continue;
    }

    results.push(await createTownFromApi(api, id, userId));
  }

  return results;
};

const createTownFromApi = async (api: Api<unknown>, id: number, userId: number) => {
  let town: Pick<Town, 'id' | 'lastUpdate' | 'x' | 'y'> | null = null;

  // Check API availability
  await checkApiAvailability(api);

  // Fetch town from MyHordes API
  const { data } = await api.json.getJson2({
    mapId: id,
    fields: `
      id,
      date,
      season,
      phase,
      source,
      wid,
      hei,
      bonusPts,
      conspiracy,
      custom,
      city.fields(
        bank,
        name,
        x,
        y,
        type,
        water,
        chaos,
        devast,
        door,
        hard
      ),
      zones.fields(
        x,
        y,
        nvt,
        danger,
        details,
        items,
        building
      ),
      citizens.fields(
        id,
        x,
        y,
        dead,
        out,
        ban,
        name,
        twinId,
        etwinId,
        locale,
        avatar,
        job.uid
      )`.replace(/\s+/g, ''),
  });

  if (!data.id) {
    throw new Error('Town not found in MyHordes API');
  }

  // Parse API data
  const start = data.date ? dayjs(data.date, 'YYYY-MM-DD HH:mm:ss').toDate() : new Date();
  const phase =
    data.phase && Object.values(TownPhase).includes(data.phase as TownPhase)
      ? (data.phase as TownPhase)
      : TownPhase.NATIVE;
  const type =
    data.city?.type && Object.values(TownType).includes(data.city.type as TownType)
      ? (data.city.type as TownType)
      : TownType.REMOTE;

  const townName = data.city?.name ?? 'Unknown';

  // Create town in the database
  town = await prisma.town.create({
    data: {
      id: data.id,
      name: townName,
      start,
      season: data.season ?? 0,
      phase,
      source: data.source,
      width: data.wid ?? 0,
      height: data.hei ?? 0,
      x: data.city?.x ?? 0,
      y: data.city?.y ?? 0,
      bonusPoints: data.bonusPts,
      waterInWell: data.city?.water,
      type,
      lastUpdate: new Date(),
      insurrected: data.conspiracy,
      custom: data.custom,
      chaos: data.city?.chaos,
      devastated: data.city?.devast,
      doorOpened: data.city?.door,
      pandemonium: data.city?.hard,
    },
    select: { id: true, lastUpdate: true, x: true, y: true },
  });

  LOGGER.log(`User ${userId} created town ${town.id} - ${townName} (started at ${start.toISOString()})`);

  // Create zones
  if (data.zones?.length) {
    await prisma.zone.createMany({
      data: data.zones.map((z) => {
        const zoneData = mapZoneData(town.id, data.city, z);
        return { ...zoneData, townId: town.id };
      }),
    });

    // Create items
    const items: ZoneItemCreateManyInput[] = data.zones.flatMap((z) => {
      if (!z.items) return [];
      return z.items.map((item) => ({
        townId: town.id,
        x: (z.x ?? 0) - (data.city?.x ?? 0),
        y: -(z.y ?? 0) + (data.city?.y ?? 0),
        id: item.id ?? 0,
        quantity: item.count,
        broken: item.broken,
      }));
    });

    if (items.length > 0) {
      await prisma.zoneItem.createMany({
        data: items,
      });
    }
  }

  // Create bank items
  if (data.city?.bank?.length) {
    await prisma.bankItem.createMany({
      data: data.city.bank.map((item) => ({
        townId: town.id,
        id: item.id ?? 0,
        quantity: item.count,
        broken: item.broken,
      })),
    });
  }

  // Create citizens
  if (data.citizens?.length) {
    const knownUsers = await prisma.user.findMany({
      where: {
        id: { in: data.citizens.map((c) => c.id ?? 0) },
      },
    });

    const newUsers = data.citizens.filter((citizen) => !knownUsers.some((u) => u.id === citizen.id));

    // Create new users
    if (newUsers.length > 0) {
      await prisma.user.createMany({
        data: newUsers.map((citizen) => ({
          id: citizen.id ?? 0,
          twinoidId: citizen.twinId,
          etwinId: citizen.etwinId,
          name: citizen.name ?? 'Unknown',
          locale:
            citizen.locale && Object.values(Locale).includes(citizen.locale as Locale)
              ? (citizen.locale as Locale)
              : Locale.EN,
          avatar: citizen.avatar,
          key: '',
        })),
      });
    }

    await prisma.citizen.createMany({
      data: data.citizens.map((citizen) => ({
        userId: citizen.id ?? 0,
        townId: town.id,
        job: getCitizenJob(citizen),
        x: citizen.x ?? 0,
        y: citizen.y ?? 0,
        dead: citizen.dead,
        out: citizen.out,
        banned: citizen.ban,
      })),
    });
  }

  return town;
};

export const checkUserInTown = async (api: Api<unknown>, townId: number, userId: number) => {
  // Check if the user is actually in the town
  const citizen = await prisma.citizen.findUnique({
    where: {
      userId_townId: {
        userId,
        townId,
      },
    },
  });

  // If he's not
  if (!citizen) {
    const townCitizensCount = await prisma.citizen.count({
      where: {
        townId,
      },
    });

    // And there are less than 40 players (town not full)
    if (townCitizensCount < 40) {
      // Check the API again to see if the user just entered the town
      await updateCity(api, townId);

      const newCitizen = await prisma.citizen.findUnique({
        where: {
          userId_townId: {
            userId,
            townId,
          },
        },
      });

      if (!newCitizen) {
        // If he's still not in the town, prevent access
        throw new ExpectedError('User is not a citizen of the town');
      }
    } else {
      // Town is full, no new citizens can enter, prevent access
      throw new ExpectedError('User is not a citizen of the town');
    }
  }
};
