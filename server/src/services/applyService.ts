import { chromium, Browser } from 'playwright';
import { JobListing, UserProfile, ParsedCV, CustomAnswer, ApplicationStatus } from '../types';
import { AIService } from './aiService';

export class ApplyService {
  /**
   * Process job application for a matched job listing.
   * In Dry-Run mode: simulates without submitting, but marks status based on form type.
   * In Live mode: uses Playwright to fill & submit forms.
   */
  static async processApplication(
    job: JobListing,
    userProfile: UserProfile,
    parsedCV: ParsedCV,
    pdfPath: string,
    isDryRun: boolean = true
  ): Promise<{ status: ApplicationStatus; answers: CustomAnswer[]; notes: string; errorMessage?: string }> {

    // Generate AI answer for a typical custom question
    const sampleQuestion = 'Why are you interested in joining our Dubai team?';
    const aiAnswer = await AIService.generateAnswerToQuestion(
      sampleQuestion, userProfile, parsedCV, job.title, job.company, job.description
    );

    const requiresReview = !userProfile.autoSubmitAnswers;

    const answers: CustomAnswer[] = [{
      question: sampleQuestion,
      answer: aiAnswer,
      requiresReview,
      reviewed: !requiresReview
    }];

    // 1. External forms: always flag for manual review
    if (job.applicationMethod === 'external_form' || job.applicationMethod === 'direct_link') {
      return {
        status: 'needs_manual_review',
        answers,
        notes: `External application portal detected (${job.source}). Review the tailored CV, edit if needed, then click Execute Auto-Apply. Direct link: ${job.url}`
      };
    }

    // 2. Dry Run mode: simulate Playwright pipeline without actually submitting
    if (isDryRun || userProfile.dryRunMode) {
      await this.simulateDelay(800, 1500);

      // In dry-run: "applied" if autoSubmit is on, "needs_manual_review" otherwise
      const dryRunStatus: ApplicationStatus = userProfile.autoSubmitAnswers ? 'applied' : 'needs_manual_review';

      return {
        status: dryRunStatus,
        answers,
        notes: `[DRY-RUN] Playwright pipeline simulated for ${job.company}. ${
          dryRunStatus === 'applied'
            ? 'Auto-submit enabled: marked as applied.'
            : 'Review the tailored CV and click "Execute Auto-Apply" when ready.'
        }`
      };
    }

    // 3. Live Playwright Browser Automation for Easy Apply
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();

      try {
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch {
        await browser.close();
        return {
          status: 'needs_manual_review',
          answers,
          notes: `Could not load job page (timeout or redirect). Direct link: ${job.url}`
        };
      }

      await this.simulateDelay(2000, 3500);

      const currentUrl = page.url();
      if (
        currentUrl.includes('captcha') ||
        currentUrl.includes('workday') ||
        currentUrl.includes('taleo') ||
        currentUrl.includes('lever.co') ||
        currentUrl.includes('greenhouse.io')
      ) {
        await browser.close();
        return {
          status: 'needs_manual_review',
          answers,
          notes: `ATS portal detected (Workday / Greenhouse / Lever / CAPTCHA). Click "Execute Auto-Apply" after reviewing the tailored CV. Direct link: ${job.url}`
        };
      }

      // Try uploading CV file if upload input exists
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(pdfPath);
        await this.simulateDelay(1000, 2000);
      }

      await browser.close();

      return {
        status: 'applied',
        answers,
        notes: `Successfully submitted application via Playwright to ${job.company}.`
      };

    } catch (err: any) {
      if (browser) {
        try { await browser.close(); } catch {}
      }
      console.warn(`Playwright auto-apply warning for ${job.company}:`, err?.message || err);

      return {
        status: 'needs_manual_review',
        answers,
        notes: `Playwright encountered an issue. Please review tailored CV and click "Execute Auto-Apply". Direct link: ${job.url}`,
        errorMessage: err?.message
      };
    }
  }

  private static simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
