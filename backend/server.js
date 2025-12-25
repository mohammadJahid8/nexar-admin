import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/index.js';
import { initDailyBillingJob } from './jobs/dailyBillingJob.js';


// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5012;

// Middleware
app.use(cors());

app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running successfully!!' });
});


app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);

  // Initialize daily billing job (runs at midnight)
  initDailyBillingJob();
});
