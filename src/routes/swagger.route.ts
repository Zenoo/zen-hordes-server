import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

// Import all route files to ensure OpenAPI registry is populated
import '../routes/maps.route.js';
import '../routes/town.route.js';
import '../routes/update.route.js';
import { generateOpenApiDocument } from '../utils/api/openapi.js';

const router = Router();

const openApiDocument = generateOpenApiDocument();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiDocument));

export const swaggerRouter = router;
