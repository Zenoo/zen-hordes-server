import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { createMHApi } from '../utils/api/mh-api.helper.js';
import { registry } from '../utils/api/openapi.js';
import { ErrorResponse, routeDetails } from '../utils/api/openapi-schemas.js';
import { getCached, setCached } from '../utils/cache.js';
import { sendError, validate } from '../utils/error.js';
import { prisma } from '../utils/prisma.js';
import { checkUserInTown, createOrUpdateTowns } from '../utils/town.js';

const requestSchema = registry.register(
  'TownRequest',
  z.object({
    townId: z.number().openapi({ description: 'ID of the town to fetch' }),
    userId: z.number().openapi({ description: 'ID of the user requesting the data' }),
    key: z.string().min(1).openapi({ description: 'User key for MyHordes API authentication' }),
  })
);

const responseSchema = registry.register(
  'TownResponse',
  z.object({
    success: z.boolean().openapi({ description: 'Indicates if the request was successful' }),
    town: z
      .object({
        id: z.number().openapi({ description: 'Town ID' }),
        name: z.string().openapi({ description: 'Town name' }),
        start: z.string().openapi({ description: 'Town start date' }),
        season: z.number().openapi({ description: 'Season number' }),
        phase: z.string().openapi({ description: 'Town phase' }),
        source: z.string().nullable().openapi({ description: 'Town source' }),
        width: z.number().openapi({ description: 'Town width' }),
        height: z.number().openapi({ description: 'Town height' }),
        x: z.number().openapi({ description: 'Town X coordinate' }),
        y: z.number().openapi({ description: 'Town Y coordinate' }),
        bonusPoints: z.number().openapi({ description: 'Bonus points' }),
        waterInWell: z.number().openapi({ description: 'Water in well' }),
        type: z.string().openapi({ description: 'Town type' }),
        lastUpdate: z.string().nullable().openapi({ description: 'Last update timestamp' }),
        insurrected: z.boolean().openapi({ description: 'Whether town is insurrected' }),
        custom: z.boolean().openapi({ description: 'Whether town is custom' }),
        chaos: z.boolean().openapi({ description: 'Whether town has chaos' }),
        devastated: z.boolean().openapi({ description: 'Whether town is devastated' }),
        doorOpened: z.boolean().openapi({ description: 'Whether door is opened' }),
        pandemonium: z.boolean().openapi({ description: 'Whether town has pandemonium' }),
        guideId: z.number().nullable().openapi({ description: 'Guide user ID' }),
        shamanId: z.number().nullable().openapi({ description: 'Shaman user ID' }),
        catapultMasterId: z.number().nullable().openapi({ description: 'Catapult master user ID' }),
        bank: z
          .array(
            z.object({
              id: z.number().openapi({ description: 'Item ID' }),
              quantity: z.number().openapi({ description: 'Quantity of the item' }),
              broken: z.boolean().openapi({ description: 'Whether the item is broken' }),
            })
          )
          .openapi({ description: 'Bank items' }),
        zones: z
          .array(
            z.object({
              x: z.number().openapi({ description: 'X coordinate of the zone' }),
              y: z.number().openapi({ description: 'Y coordinate of the zone' }),
              visitedToday: z.boolean().openapi({ description: 'Whether the zone was visited today' }),
              dangerLevel: z.number().openapi({ description: 'Danger level of the zone' }),
              buildingId: z.number().nullable().openapi({ description: 'ID of the building in the zone, if any' }),
              depleted: z.boolean().openapi({ description: 'Whether the zone is depleted' }),
              zombies: z.number().openapi({ description: 'Number of zombies in the zone' }),
              updatedAt: z.string().nullable().openapi({ description: 'Last update timestamp' }),
              updatedById: z.number().nullable().openapi({ description: 'ID of the user who last updated the zone' }),
              items: z
                .array(
                  z.object({
                    id: z.number().openapi({ description: 'Item ID' }),
                    quantity: z.number().openapi({ description: 'Quantity of the item' }),
                    broken: z.boolean().openapi({ description: 'Whether the item is broken' }),
                  })
                )
                .openapi({ description: 'List of items in the zone' }),
            })
          )
          .openapi({ description: 'Town zones' }),
        citizens: z
          .array(
            z.object({
              userId: z.number().openapi({ description: 'User ID' }),
              name: z.string().openapi({ description: 'Citizen name' }),
              job: z.string().nullable().openapi({ description: 'Citizen job' }),
              x: z.number().openapi({ description: 'Citizen X coordinate' }),
              y: z.number().openapi({ description: 'Citizen Y coordinate' }),
              dead: z.boolean().openapi({ description: 'Whether citizen is dead' }),
              out: z.boolean().openapi({ description: 'Whether citizen is out' }),
              banned: z.boolean().openapi({ description: 'Whether citizen is banned' }),
            })
          )
          .openapi({ description: 'Town citizens' }),
      })
      .nullable()
      .openapi({ description: 'Town data' }),
  })
);

