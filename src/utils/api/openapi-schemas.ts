import { z } from 'zod';
import { registry } from './openapi.js';

export const errorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false).openapi({ description: 'Indicates the request was unsuccessful' }),
    error: z.string().openapi({ description: 'Error message describing the failure' }),
    details: z.array(z.unknown()).optional().openapi({ description: 'Additional details about the error' }),
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
    503: {
      description: 'Service Unavailable',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});
