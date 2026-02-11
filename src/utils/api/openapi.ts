import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import packageJson from '../../../package.json' with { type: 'json' };

// Extend Zod with OpenAPI methods - must be called before any schemas are created
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: packageJson.version,
      title: 'Zen Hordes Server API',
      description: 'API for the Zen Hordes browser extension',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  });
};
