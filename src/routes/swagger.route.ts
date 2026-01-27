import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { generateOpenApiDocument } from '../utils/openapi';

const router = Router();

const openApiDocument = generateOpenApiDocument();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiDocument));

export const swaggerRouter = router;
