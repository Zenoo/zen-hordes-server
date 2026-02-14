import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { createMHApi } from '../utils/api/mh-api.helper.js';
import { registry } from '../utils/api/openapi.js';
import { ErrorResponse, routeDetails } from '../utils/api/openapi-schemas.js';
import { getCached, setCached } from '../utils/cache.js';
import { sendError, validate } from '../utils/error.js';
import { prisma } from '../utils/prisma.js';
import { createOrUpdateTowns } from '../utils/town.js';

const requestSchema = registry.register(
  'MapsRequest',
  z.object({
    key: z.string().min(1).openapi({ description: 'User key for MyHordes API authentication' }),
    userId: z.number().openapi({ description: 'ID of the user requesting the data' }),
    townIds: z.array(z.number()).openapi({ description: 'List of town IDs to fetch zones for' }),
  })
);

const responseSchema = registry.register(
  'MapsResponse',
  z.object({
    success: z.boolean().openapi({ description: 'Indicates if the request was successful' }),
    towns: z
      .array(
        z.object({
          id: z.number().openapi({ description: 'Town ID' }),
          width: z.number().openapi({ description: 'Width of the map' }),
          height: z.number().openapi({ description: 'Height of the map' }),
          x: z.number().openapi({ description: 'X coordinate of the town' }),
          y: z.number().openapi({ description: 'Y coordinate of the town' }),
          zones: z
            .array(
              z.object({
                x: z.number().openapi({ description: 'X coordinate of the zone' }),
                y: z.number().openapi({ description: 'Y coordinate of the zone' }),
                visitedToday: z.boolean().openapi({ description: 'Whether the zone was visited today' }),
                dangerLevel: z.number().openapi({ description: 'Danger level of the zone' }),
                buildingId: z.number().nullable().openapi({ description: 'ID of the building in the zone, if any' }),
              })
            )
            .openapi({ description: 'List of zones from the requested towns' }),
          citizens: z
            .array(
              z.object({
                x: z.number().openapi({ description: 'X coordinate of the citizen' }),
                y: z.number().openapi({ description: 'Y coordinate of the citizen' }),
              })
            )
            .openapi({ description: 'List of citizens in the town' }),
        })
      )
      .openapi({ description: 'List of towns with their zones' }),
  })
);

export type MapsResponseType = z.infer<typeof responseSchema>;

registry.registerPath({
  method: 'post',
  path: '/maps',
  summary: 'Get zones from multiple towns',
  tags: ['Maps'],
  ...routeDetails(requestSchema, responseSchema),
});

const router = Router();

router.post('/', async (req: Request, res: Response<MapsResponseType | ErrorResponse>) => {
  try {
    const { townIds, key, userId } = validate(requestSchema, req);

    type TownData = MapsResponseType['towns'][number];

    // Check cache for each town individually
    const cachedTowns: TownData[] = [];
    const uncachedTownIds: number[] = [];

    for (const townId of townIds) {
      const cacheKey = `town-map:${townId}` as const;
      const cached = getCached(cacheKey);
      if (cached) {
        cachedTowns.push(cached);
      } else {
        uncachedTownIds.push(townId);
      }
    }

    let fetchedTowns: TownData[] = [];

    if (uncachedTownIds.length > 0) {
      const api = createMHApi(key);

      await createOrUpdateTowns(api, uncachedTownIds, userId);

      fetchedTowns = await prisma.town.findMany({
        where: {
          id: {
            in: uncachedTownIds,
          },
        },
        select: {
          id: true,
          x: true,
          y: true,
          width: true,
          height: true,
          zones: {
            select: {
              x: true,
              y: true,
              visitedToday: true,
              dangerLevel: true,
              buildingId: true,
            },
            orderBy: [{ x: 'asc' }, { y: 'asc' }],
          },
          citizens: {
            select: {
              x: true,
              y: true,
            },
          },
        },
      });

      // Cache each town individually
      for (const town of fetchedTowns) {
        const cacheKey = `town-map:${town.id}` as const;
        setCached(cacheKey, town);
      }
    }

    const towns = [...cachedTowns, ...fetchedTowns];

    const response: MapsResponseType = {
      success: true,
      towns,
    };

    res.json(response);
  } catch (error) {
    sendError(res, error);
  }
});

export const mapsRouter = router;
