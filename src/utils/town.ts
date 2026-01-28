import dayjs from 'dayjs';
import { Job, Locale, TownPhase, TownType } from '../generated/prisma/enums';
import { ZoneCreateManyInput, ZoneItemCreateManyInput } from '../generated/prisma/models';
import { Api, JSONGameObject } from './api/mh-api';
import { prisma } from './prisma';

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

const mapZoneData = (townId: number, _zone: NonNullable<JSONGameObject['zones']>[number]): ZoneCreateManyInput => {
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
    x: zone.x ?? 0,
    y: zone.y ?? 0,
    visitedToday: typeof zone.nvt === 'number' ? zone.nvt === 0 : false,
    dangerLevel: typeof zone.danger === 'number' ? zone.danger : 0,
    depleted: 'dried' in zone.details ? zone.details.dried : false,
    zombies: 'z' in zone.details ? zone.details.z : 0,
    buildingId: zone.building?.type,
  };
};

const updateCity = async (api: Api<unknown>, townId: number) => {
  // Fetch city data from MyHordes API
  const { data } = await api.json.getJson2({
    mapId: townId,
    fields: `
      conspiracy,
      city.fields(bank,water,chaos,devast,door),
      zones.fields(
        x,
        y,
        nvt,
        danger,
        details,
        items,
        building
      )
    `.replace(/\s+/g, ''),
  });

  if (data.city?.bank) {
    // Delete old bank items
    await prisma.bankItem.deleteMany({
      where: { townId },
    });

    // Create new bank items
    await prisma.bankItem.createMany({
      data: data.city.bank.map((item) => ({
        townId,
        id: item.id ?? 0,
        quantity: item.count,
        broken: item.broken,
      })),
    });

    // Update town data
    await prisma.town.update({
      where: { id: townId },
      data: {
        lastUpdate: new Date(),
        waterInWell: data.city.water,
        chaos: data.city.chaos,
        devastated: data.city.devast,
        doorOpened: data.city.door,
        insurrected: data.conspiracy,
      },
    });
  }

  // Update zones
  if (data.zones?.length) {
    const existingZones = await prisma.zone.findMany({
      where: { townId },
    });

    const missingZones = data.zones.filter((z) => !existingZones.some((ez) => ez.x === z.x && ez.y === z.y));

    // Create missing zones
    if (missingZones.length > 0) {
      await prisma.zone.createMany({
        data: missingZones.map((z) => {
          const zoneData = mapZoneData(townId, z);
          return { ...zoneData, townId };
        }),
      });
    }

    // Update existing zones if needed
    for (const _z of data.zones) {
      const existingZone = existingZones.find((ez) => ez.x === _z.x && ez.y === _z.y);

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
        const zoneData = mapZoneData(townId, z);
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
  const { data: citizensData } = await api.json.getJson2({
    mapId: townId,
    fields: 'citizens.fields(id,x,y)',
  });

  const existingCitizens = await prisma.citizen.findMany({
    where: { townId },
  });

  if (citizensData.citizens?.length) {
    for (const citizen of citizensData.citizens) {
      const existingCitizen = existingCitizens.find((ec) => ec.userId === citizen.id);

      if (!existingCitizen) {
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
};

export const getOrCreateTown = async (api: Api<unknown>, id: number) => {
  const town = await prisma.town.findUnique({
    where: { id },
    select: { id: true, lastUpdate: true },
  });

  if (town) {
    if (dayjs().diff(dayjs(town.lastUpdate), 'hour') >= 1) {
      await updateCity(api, town.id);
    }

    return town;
  }

  return createTownFromApi(api, id);
};

const createTownFromApi = async (api: Api<unknown>, id: number) => {
  let town: { id: number; lastUpdate: Date | null } | null = null;

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
      )`.replace(/\s+/g, ''),
  });

  const { data: citizensData } = await api.json.getJson2({
    mapId: id,
    fields: `
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

  // Create town in the database
  town = await prisma.town.create({
    data: {
      id: data.id,
      name: data.city?.name ?? 'Unknown',
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
    select: { id: true, lastUpdate: true },
  });

  // Create zones
  if (data.zones?.length) {
    await prisma.zone.createMany({
      data: data.zones.map((z) => {
        const zoneData = mapZoneData(town.id, z);
        return { ...zoneData, townId: town.id };
      }),
    });

    // Create items
    const items: ZoneItemCreateManyInput[] = data.zones.flatMap((z) => {
      if (!z.items) return [];
      return z.items.map((item) => ({
        townId: town.id,
        x: z.x ?? 0,
        y: z.y ?? 0,
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
  if (citizensData.citizens?.length) {
    const knownUsers = await prisma.user.findMany({
      where: {
        id: { in: citizensData.citizens.map((c) => c.id ?? 0) },
      },
    });

    const newUsers = citizensData.citizens.filter((citizen) => !knownUsers.some((u) => u.id === citizen.id));

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
      data: citizensData.citizens.map((citizen) => ({
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

export const createTown = async (api: Api<unknown>, id: number) => {
  return getOrCreateTown(api, id);
};
