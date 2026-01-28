import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { registry } from '../utils/api/openapi';
import { ErrorResponse, routeDetails } from '../utils/api/openapi-schemas';
import { sendError, validate } from '../utils/error';
import { prisma } from '../utils/prisma';
import { createMHApi } from '../utils/api/mh-api.helper';
import { getOrCreateTown } from '../utils/town';

const requestSchema = registry.register(
  'MapsRequest',
  z.object({
    key: z.string().min(1).openapi({ description: 'User key for MyHordes API authentication' }),
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
        })
      )
      .openapi({ description: 'List of towns with their zones' }),
  })
);

type ResponseType = z.infer<typeof responseSchema>;

registry.registerPath({
  method: 'post',
  path: '/maps',
  summary: 'Get zones from multiple towns',
  tags: ['Maps'],
  ...routeDetails(requestSchema, responseSchema),
});

const router = Router();

router.post('/', async (req: Request, res: Response<ResponseType | ErrorResponse>) => {
  try {
    const { townIds, key } = validate(requestSchema, req);

    // Check which towns exist in the database
    const existingTowns = await prisma.town.findMany({
      where: {
        id: {
          in: townIds,
        },
      },
      select: { id: true },
    });

    const existingTownIds = new Set(existingTowns.map((t) => t.id));
    const missingTownIds = townIds.filter((id) => !existingTownIds.has(id));

    // Fetch missing towns from MyHordes API
    if (missingTownIds.length > 0) {
      // Initialize MH API
      const api = createMHApi(key);

      await Promise.all(missingTownIds.map((townId) => getOrCreateTown(api, townId)));
    }

    const towns = await prisma.town.findMany({
      where: {
        id: {
          in: townIds,
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

    res.json({
      success: true,
      towns,
    });
  } catch (error) {
    sendError(res, error);
  }
});

export const mapsRouter = router;
