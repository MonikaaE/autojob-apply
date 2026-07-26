import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { UserProfile, ParsedCV, PipelineProgress, ApplicationLog } from '../types';
import { AggregatorService } from './aggregatorService';
import { AIService } from './aiService';
import { PDFService } from './pdfService';
import { ApplyService } from './applyService';

export class PipelineService {
  private static currentProgress: PipelineProgress = {
    stage: 'idle',
    message: 'Pipeline ready',
    totalJobs: 0,
    matchedCount: 0,
    appliedCount: 0,
    manualCount: 0,
    skippedCount: 0,
    logs: []
  };

  public static getProgress(): PipelineProgress {
    return this.currentProgress;
  }

  private static logProgress(message: string, updateObj?: Partial<PipelineProgress>) {
    const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai' });
    const logLine = `[${timestamp} GST] ${message}`;
    console.log(logLine);

    this.currentProgress = {
      ...this.currentProgress,
      ...updateObj,
      message,
      logs: [logLine, ...this.currentProgress.logs].slice(0, 100)
    };
  }

  /**
   * Run the complete pipeline: fetch jobs -> match -> tailor -> apply -> log
   */
  static async runPipeline(triggerSource: 'scheduler' | 'manual' = 'manual'): Promise<PipelineProgress> {
    if (this.currentProgress.stage !== 'idle' && this.currentProgress.stage !== 'completed' && this.currentProgress.stage !== 'error') {
      return this.currentProgress;
    }

    const db = await getDb();
    const userRow = await db.get(`SELECT * FROM users WHERE id = 'default-user'`);
    if (!userRow) {
      throw new Error('Default user profile not found.');
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

    const cvRow = await db.get(`SELECT * FROM master_cv WHERE userId = 'default-user'`);
    let parsedCV: ParsedCV;

    if (cvRow && cvRow.parsedData) {
      parsedCV = JSON.parse(cvRow.parsedData);
    } else {
      // Use fallback default profile CV if user hasn't uploaded a custom PDF yet
      parsedCV = await AIService.parseMasterCV('Default Resume Sample');
    }

    // Reset Progress State
    this.currentProgress = {
      stage: 'aggregating',
      message: `Starting ${triggerSource} pipeline run for Dubai region...`,
      totalJobs: 0,
      matchedCount: 0,
      appliedCount: 0,
      manualCount: 0,
      skippedCount: 0,
      logs: []
    };

    try {
      // --- STAGE 1: AGGREGATE JOBS ---
      this.logProgress(`Aggregating live job listings (last 2 days) from LinkedIn...`, { stage: 'aggregating' });
      // Always scrape real-time jobs regardless of dryRun setting — dryRun only affects form submission
      const newJobs = await AggregatorService.fetchNewJobs(userProfile.targetTitles, 'Dubai', false);
      
      this.logProgress(`Found ${newJobs.length} new job listings (posted in last 2 days) in Dubai area.`, { totalJobs: newJobs.length });

      if (newJobs.length === 0) {
        this.logProgress('No new unapplied jobs found in this run cycle.', { stage: 'completed' });
        return this.currentProgress;
      }

      // --- STAGE 2: MATCHING ---
      this.logProgress(`Evaluating candidate fit & match scores with Claude AI engine...`, { stage: 'matching' });

      for (const job of newJobs) {
        // Check if already applied or matched previously
        const existingApp = await db.get(
          `SELECT a.id FROM applications a JOIN matches m ON a.matchId = m.id WHERE m.jobId = ?`,
          [job.id]
        );
        if (existingApp) {
          this.currentProgress.skippedCount++;
          this.logProgress(`Skipping ${job.title} at ${job.company} (already processed)`);
          continue;
        }

        const matchResult = await AIService.matchJob(
          job.title,
          job.company,
          job.location,
          job.description,
          userProfile,
          parsedCV
        );

        const matchId = uuidv4();
        const now = new Date().toISOString();
        const isMatched = matchResult.matchScore >= userProfile.matchThreshold;
        const status = isMatched ? 'matched' : 'skipped';

        await db.run(
          `INSERT INTO matches (id, jobId, userId, matchScore, reasoning, pros, flags, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            matchId,
            job.id,
            userProfile.id,
            matchResult.matchScore,
            matchResult.reasoning,
            JSON.stringify(matchResult.pros),
            JSON.stringify(matchResult.flags),
            status,
            now
          ]
        );

        if (!isMatched) {
          this.currentProgress.skippedCount++;
          this.logProgress(`Skipped ${job.title} at ${job.company} (Match Score: ${matchResult.matchScore}/100 < ${userProfile.matchThreshold} threshold)`);
          continue;
        }

        this.currentProgress.matchedCount++;
        this.logProgress(`Matched! ${job.title} at ${job.company} (Score: ${matchResult.matchScore}/100)`);

        // --- STAGE 3: CV TAILORING ---
        this.logProgress(`Tailoring ATS CV & generating custom PDF for ${job.company}...`, { stage: 'tailoring' });
        const tailoredData = await AIService.tailorCV(parsedCV, job.title, job.company, job.description);
        
        const { pdfPath, pdfUrl } = await PDFService.generateTailoredPDF(
          userProfile,
          parsedCV,
          tailoredData.tailoredSummary,
          tailoredData.tailoredSkills,
          job.company
        );

        const tailoredCvId = uuidv4();
        await db.run(
          `INSERT INTO tailored_cvs (id, matchId, pdfPath, pdfUrl, summaryDiff, tailoredSummary, tailoredSkills, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tailoredCvId,
            matchId,
            pdfPath,
            pdfUrl,
            tailoredData.summaryDiff,
            tailoredData.tailoredSummary,
            JSON.stringify(tailoredData.tailoredSkills),
            now
          ]
        );

        // --- STAGE 4: AUTO-APPLY ---
        this.logProgress(`Executing auto-application via Playwright engine...`, { stage: 'applying' });
        const applyResult = await ApplyService.processApplication(
          job,
          userProfile,
          parsedCV,
          pdfPath,
          userProfile.dryRunMode
        );

        const appId = uuidv4();
        await db.run(
          `INSERT INTO applications (id, userId, matchId, status, answers, notes, errorMessage, appliedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            appId,
            userProfile.id,
            matchId,
            applyResult.status,
            JSON.stringify(applyResult.answers),
            applyResult.notes,
            applyResult.errorMessage || null,
            now
          ]
        );

        if (applyResult.status === 'applied') {
          this.currentProgress.appliedCount++;
          this.logProgress(`Applied successfully to ${job.title} at ${job.company}!`);
        } else if (applyResult.status === 'needs_manual_review') {
          this.currentProgress.manualCount++;
          this.logProgress(`Needs Action: ${job.title} at ${job.company} (${applyResult.notes})`);
        } else {
          this.currentProgress.skippedCount++;
        }
      }

      this.logProgress(
        `Pipeline run complete! Matched: ${this.currentProgress.matchedCount}, Applied: ${this.currentProgress.appliedCount}, Manual: ${this.currentProgress.manualCount}`,
        { stage: 'completed' }
      );

      return this.currentProgress;
    } catch (err: any) {
      this.logProgress(`Pipeline Error: ${err?.message || err}`, { stage: 'error' });
      throw err;
    }
  }
}
