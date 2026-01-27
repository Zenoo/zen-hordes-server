import 'dotenv/config';
import express from 'express';
import { updateRouter } from './routes/update.route';
import { swaggerRouter } from './routes/swagger.route';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/update', updateRouter);
app.use('/swagger', swaggerRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/swagger`);
});
