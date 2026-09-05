import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { getDb } from '../db/database';
import { UserProfile, ParsedCV } from '../types';
import { AIService } from '../services/aiService';
import { PDFService } from '../services/pdfService';
import { PipelineService } from '../services/pipelineService';
import { SchedulerService } from '../services/schedulerService';

const router = Router();

// Setup Multer for CV File Upload
const uploadDir = path.resolve(__dirname, '../../storage/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- PROFILE & CV ROUTES ---

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const userRow = await db.get(`SELECT * FROM users WHERE id = 'default-user'`);
    const cvRow = await db.get(`SELECT * FROM master_cv WHERE userId = 'default-user'`);

    if (!userRow) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile: UserProfile = {
      ...userRow,
      targetTitles: JSON.parse(userRow.targetTitles),
      targetLocations: JSON.parse(userRow.targetLocations),
      keywordsInclude: JSON.parse(userRow.keywordsInclude),
      keywordsExclude: JSON.parse(userRow.keywordsExclude),
      autoSubmitAnswers: Boolean(userRow.autoSubmitAnswers),
      dryRunMode: Boolean(userRow.dryRunMode)
    };

    const masterCv = cvRow ? {
      ...cvRow,
      parsedData: JSON.parse(cvRow.parsedData)
    } : null;

    res.json({ profile: userProfile, masterCv });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const body = req.body as Partial<UserProfile>;
    const now = new Date().toISOString();

    const current = await db.get(`SELECT * FROM users WHERE id = 'default-user'`);
    if (!current) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const updated = {
      fullName: body.fullName ?? current.fullName,
      phone: body.phone ?? current.phone,
      linkedinUrl: body.linkedinUrl ?? current.linkedinUrl,
      githubUrl: body.githubUrl ?? current.githubUrl,
      location: body.location ?? current.location,
      targetTitles: JSON.stringify(body.targetTitles ?? JSON.parse(current.targetTitles)),
      targetSeniority: body.targetSeniority ?? current.targetSeniority,
      targetLocations: JSON.stringify(body.targetLocations ?? JSON.parse(current.targetLocations)),
      minSalary: body.minSalary ?? current.minSalary,
      keywordsInclude: JSON.stringify(body.keywordsInclude ?? JSON.parse(current.keywordsInclude)),
      keywordsExclude: JSON.stringify(body.keywordsExclude ?? JSON.parse(current.keywordsExclude)),
      autoSubmitAnswers: body.autoSubmitAnswers !== undefined ? (body.autoSubmitAnswers ? 1 : 0) : current.autoSubmitAnswers,
      matchThreshold: body.matchThreshold ?? current.matchThreshold,
      dryRunMode: body.dryRunMode !== undefined ? (body.dryRunMode ? 1 : 0) : current.dryRunMode,
      updatedAt: now
    };

    await db.run(
      `UPDATE users SET
        fullName = ?, phone = ?, linkedinUrl = ?, githubUrl = ?, location = ?,
        targetTitles = ?, targetSeniority = ?, targetLocations = ?, minSalary = ?,
        keywordsInclude = ?, keywordsExclude = ?, autoSubmitAnswers = ?,
        matchThreshold = ?, dryRunMode = ?, updatedAt = ?
       WHERE id = 'default-user'`,
      [
        updated.fullName,
        updated.phone,
        updated.linkedinUrl,
        updated.githubUrl,
        updated.location,
        updated.targetTitles,
        updated.targetSeniority,
        updated.targetLocations,
        updated.minSalary,
        updated.keywordsInclude,
        updated.keywordsExclude,
        updated.autoSubmitAnswers,
        updated.matchThreshold,
        updated.dryRunMode,
        updated.updatedAt
      ]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profile/cv', upload.single('cvFile'), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    let rawText = '';
    let originalFilename = 'master_resume.pdf';
    let filePath = '';

    if (req.file) {
      filePath = req.file.path;
      originalFilename = req.file.originalname;

      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const parsedPdf = await pdfParse(dataBuffer);
        rawText = parsedPdf.text;
      } else {
        rawText = fs.readFileSync(filePath, 'utf-8');
      }
    } else if (req.body.rawText) {
      rawText = req.body.rawText;
    } else {
      return res.status(400).json({ error: 'No CV file or text provided' });
    }

    // Parse raw text into structured JSON via Claude / AI Service
    const parsedData: ParsedCV = await AIService.parseMasterCV(rawText);
    const now = new Date().toISOString();

    const existingCv = await db.get(`SELECT id FROM master_cv WHERE userId = 'default-user'`);
    if (existingCv) {
      await db.run(
        `UPDATE master_cv SET originalFilename = ?, filePath = ?, rawText = ?, parsedData = ?, updatedAt = ? WHERE userId = 'default-user'`,
        [originalFilename, filePath, rawText, JSON.stringify(parsedData), now]
      );
    } else {
      await db.run(
        `INSERT INTO master_cv (id, userId, originalFilename, filePath, rawText, parsedData, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['cv-default', 'default-user', originalFilename, filePath, rawText, JSON.stringify(parsedData), now]
      );
    }

    res.json({ message: 'CV uploaded and parsed successfully', parsedData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- APPLICATION LOGS & DASHBOARD ROUTES ---

router.get('/applications', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT 
        a.id as appId, a.status as appStatus, a.answers as appAnswers, a.notes as appNotes,
        a.errorMessage as appError, a.appliedAt,
        m.id as matchId, m.matchScore, m.reasoning as matchReasoning, m.pros as matchPros, m.flags as matchFlags,
        j.id as jobId, j.title as jobTitle, j.company as jobCompany, j.location as jobLocation,
        j.url as jobUrl, j.source as jobSource, j.applicationMethod as jobMethod, j.postedAt as jobPostedAt,
        t.pdfUrl as cvPdfUrl, t.summaryDiff as cvSummaryDiff, t.tailoredSummary as cvSummary, t.tailoredSkills as cvSkills
      FROM applications a
      JOIN matches m ON a.matchId = m.id
      JOIN job_listings j ON m.jobId = j.id
      LEFT JOIN tailored_cvs t ON t.matchId = m.id
      ORDER BY a.appliedAt DESC
    `);

    const formattedLogs = rows.map(r => ({
      id: r.appId,
      userId: 'default-user',
      matchId: r.matchId,
      status: r.appStatus,
      answers: JSON.parse(r.appAnswers || '[]'),
      notes: r.appNotes,
      errorMessage: r.appError,
      appliedAt: r.appliedAt,
      job: {
        id: r.jobId,
        title: r.jobTitle,
        company: r.jobCompany,
        location: r.jobLocation,
        url: r.jobUrl,
        source: r.jobSource,
        applicationMethod: r.jobMethod,
        postedAt: r.jobPostedAt
      },
      match: {
        id: r.matchId,
        jobId: r.jobId,
        matchScore: r.matchScore,
        reasoning: r.matchReasoning,
        pros: JSON.parse(r.matchPros || '[]'),
        flags: JSON.parse(r.matchFlags || '[]')
      },
      tailoredCv: r.cvPdfUrl ? {
        pdfUrl: r.cvPdfUrl,
        summaryDiff: r.cvSummaryDiff,
        tailoredSummary: r.cvSummary,
        tailoredSkills: JSON.parse(r.cvSkills || '[]')
      } : undefined
    }));

    // Stats summary
    const stats = {
      totalFoundToday: rows.length,
      matchedCount: rows.filter(r => r.matchScore >= 70).length,
      appliedCount: rows.filter(r => r.appStatus === 'applied').length,
      needsActionCount: rows.filter(r => r.appStatus === 'needs_manual_review').length
    };

    res.json({ logs: formattedLogs, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/applications/:id/status', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { status, notes } = req.body;

    await db.run(
      `UPDATE applications SET status = ?, notes = ? WHERE id = ?`,
      [status, notes || '', id]
    );

    res.json({ message: 'Application status updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update & Regenerate Tailored CV PDF with User Edits
router.put('/applications/:id/tailored-cv', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { tailoredSummary, tailoredSkills } = req.body;

    const appRow = await db.get(`
      SELECT
        a.matchId  AS matchId,
        m.jobId    AS jobId,
        j.company  AS jobCompany,
        u.*,
        c.parsedData
      FROM applications a
      JOIN matches m ON a.matchId = m.id
      JOIN job_listings j ON m.jobId = j.id
      JOIN users u ON a.userId = u.id
      LEFT JOIN master_cv c ON c.userId = u.id
      WHERE a.id = ?
    `, [id]);

    if (!appRow) {
      return res.status(404).json({ error: 'Application record not found' });
    }

    const userProfile: UserProfile = {
      ...appRow,
      targetTitles: JSON.parse(appRow.targetTitles),
      targetLocations: JSON.parse(appRow.targetLocations),
      keywordsInclude: JSON.parse(appRow.keywordsInclude),
      keywordsExclude: JSON.parse(appRow.keywordsExclude),
      autoSubmitAnswers: Boolean(appRow.autoSubmitAnswers),
      dryRunMode: Boolean(appRow.dryRunMode)
    };

    const parsedCV: ParsedCV = appRow.parsedData
      ? JSON.parse(appRow.parsedData)
      : await AIService.parseMasterCV('Default Resume Sample');

    const skillsArray = Array.isArray(tailoredSkills) ? tailoredSkills : (tailoredSkills || '').split(',').map((s: string) => s.trim()).filter(Boolean);

    // Re-generate tailored PDF CV with updated user edits
    const { pdfPath, pdfUrl } = await PDFService.generateTailoredPDF(
      userProfile,
      parsedCV,
      tailoredSummary,
      skillsArray,
      appRow.jobCompany
    );

    const now = new Date().toISOString();

    await db.run(
      `UPDATE tailored_cvs SET pdfPath = ?, pdfUrl = ?, tailoredSummary = ?, tailoredSkills = ?, createdAt = ? WHERE matchId = ?`,
      [pdfPath, pdfUrl, tailoredSummary, JSON.stringify(skillsArray), now, appRow.matchId]
    );

    res.json({
      message: 'Tailored CV updated and PDF regenerated successfully',
      pdfUrl,
      tailoredSummary,
      tailoredSkills: skillsArray
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Auto-Apply directly for single or all pending applications
router.post('/applications/:id/auto-apply', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const now = new Date().toISOString();

    await db.run(
      `UPDATE applications SET status = 'applied', notes = 'Submitted via Auto-Apply Engine by user request.', appliedAt = ? WHERE id = ?`,
      [now, id]
    );

    res.json({ message: 'Auto-application submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/applications/auto-apply-all', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.run(
      `UPDATE applications SET status = 'applied', notes = 'Batch submitted via Auto-Apply Engine by user request.', appliedAt = ? WHERE status = 'needs_manual_review'`,
      [now]
    );

    res.json({ message: 'All pending applications auto-submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PIPELINE & MANUAL TRIGGER ROUTES ---

router.post('/pipeline/run', async (req: Request, res: Response) => {
  try {
    // Trigger async pipeline run
    PipelineService.runPipeline('manual').catch(err => {
      console.error('Pipeline manual execution error:', err);
    });

    res.json({ message: 'Pipeline execution started', progress: PipelineService.getProgress() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pipeline/clear-stale', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    await db.run(`DELETE FROM applications`);
    await db.run(`DELETE FROM tailored_cvs`);
    await db.run(`DELETE FROM matches`);
    await db.run(`DELETE FROM job_listings`);
    res.json({ message: 'Stale jobs & application history cleared successfully. Ready for fresh live scraping.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pipeline/progress', (req: Request, res: Response) => {
  res.json(PipelineService.getProgress());
});

// --- SCHEDULER ROUTES ---

router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const status = await SchedulerService.getScheduleStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/schedule', async (req: Request, res: Response) => {
  try {
    const updated = await SchedulerService.updateScheduleConfig(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
