import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app: Application = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

app.use(helmet());

app.use(compression());

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

// Temporarily disable rate limiter for debugging
// const limiter = rateLimit({
//   windowMs: env.RATE_LIMIT_WINDOW_MS,
//   max: env.RATE_LIMIT_MAX_REQUESTS,
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api', limiter);

app.get('/', (req, res) => {
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
