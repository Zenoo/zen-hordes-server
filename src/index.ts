import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { updateRouter } from './routes/update.route';
import { mapsRouter } from './routes/maps.route';
import { townRouter } from './routes/town.route';
import { swaggerRouter } from './routes/swagger.route';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/update', updateRouter);
app.use('/maps', mapsRouter);
app.use('/town', townRouter);
app.use('/swagger', swaggerRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/swagger`);
});
