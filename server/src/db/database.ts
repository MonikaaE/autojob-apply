import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'autoapply.db');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await initDbSchema(dbInstance);
  return dbInstance;
}

async function initDbSchema(db: Database) {
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT,
      linkedinUrl TEXT,
      githubUrl TEXT,
      location TEXT,
      targetTitles TEXT NOT NULL, -- JSON array
      targetSeniority TEXT NOT NULL DEFAULT 'mid',
      targetLocations TEXT NOT NULL, -- JSON array
      minSalary REAL,
      keywordsInclude TEXT NOT NULL, -- JSON array
      keywordsExclude TEXT NOT NULL, -- JSON array
      autoSubmitAnswers INTEGER NOT NULL DEFAULT 0,
      matchThreshold INTEGER NOT NULL DEFAULT 70,
      dryRunMode INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Master CV table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS master_cv (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      originalFilename TEXT NOT NULL,
      filePath TEXT NOT NULL,
      rawText TEXT NOT NULL,
      parsedData TEXT NOT NULL, -- JSON
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  // Job Listings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS job_listings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      applicationMethod TEXT NOT NULL,
      dedupHash TEXT UNIQUE NOT NULL,
      postedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Matches table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      jobId TEXT NOT NULL,
      userId TEXT NOT NULL,
      matchScore INTEGER NOT NULL,
      reasoning TEXT NOT NULL,
      pros TEXT NOT NULL, -- JSON array
      flags TEXT NOT NULL, -- JSON array
      status TEXT NOT NULL DEFAULT 'matched',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(jobId) REFERENCES job_listings(id),
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  // Tailored CVs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tailored_cvs (
      id TEXT PRIMARY KEY,
      matchId TEXT NOT NULL,
      pdfPath TEXT NOT NULL,
      pdfUrl TEXT NOT NULL,
      summaryDiff TEXT NOT NULL,
      tailoredSummary TEXT NOT NULL,
      tailoredSkills TEXT NOT NULL, -- JSON array
      createdAt TEXT NOT NULL,
      FOREIGN KEY(matchId) REFERENCES matches(id)
    );
  `);

  // Applications Log table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      matchId TEXT NOT NULL,
      status TEXT NOT NULL, -- 'applied', 'needs_manual_review', 'skipped', 'failed'
      answers TEXT NOT NULL, -- JSON array
      notes TEXT,
      errorMessage TEXT,
      appliedAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(matchId) REFERENCES matches(id)
    );
  `);

  // Schedule Config table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_config (
      id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL DEFAULT 'Asia/Dubai',
      windowStart TEXT NOT NULL DEFAULT '05:00',
      windowEnd TEXT NOT NULL DEFAULT '08:00',
      enabled INTEGER NOT NULL DEFAULT 1,
      lastRunAt TEXT,
      nextRunAt TEXT
    );
  `);

  // Seed default user and schedule config if missing
  const defaultUser = await db.get(`SELECT id FROM users WHERE id = 'default-user'`);
  if (!defaultUser) {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO users (
        id, email, fullName, phone, linkedinUrl, githubUrl, location,
        targetTitles, targetSeniority, targetLocations, minSalary,
        keywordsInclude, keywordsExclude, autoSubmitAnswers, matchThreshold,
        dryRunMode, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'default-user',
        'jobseeker.dubai@example.com',
        'Alex Mercer',
        '+971 50 123 4567',
        'https://linkedin.com/in/alexmercer-dubai',
        'https://github.com/alexmercer',
        'Dubai, United Arab Emirates',
        JSON.stringify(['Software Engineer', 'Full Stack Developer', 'Frontend Engineer', 'Node.js Developer']),
        'senior',
        JSON.stringify(['Dubai', 'Abu Dhabi', 'United Arab Emirates', 'Remote (UAE)']),
        25000,
        JSON.stringify(['React', 'TypeScript', 'Node.js', 'Python', 'AWS']),
        JSON.stringify(['Crypto Scams', 'Unpaid Internship']),
        0, // 0 = default review required
        70, // 70 match threshold
        1, // 1 = dry run mode enabled by default
        now,
        now
      ]
    );
  }

  const defaultConfig = await db.get(`SELECT id FROM schedule_config WHERE id = 'default-config'`);
  if (!defaultConfig) {
    await db.run(
      `INSERT INTO schedule_config (id, timezone, windowStart, windowEnd, enabled) VALUES (?, ?, ?, ?, ?)`,
      ['default-config', 'Asia/Dubai', '05:00', '08:00', 1]
    );
  }
}
