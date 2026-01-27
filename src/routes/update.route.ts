import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { createMHApi } from '../utils/api/mh-api.helper';
import { registry } from '../utils/api/openapi';
import { ErrorResponse, routeDetails } from '../utils/api/openapi-schemas';
import { getTown } from '../utils/town';
import { getUser } from '../utils/user';

const requestSchema = registry.register(
  'UpdateRequest',
  z.object({
    userkey: z.string().min(1).openapi({ description: 'User key for MyHordes API authentication' }),
    townId: z.number().openapi({ description: 'ID of the town' }),
    userId: z.number().openapi({ description: 'ID of the user' }),
  })
);

const responseSchema = registry.register(
  'UpdateResponse',
  z.object({
    available: z.boolean().openapi({ description: 'MyHordes API status' }),
  })
);

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
    const validationResult = requestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const { userkey, townId, userId } = validationResult.data;

    // Initialize MH API with credentials
    const api = createMHApi(userkey);

    // Fetch API status
    const { data } = await api.json.statusList();

    const available = !data.attack && !data.maintain;

    if (!available) {
      res.status(503).json({ error: 'MyHordes API is currently unavailable' });
      return;
    }

    const user = await getUser(api, userId);

    const town = await getTown(api, user, townId);
    console.log(town.id);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const updateRouter = router;
