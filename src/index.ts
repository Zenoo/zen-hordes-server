import compression from 'compression';
import cors from 'cors';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import packageJson from '../package.json' with { type: 'json' };
import { LOGGER } from './context.js';
import { mapsRouter } from './routes/maps.route.js';
import { swaggerRouter } from './routes/swagger.route.js';
import { townRouter } from './routes/town.route.js';
import { updateRouter } from './routes/update.route.js';

dayjs.extend(customParseFormat);

// Validate required environment variables
const validateEnv = (): void => {
  const requiredEnvVars = ['API_APPKEY', 'DATABASE_URL'] as const;
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for rate limiting behind reverse proxies
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// CORS
app.use(cors());

// Compression middleware
app.use(compression());

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser with size limits
app.use(express.json({ limit: '1mb' }));

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Routes
app.get('/', (_req, res) => {
  res.json({ version: packageJson.version });
});

app.use('/update', updateRouter);
app.use('/maps', mapsRouter);
app.use('/town', townRouter);
app.use('/swagger', swaggerRouter);

// Start server
const server = app.listen(PORT, () => {
  LOGGER.log(`Server is running on port ${PORT}. Version: ${packageJson.version}`);
  LOGGER.log(`Swagger documentation available at /swagger`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  LOGGER.log(`\n${signal} received. Closing server gracefully...`);
  server.close(() => {
    LOGGER.log('Server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    LOGGER.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