export type TownResponseType = z.infer<typeof responseSchema>;

registry.registerPath({
  method: 'post',
  path: '/town',
  summary: 'Get comprehensive town data',
  tags: ['Town'],
  ...routeDetails(requestSchema, responseSchema),
});

const router = Router();

router.post('/', async (req: Request, res: Response<TownResponseType | ErrorResponse>) => {
  try {
    const { townId, key, userId } = validate(requestSchema, req);

    // Create cache key (by townId only since data is same for all citizens)
    const cacheKey = `town:${townId}` as const;

    // Check cache
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const api = createMHApi(key);
    await createOrUpdateTowns(api, [townId], userId);

    // Check if the user is actually in the town
    await checkUserInTown(api, townId, userId);

    const town = await prisma.town.findUnique({
      where: {
        id: townId,
      },
      include: {
        bank: true,
        zones: {
          include: {
            items: true,
          },
        },
        citizens: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!town) {
      return res.json({
        success: true,
        town: null,
      });
    }

    const formattedTown = {
      id: town.id,
      name: town.name,
      start: town.start.toISOString(),
      season: town.season,
      phase: town.phase,
      source: town.source,
      width: town.width,
      height: town.height,
      x: town.x,
      y: town.y,
      bonusPoints: town.bonusPoints,
      waterInWell: town.waterInWell,
      type: town.type,
      lastUpdate: town.lastUpdate?.toISOString() ?? null,
      insurrected: town.insurrected,
      custom: town.custom,
      chaos: town.chaos,
      devastated: town.devastated,
      doorOpened: town.doorOpened,
      pandemonium: town.pandemonium,
      guideId: town.guideId,
      shamanId: town.shamanId,
      catapultMasterId: town.catapultMasterId,
      bank: town.bank.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        broken: item.broken,
      })),
      zones: town.zones.map((zone) => ({
        x: zone.x,
        y: zone.y,
        visitedToday: zone.visitedToday,
        dangerLevel: zone.dangerLevel,
        buildingId: zone.buildingId,
        depleted: zone.depleted,
        zombies: zone.zombies,
        updatedAt: zone.updatedAt?.toISOString() ?? null,
        updatedById: zone.updatedById,
        items: zone.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          broken: item.broken,
        })),
      })),
      citizens: town.citizens.map((citizen) => ({
        userId: citizen.userId,
        name: citizen.user.name,
        job: citizen.job,
        x: citizen.x,
        y: citizen.y,
        dead: citizen.dead,
        out: citizen.out,
        banned: citizen.banned,
      })),
    };

    const response: TownResponseType = {
      success: true,
      town: formattedTown,
    };

    // Cache the response
    setCached(cacheKey, response);

    res.json(response);
  } catch (error) {
    sendError(res, error);
  }
});

export const townRouter = router;
