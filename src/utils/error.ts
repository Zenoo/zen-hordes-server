import { Prisma } from '../generated/prisma/client.js';
import type { Request, Response } from 'express';
import { ErrorResponse } from './api/openapi-schemas.js';
import { z } from 'zod';

export class ValidationError extends Error {
  constructor(
    public statusCode: number,
    public response: ErrorResponse
  ) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export const validate = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> => {
  const validationResult = schema.safeParse(req.body);

  if (!validationResult.success) {
    throw new ValidationError(400, {
      success: false,
      error: 'Validation failed',
      details: validationResult.error.issues,
    });
  }

  return validationResult.data;
};

export const sendError = (res: Response<ErrorResponse>, error: unknown) => {
  if (!(error instanceof Error)) {
    throw error;
  }

  if (error instanceof ValidationError) {
    res.status(error.statusCode).send(error.response);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(500).send({ success: false, error: `Prisma Client Known Request Error: ${error.code}` });
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    res
      .status(500)
      .send({ success: false, error: `Prisma Client Unknown Request Error: ${error.message.substring(0, 25)}` });
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    res
      .status(500)
      .send({ success: false, error: `Prisma Client Initialization Error: ${error.message.substring(0, 25)}` });
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    res
      .status(500)
      .send({ success: false, error: `Prisma Client Validation Error: ${error.message.substring(0, 25)}` });
  } else if (error instanceof Error) {
    res.status(500).send({ success: false, error: `Error: ${error.message.substring(0, 25)}` });
  } else {
    res.status(500).send({ success: false, error: `Unknown error: ${String(error).substring(0, 25)}` });
  }
};
