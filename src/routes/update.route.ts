import { Router, Request, Response } from 'express';
import { createMHApi } from '../utils/mh-api.helper';
import { z } from 'zod';

/**
 * Schema for /update POST request body
 */
export const updateRequestSchema = z.object({
  userkey: z.string().min(1, 'userkey is required'),
});

/**
 * Type inferred from the Zod schema
 */
export type UpdateRequest = z.infer<typeof updateRequestSchema>;

const router = Router();

// POST /update endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = updateRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationResult.error.issues
      });
    }

    const { userkey }: UpdateRequest = validationResult.data;

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
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const updateRouter = router;
