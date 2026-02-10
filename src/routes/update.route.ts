import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { createMHApi } from '../utils/api/mh-api.helper';
import { registry } from '../utils/api/openapi';
import { ErrorResponse, routeDetails } from '../utils/api/openapi-schemas';
import { updateCacheAfterUserUpdate } from '../utils/cache-update';
import { sendError, validate } from '../utils/error';
import { prisma } from '../utils/prisma';
import { createOrUpdateTowns } from '../utils/town';
import { createUser } from '../utils/user';

const requestSchema = registry.register(
  'UpdateRequest',
  z.object({
    key: z.string().min(1).openapi({ description: 'User key for MyHordes API authentication' }),
    townId: z.number().openapi({ description: 'ID of the town' }),
    userId: z.number().openapi({ description: 'ID of the user' }),
    x: z.number().openapi({ description: 'X coordinate of the user' }),
    y: z.number().openapi({ description: 'Y coordinate of the user' }),
    zombies: z.number().openapi({ description: 'Number of zombies in the zone' }),
    depleted: z.boolean().openapi({ description: 'Indicates if the zone is depleted' }),
    buildingId: z.number().optional().openapi({ description: 'ID of the building in the zone, if any' }),
    scoutRadar: z
      .object({
        east: z.number().optional().openapi({ description: 'Zombies estimated to be present to the east' }),
        north: z.number().optional().openapi({ description: 'Zombies estimated to be present to the north' }),
        west: z.number().optional().openapi({ description: 'Zombies estimated to be present to the west' }),
        south: z.number().optional().openapi({ description: 'Zombies estimated to be present to the south' }),
      })
      .optional()
      .openapi({ description: 'Scout radar information' }),
    scavRadar: z
      .object({
        east: z.boolean().optional().openapi({ description: 'East zone is depleted' }),
        north: z.boolean().optional().openapi({ description: 'North zone is depleted' }),
        west: z.boolean().optional().openapi({ description: 'West zone is depleted' }),
        south: z.boolean().optional().openapi({ description: 'South zone is depleted' }),
      })
      .optional()
      .openapi({ description: 'Scavenger radar information' }),
    items: z
      .array(
        z.object({
          id: z.number().openapi({ description: 'Item ID' }),
          quantity: z.number().openapi({ description: 'Quantity of the item' }),
          broken: z.boolean().openapi({ description: 'Indicates if the item is broken' }),
        })
      )
      .openapi({ description: 'List of items' }),
  })
);

const responseSchema = registry.register(
  'UpdateResponse',
  z.object({
    success: z.boolean().openapi({ description: 'Indicates if the update was successful' }),
    error: z.string().optional().openapi({ description: 'Error message if the update failed' }),
  })
);

export type UpdateRequestType = z.infer<typeof requestSchema>;
type ResponseType = z.infer<typeof responseSchema>;

registry.registerPath({
  method: 'post',
  path: '/update',
  summary: 'Get API status',
  tags: ['Update'],
  ...routeDetails(requestSchema, responseSchema),
});

const router = Router();

router.post('/', async (req: Request, res: Response<ResponseType | ErrorResponse>) => {
  try {
    const data = validate(requestSchema, req);

    // Initialize MH API with credentials
    const api = createMHApi(data.key);

    // Fetch API status
    const status = await api.json.statusList();

    const available = !status.data.attack && !status.data.maintain;

    if (!available) {
      res.status(503).json({ success: false, error: 'MyHordes API is currently unavailable' });
      return;
    }

    // Create user & town if needed
    const user = await createUser(api, data.userId, data.key);
    await createOrUpdateTowns(api, [data.townId]);

    let dangerLevel = 0;
    if (data.zombies > 5) {
      dangerLevel = 3;
    } else if (data.zombies > 2) {
      dangerLevel = 2;
    } else if (data.zombies > 0) {
      dangerLevel = 1;
    }

    // Update current zone
    await prisma.zone.upsert({
      where: {
        townId_x_y: {
          townId: data.townId,
          x: data.x,
          y: data.y,
        },
      },
      create: {
        townId: data.townId,
        x: data.x,
        y: data.y,
        zombies: data.zombies,
        visitedToday: true,
        dangerLevel,
        depleted: data.depleted,
        buildingId: data.buildingId,
        updatedAt: new Date(),
        updatedById: user.id,
        items: {
          createMany: {
            data: data.items,
          },
        },
      },
      update: {
        zombies: data.zombies,
        visitedToday: true,
        dangerLevel,
        depleted: data.depleted,
        buildingId: data.buildingId,
        updatedAt: new Date(),
        updatedById: user.id,
        items: {
          deleteMany: {},
          createMany: {
            data: data.items,
          },
        },
      },
    });

    // Update adjacent zones depletion status based on scavenger radar
    if (data.scavRadar) {
      const updates = [];
      for (const direction of ['east', 'north', 'west', 'south'] as const) {
        if (data.scavRadar[direction] !== undefined) {
          let adjacentX = data.x;
          let adjacentY = data.y;

          switch (direction) {
            case 'east':
              adjacentX += 1;
              break;
            case 'north':
              adjacentY -= 1;
              break;
            case 'west':
              adjacentX -= 1;
              break;
            case 'south':
              adjacentY += 1;
              break;
          }

          updates.push(
            prisma.zone.update({
              where: {
                townId_x_y: {
                  townId: data.townId,
                  x: adjacentX,
                  y: adjacentY,
                },
              },
              data: {
                depleted: data.scavRadar[direction],
              },
            })
          );
        }
      }

      await Promise.all(updates);
    }

    // Update caches
    updateCacheAfterUserUpdate(data);

    res.json({ success: true });
  } catch (error) {
    sendError(res, error);
  }
});

export const updateRouter = router;
