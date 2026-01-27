import { Router, Request, Response } from 'express';
import { createMHApi } from '../utils/mh-api.helper';
import { z } from 'zod';
import { registry } from '../utils/openapi';
import { routeDetails, ErrorResponse } from '../utils/openapi-schemas';

const requestSchema = registry.register(
  'UpdateRequest',
  z.object({
    userkey: z.string().min(1).openapi({ description: 'User key for MyHordes API authentication' }),
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

    const { userkey } = validationResult.data;

    // Initialize MH API with credentials
    const api = createMHApi(userkey);

    // Fetch API status
    const { data } = await api.json.statusList();

    const available = !data.attack && !data.maintain;

    res.json({ available });
  } catch (error) {
    console.error('Error fetching API status:', error);
    res.status(500).json({
      error: 'Failed to fetch API status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const updateRouter = router;
