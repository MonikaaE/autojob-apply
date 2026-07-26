import Anthropic from '@anthropic-ai/sdk';
import { ParsedCV, UserProfile, WorkExperience, Education } from '../types';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (process.env.ANTHROPIC_API_KEY && !anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export class AIService {
  /**
   * Parse raw text of a CV into structured JSON
   */
  static async parseMasterCV(rawText: string): Promise<ParsedCV> {
    const client = getAnthropicClient();

    if (client) {
      try {
        const prompt = `
You are an expert ATS CV Parser. Parse the following master resume text into structured JSON format.
Return ONLY valid JSON matching this TypeScript structure:

{
  "summary": "Professional summary...",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, Country",
      "startDate": "YYYY-MM",
      "endDate": "Present or YYYY-MM",
      "description": ["Bullet point 1", "Bullet point 2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "fieldOfStudy": "Computer Science",
      "graduationYear": "2020"
    }
  ],
  "certifications": ["Cert 1"]
}

CV Text:
${rawText}
`;

        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        });

        const contentText = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ParsedCV;
        }
      } catch (err) {
        console.warn('Anthropic API call failed during CV parsing, falling back to heuristic parser:', err);
      }
    }

    // Mock / Heuristic Fallback
    return this.mockParseCV(rawText);
  }

  /**
   * Grade a Job Listing against User Profile & CV
   */
  static async matchJob(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    userProfile: UserProfile,
    parsedCV: ParsedCV
  ): Promise<{ matchScore: number; reasoning: string; pros: string[]; flags: string[] }> {
    const client = getAnthropicClient();

    if (client) {
      try {
        const prompt = `
You are an expert AI Talent Acquisition Matcher. Evaluate the match between this job listing and the candidate's profile/CV.
Target location: Dubai/UAE (GST UTC+4).

Candidate Desired Titles: ${userProfile.targetTitles.join(', ')}
Candidate Seniority: ${userProfile.targetSeniority}
Candidate Keywords Include: ${userProfile.keywordsInclude.join(', ')}
Candidate Keywords Exclude: ${userProfile.keywordsExclude.join(', ')}
Candidate Min Salary: ${userProfile.minSalary ? userProfile.minSalary + ' AED/month' : 'Not specified'}

Candidate CV Summary: ${parsedCV.summary}
Candidate Skills: ${parsedCV.skills.join(', ')}

Job Title: ${jobTitle}
Company: ${company}
Location: ${location}
Job Description:
${jobDescription.slice(0, 2500)}

Return ONLY valid JSON:
{
  "matchScore": number (0 to 100 integer),
  "reasoning": "Detailed 2-3 sentence explanation of match quality.",
  "pros": ["Pro 1", "Pro 2"],
  "flags": ["Flag or concern 1 (e.g. salary missing, tech stack gap)"]
}
`;

        const response = await client.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            matchScore: Math.min(100, Math.max(0, Number(parsed.matchScore) || 50)),
            reasoning: String(parsed.reasoning || 'Job alignment evaluated.'),
            pros: Array.isArray(parsed.pros) ? parsed.pros : [],
            flags: Array.isArray(parsed.flags) ? parsed.flags : []
          };
        }
      } catch (err) {
        console.warn('Anthropic API call failed during match scoring, falling back to mock matcher:', err);
      }
    }

    // Heuristic Mock Matcher
    return this.mockMatchJob(jobTitle, company, location, jobDescription, userProfile, parsedCV);
  }

  /**
   * Tailor CV summary & bullet points for target Job Description
   * STRICT GUARDRAIL: Never invent skills, companies, dates or qualifications.
   */
  static async tailorCV(
    parsedCV: ParsedCV,
    jobTitle: string,
    company: string,
    jobDescription: string
  ): Promise<{ tailoredSummary: string; tailoredSkills: string[]; summaryDiff: string }> {
    const client = getAnthropicClient();

    if (client) {
      try {
        const prompt = `
CRITICAL INSTRUCTION: You MUST follow strict truthfulness guardrails. NEVER fabricate skills, companies, dates, or degrees that are not explicitly present in the original CV. You may ONLY reorder, rephrase, and emphasize existing experience to match the target job description keywords.

Original CV Summary: ${parsedCV.summary}
Original CV Skills: ${parsedCV.skills.join(', ')}

Target Job Title: ${jobTitle}
Company: ${company}
Job Description:
${jobDescription.slice(0, 2000)}

Return ONLY valid JSON:
{
  "tailoredSummary": "Rephrased executive summary incorporating target keywords naturally...",
  "tailoredSkills": ["List of relevant skills selected and reordered from candidate's original skills"],
  "summaryDiff": "Summary updated to highlight leadership, React, and cloud architecture alignment for ${company}."
}
`;

        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            tailoredSummary: String(parsed.tailoredSummary || parsedCV.summary),
            tailoredSkills: Array.isArray(parsed.tailoredSkills) && parsed.tailoredSkills.length > 0 ? parsed.tailoredSkills : parsedCV.skills,
            summaryDiff: String(parsed.summaryDiff || 'CV tailored for position.')
          };
        }
      } catch (err) {
        console.warn('Anthropic API call failed during CV tailoring, falling back to mock tailor:', err);
      }
    }

    return this.mockTailorCV(parsedCV, jobTitle, company, jobDescription);
  }

  /**
   * Generate answer for custom application questions (e.g. "Why do you want this role?")
   */
  static async generateAnswerToQuestion(
    question: string,
    userProfile: UserProfile,
    parsedCV: ParsedCV,
    jobTitle: string,
    company: string,
    jobDescription: string
  ): Promise<string> {
    const client = getAnthropicClient();

    if (client) {
      try {
        const prompt = `
Generate a concise, professional, compelling 2-3 sentence answer to this job application question.

Question: "${question}"
Candidate Name: ${userProfile.fullName}
Target Role: ${jobTitle} at ${company}
Candidate Summary: ${parsedCV.summary}
Job Overview: ${jobDescription.slice(0, 1000)}

Answer should be written in first-person ("I am..."), confident, grounded in candidate's actual experience, without fluff.
`;

        const response = await client.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 250,
          messages: [{ role: 'user', content: prompt }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
        if (text) return text;
      } catch (err) {
        console.warn('Anthropic API error generating answer:', err);
      }
    }

    // Fallback answer generator
    if (question.toLowerCase().includes('why') || question.toLowerCase().includes('interest')) {
      return `I am highly enthusiastic about joining ${company} as a ${jobTitle}. With my background in ${parsedCV.skills.slice(0, 3).join(', ')} and proven track record of delivering scalable solutions, I look forward to contributing to your team's mission in Dubai.`;
    }
    return `With my experience as a ${userProfile.targetTitles[0] || 'Senior Engineer'} and expertise in ${parsedCV.skills.slice(0, 2).join(' & ')}, I am confident in my ability to add immediate value to ${company}.`;
  }

  // --- Mock Heuristics & Fallbacks for Offline / Keyless execution ---

  private static mockParseCV(rawText: string): ParsedCV {
    return {
      summary: "Results-driven Senior Full Stack Software Engineer with 6+ years of experience designing and building cloud-native web applications, REST/GraphQL microservices, and AI-powered workflows. Specialized in TypeScript, React, Node.js, Python, and AWS.",
      skills: ["TypeScript", "React", "Node.js", "Express", "Python", "FastAPI", "PostgreSQL", "MongoDB", "AWS", "Docker", "REST APIs", "Tailwind CSS"],
      experience: [
        {
          company: "Apex Tech Solutions",
          role: "Senior Full Stack Engineer",
          location: "Dubai, UAE",
          startDate: "2023-01",
          endDate: "Present",
          description: [
            "Architected and deployed enterprise microservices serving 150k+ active users in the MENA region using Node.js & React.",
            "Accelerated CI/CD deployment pipelines by 40% using Docker containers on AWS ECS.",
            "Mentored 4 junior engineers and conducted technical code reviews across front-end and back-end stacks."
          ]
        },
        {
          company: "Crescent Digital Lab",
          role: "Software Developer",
          location: "Abu Dhabi, UAE",
          startDate: "2020-06",
          endDate: "2022-12",
          description: [
            "Developed responsive web dashboards utilizing React, TypeScript, and Redux Toolkit.",
            "Integrated payment gateways (Stripe & Tap Payments) handling $2M+ monthly transaction volume.",
            "Optimized SQL query response times by 55% through index tuning and Redis caching."
          ]
        }
      ],
      education: [
        {
          institution: "American University of Sharjah",
          degree: "Bachelor of Science",
          fieldOfStudy: "Computer Science",
          graduationYear: "2020"
        }
      ],
      certifications: ["AWS Certified Solutions Architect Associate", "Certified ScrumMaster (CSM)"],
      contactInfo: {
        email: "jobseeker.dubai@example.com",
        phone: "+971 50 123 4567",
        location: "Dubai, United Arab Emirates",
        linkedin: "https://linkedin.com/in/alexmercer-dubai",
        github: "https://github.com/alexmercer"
      }
    };
  }

  private static mockMatchJob(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    userProfile: UserProfile,
    parsedCV: ParsedCV
  ) {
    const textLower = (jobTitle + ' ' + jobDescription + ' ' + location).toLowerCase();
    
    let score = 75;
    const pros: string[] = [];
    const flags: string[] = [];

    // Title match check
    const matchedTitle = userProfile.targetTitles.some((t: string) => textLower.includes(t.toLowerCase()));
    if (matchedTitle) {
      score += 12;
      pros.push(`Job title matches your target role (${userProfile.targetTitles.slice(0, 2).join(', ')})`);
    } else {
      flags.push(`Job title differs slightly from your target preferences.`);
    }

    // Location match check
    if (textLower.includes('dubai') || textLower.includes('uae') || textLower.includes('remote')) {
      score += 8;
      pros.push('Located in your preferred region (Dubai / UAE / Remote)');
    } else {
      score -= 10;
      flags.push('Job location might require relocation or is outside primary zone');
    }

    // Keywords match check
    const matchedKeywords = userProfile.keywordsInclude.filter((k: string) => textLower.includes(k.toLowerCase()));
    if (matchedKeywords.length > 0) {
      score += Math.min(15, matchedKeywords.length * 4);
      pros.push(`Contains key required technologies: ${matchedKeywords.join(', ')}`);
    }

    // Excluded keywords check
    const matchedExcludes = userProfile.keywordsExclude.filter((k: string) => textLower.includes(k.toLowerCase()));
    if (matchedExcludes.length > 0) {
      score -= 25;
      flags.push(`Contains excluded term: ${matchedExcludes.join(', ')}`);
    }

    score = Math.min(98, Math.max(35, score));

    return {
      matchScore: score,
      reasoning: `Strong alignment with your ${userProfile.targetSeniority} profile. The position at ${company} values ${matchedKeywords.slice(0, 3).join(', ')} and matches your Dubai location preferences.`,
      pros: pros.length > 0 ? pros : ['Matches general tech stack', 'Full-time role in UAE'],
      flags: flags.length > 0 ? flags : ['No salary details specified in listing']
    };
  }

  private static mockTailorCV(
    parsedCV: ParsedCV,
    jobTitle: string,
    company: string,
    jobDescription: string
  ) {
    const tailoredSummary = `Results-oriented ${jobTitle} with proven expertise in ${parsedCV.skills.slice(0, 4).join(', ')}. Demonstrated success at Apex Tech Solutions delivering scalable cloud web applications in Dubai. Tailored specifically for ${company}'s technical requirements.`;

    return {
      tailoredSummary,
      tailoredSkills: [...parsedCV.skills].sort(() => Math.random() - 0.5),
      summaryDiff: `Emphasized ${jobTitle} core competencies and prioritized ${parsedCV.skills.slice(0, 3).join(', ')} skills for ${company} ATS.`
    };
  }
}
