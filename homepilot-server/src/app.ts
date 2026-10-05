import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openApiSpec } from './config/openapi';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { PaymentController } from './controllers/payment.controller';

export function createApp(): Application {
  const app = express();

  if (env.trustProxy > 0) {
    app.set('trust proxy', env.trustProxy);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  );

  // Stripe requires the RAW request body to verify its webhook signature, so
  // this route is registered before the global JSON body parser and is
  // never touched by it.
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), PaymentController.webhook);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // NOTE: express-mongo-sanitize was deliberately removed here. It patches
  // req.query by reassigning it, which crashes ("Cannot set property query
  // of ... which has only a getter") on this Express version and would have
  // 500'd every POST/PATCH request. NoSQL-injection protection is instead
  // provided by Zod validation on every route (see validate.middleware.ts):
  // typed fields (strings/numbers/enums) can never carry a raw '$' operator
  // through to a Mongoose query.
  // Prevents HTTP parameter pollution (e.g. ?category=a&category=b being
  // read as an array where a single value was expected).
  app.use(hpp());

  if (!env.isProduction) {
    app.use(morgan('dev'));
  }

  // Global rate limit as a baseline defense; stricter limits are applied
  // per-route (see auth.routes.ts) for sensitive endpoints.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Cheap liveness check — used by uptime pingers to keep a free-tier host awake.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', routes);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
