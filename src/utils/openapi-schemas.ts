import { z } from 'zod';
import { registry } from './openapi';

export const errorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    error: z.string(),
    details: z.array(z.unknown()).optional(),
    message: z.string().optional(),
  })
);

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const routeDetails = <TReq extends z.ZodType, TRes extends z.ZodType>(
  requestSchema: TReq,
  responseSchema: TRes
) => ({
  request: {
    body: {
      content: {
        'application/json': {
          schema: requestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: responseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: 'Server error',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});
