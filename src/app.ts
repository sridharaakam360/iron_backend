import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app: Application = express();

// Configure CORS origins (trim whitespace and ignore empty entries)
const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    exposedHeaders: ['Content-Type', 'Content-Length'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Log configured CORS origins to help with troubleshooting
logger.info(`Configured CORS origin(s): ${corsOrigins.join(', ')}`);

app.use(helmet());

app.use(compression());

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsOrigins.join(','));
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// Temporarily disable rate limiter for debugging
// const limiter = rateLimit({
//   windowMs: env.RATE_LIMIT_WINDOW_MS,
//   max: env.RATE_LIMIT_MAX_REQUESTS,
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api', limiter);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: `${env.APP_NAME} API Server`,
    version: env.API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

app.use(`/api/${env.API_VERSION}`, routes);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
