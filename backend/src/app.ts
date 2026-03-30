import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Import routes
import exerciseTaskRoutes from './routes/exerciseTask.routes';
import analyticsRoutes from './routes/analytics.routes';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ 
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ["GET", "POST", "PUT", "DELETE"],
  }));

  app.use(express.json());

  // API Routes
  app.use('/api/exercises/tasks', exerciseTaskRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Health Check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'UP' });
  });

  // Error Handling Middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    const statusCode = (err as any).statusCode || 500;
    res.status(statusCode).json({ 
      message: err.message || 'Something broke!' 
    });
  });

  return app;
}