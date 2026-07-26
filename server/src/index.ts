import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRoutes from './routes/apiRoutes';
import { getDb } from './db/database';
import { SchedulerService } from './services/schedulerService';

dotenv.config();

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve storage files with correct Content-Disposition for PDF download
const storagePath = path.resolve(__dirname, '../storage');

// Explicit PDF download route — forces browser file-save dialog
app.get('/storage/cvs/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(storagePath, 'cvs', filename);
  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'PDF not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filePath);
});

// Serve other storage files normally
app.use('/storage', express.static(storagePath));

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'AutoApply Engine', timezone: 'Asia/Dubai (GST UTC+4)' });
});

async function startServer(port: number) {
  try {
    await getDb();
    console.log('[Database] SQLite initialized successfully.');

    await SchedulerService.initScheduler();
    console.log('[Scheduler] Dubai auto-run window scheduler initialized.');

    const server = app.listen(port, () => {
      console.log(`🚀 AutoApply Backend Server running on http://localhost:${port}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${port} is already in use by a running instance of AutoApply.`);
        console.warn(`💡 Your backend API is ALREADY active on http://localhost:${port}.`);
      } else {
        console.error('Server error:', err);
      }
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer(DEFAULT_PORT);
