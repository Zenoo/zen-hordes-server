import { writeFileSync } from 'fs';
import { join } from 'path';
import '../src/routes/update.route'; // Import to register routes
import { generateOpenApiDocument } from '../src/utils/api/openapi';

const openApiDocument = generateOpenApiDocument();

const outputPath = join(__dirname, '../openapi.json');
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log(`OpenAPI specification generated at: ${outputPath}`);
