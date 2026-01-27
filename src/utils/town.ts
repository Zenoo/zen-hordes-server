import dayjs from 'dayjs';
import { Job, Locale, TownPhase, TownType } from '../generated/prisma/enums';
import { Api, JSONGameObject } from './api/mh-api';
import { prisma } from './prisma';
import { User } from '../generated/prisma/client';
import { ZoneCreateManyInput, ZoneItemCreateManyInput } from '../generated/prisma/models';

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

const mapZoneData = (_zone: NonNullable<JSONGameObject['zones']>[number]): ZoneCreateManyInput => {
  const zone = _zone as typeof _zone & {
    // The Swagger is not up to date, those fields exist
    nvt?: boolean;
    danger?: number;
    details: [] | { dried?: boolean; z?: number };
  };

  return {
    townId: 0,
    x: zone.x ?? 0,
    y: zone.y ?? 0,
    visitedToday: typeof zone.nvt === 'boolean' ? !zone.nvt : false,
    dangerLevel: typeof zone.danger === 'number' ? zone.danger : 0,
    depleted: 'dried' in zone.details ? zone.details.dried : false,
    zombies: 'z' in zone.details ? zone.details.z : 0,
    buildingId: zone.building?.id,
  };
};

export const getTown = async (api: Api<unknown>, user: Pick<User, 'id'>, id: number) => {
  let town = await prisma.town.findUnique({
    where: { id },
    include: { zones: true, bank: true, citizens: true },
  });

  if (town) {
    return town;
  }

  // Fetch town from MyHordes API
  const { data } = await api.json.getJson2({
    mapId: id,
    fields: `
      id
      date
      season
      phase
      source
      wid
      hei
      bonusPts
      conspiracy
      custom
      bank
      citizens.fields(
        id,
        name,
        twinId,
        etwinId,
        locale,
        avatar,
        job.uid
      )
      city.fields(
        name,
        x,
        y,
        type,
        water,
        chaos,
        devast,
        door,
        hard
      )
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
      zones: {
        createMany: {
          data: data.zones?.map(mapZoneData) ?? [],
        },
      },
    },
    include: { zones: true, bank: true, citizens: true },
  });

  // Create zones
  if (data.zones?.length) {
    await prisma.zone.createMany({
      data: data.zones.map((z) => {
        const zoneData = mapZoneData(z);
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
