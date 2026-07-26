import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { JobListing, JobSource, ApplicationMethod } from '../types';

export class AggregatorService {
  /**
   * Calculate SHA-256 deduplication hash for a job listing
   */
  static generateDedupHash(company: string, title: string, location: string): string {
    const raw = `${company.trim().toLowerCase()}_${title.trim().toLowerCase()}_${location.trim().toLowerCase()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Fetch REAL-TIME live jobs posted in the LAST 2 DAYS (48 hours)
   */
  static async fetchNewJobs(searchTitles: string[], location: string = 'Dubai', isDryRun: boolean = false): Promise<JobListing[]> {
    const db = await getDb();
    const fetchedListings: Array<Omit<JobListing, 'id' | 'createdAt'>> = [];

    const titlesToSearch = searchTitles.length > 0 ? searchTitles : ['Software Engineer', 'Full Stack Developer', 'Frontend Engineer'];

    console.log(`[Aggregator] Fetching recent jobs (last 2 days) for: ${titlesToSearch.join(', ')} in ${location}...`);

    for (const title of titlesToSearch) {
      try {
        const liveJobs = await this.fetchLiveLinkedInJobs(title, location);
        fetchedListings.push(...liveJobs);
      } catch (err: any) {
        console.warn(`[Aggregator Warning] Failed to fetch live jobs for "${title}":`, err?.message || err);
      }
    }

    const insertedJobs: JobListing[] = [];
    const now = new Date().toISOString();

    for (const item of fetchedListings) {
      const dedupHash = item.dedupHash || this.generateDedupHash(item.company, item.title, item.location);

      // Check if job already exists in DB
      const existing = await db.get(`SELECT id FROM job_listings WHERE dedupHash = ?`, [dedupHash]);
      if (!existing) {
        const newJob: JobListing = {
          id: uuidv4(),
          title: item.title,
          company: item.company,
          location: item.location,
          description: item.description,
          url: item.url,
          source: item.source,
          applicationMethod: item.applicationMethod,
          dedupHash,
          postedAt: item.postedAt || now,
          createdAt: now
        };

        await db.run(
          `INSERT INTO job_listings (id, title, company, location, description, url, source, applicationMethod, dedupHash, postedAt, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newJob.id,
            newJob.title,
            newJob.company,
            newJob.location,
            newJob.description,
            newJob.url,
            newJob.source,
            newJob.applicationMethod,
            newJob.dedupHash,
            newJob.postedAt,
            newJob.createdAt
          ]
        );

        insertedJobs.push(newJob);
      }
    }

    console.log(`[Aggregator] Successfully stored ${insertedJobs.length} new recent (last 2 days) jobs in DB.`);
    return insertedJobs;
  }

  /**
   * Scrape LinkedIn live job postings posted within the last 48 hours (2 days)
   */
  private static async fetchLiveLinkedInJobs(
    searchTitle: string,
    location: string = 'Dubai'
  ): Promise<Array<Omit<JobListing, 'id' | 'createdAt'>>> {
    // f_TPR=r172800 limits search to jobs posted in the last 2 days (48 hours / 172800 seconds)
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(searchTitle)}&location=${encodeURIComponent(location)}&f_TPR=r172800`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 12000
    });

    const html: string = response.data;
    const items: Array<Omit<JobListing, 'id' | 'createdAt'>> = [];

    const cardBlocks = html.split('class="base-card');
    const nowMs = Date.now();
    const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

    for (let i = 1; i < cardBlocks.length; i++) {
      const block = cardBlocks[i];

      const titleMatch = block.match(/<h3 class="base-search-card__title">[\s\S]*?\n?\s*([^\n<]+)\s*[\s\S]*?<\/h3>/);
      const companyMatch = block.match(/<a class="hidden-nested-link"[\s\S]*?>[\s\S]*?\n?\s*([^\n<]+)\s*[\s\S]*?<\/a>/);
      const locationMatch = block.match(/<span class="job-search-card__location">[\s\S]*?\n?\s*([^\n<]+)\s*[\s\S]*?<\/span>/);
      const urlMatch = block.match(/href="(https:\/\/[^"]+)"/);
      const dateMatch = block.match(/datetime="([^"]+)"/);
      const jobIdMatch = block.match(/urn:li:jobPosting:(\d+)/);

      if (titleMatch && companyMatch && urlMatch) {
        const title = titleMatch[1].trim();
        const company = companyMatch[1].trim();
        const loc = locationMatch ? locationMatch[1].trim() : 'Dubai, United Arab Emirates';
        const cleanUrl = urlMatch[1].split('?')[0];
        const jobId = jobIdMatch ? jobIdMatch[1] : null;

        // Verify recency filter (last 2 days / 48 hours)
        let postedAtStr = new Date().toISOString();
        if (dateMatch) {
          const parsedDate = new Date(dateMatch[1]);
          if (!isNaN(parsedDate.getTime())) {
            const ageMs = nowMs - parsedDate.getTime();
            if (ageMs > TWO_DAYS_MS + (12 * 3600 * 1000)) { // allow small buffer for timezone offsets
              continue; // Skip jobs older than 2 days!
            }
            postedAtStr = parsedDate.toISOString();
          }
        }

        // Fetch detailed description text
        let description = `${title} position at ${company} in ${loc}. Required skills: React, TypeScript, Node.js, REST APIs.`;
        if (jobId) {
          try {
            description = await this.fetchLinkedInJobDescription(jobId, title, company, loc);
          } catch (e) {
            // fallback
          }
        }

        const dedupHash = this.generateDedupHash(company, title, loc);

        items.push({
          title,
          company,
          location: loc,
          description,
          url: cleanUrl,
          source: 'LinkedIn',
          applicationMethod: 'easy_apply',
          dedupHash,
          postedAt: postedAtStr
        });

        // Limit per search to 5 recent jobs
        if (items.length >= 5) break;
      }
    }

    return items;
  }

  /**
   * Fetch full job description text for a specific LinkedIn job ID
   */
  private static async fetchLinkedInJobDescription(jobId: string, title: string, company: string, location: string): Promise<string> {
    const detailUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

    const res = await axios.get(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const html: string = res.data;
    const descMatch = html.match(/<div class="show-more-less-html__markup[^"]*">([\s\S]*?)<\/div>/);
    if (descMatch) {
      const cleanText = descMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanText.length > 50) {
        return cleanText;
      }
    }

    return `${title} role at ${company} in ${location}. Full time position handling software development and system architecture.`;
  }
}
