import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import addressesRouter from './routes/addresses.js';
import alertsRouter from './routes/alerts.js';
import alertEventsRouter from './routes/alertEvents.js';
import statusRouter from './routes/status.js';
import notificationConfigRouter from './routes/notificationConfig.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'koin-ping-backend'
  });
});


app.use('/api/addresses', addressesRouter);
app.use('/api/addresses', alertsRouter); // Alert routes include addressId in path
app.use('/api/alerts', alertsRouter); // Direct alert operations (PATCH, DELETE)
app.use('/api/alert-events', alertEventsRouter);
app.use('/api/status', statusRouter);
app.use('/api/notification-config', notificationConfigRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

