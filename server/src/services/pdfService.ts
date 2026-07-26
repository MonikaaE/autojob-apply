import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ParsedCV, UserProfile } from '../types';

export class PDFService {
  /**
   * Generate an ATS-friendly, clean PDF resume tailored for a specific job application
   */
  static async generateTailoredPDF(
    userProfile: UserProfile,
    parsedCV: ParsedCV,
    tailoredSummary: string,
    tailoredSkills: string[],
    jobCompany: string
  ): Promise<{ pdfPath: string; pdfUrl: string }> {
    const storageDir = path.resolve(__dirname, '../../storage/cvs');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const filename = `CV_${userProfile.fullName.replace(/\s+/g, '_')}_${jobCompany.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.pdf`;
    const pdfPath = path.join(storageDir, filename);
    const pdfUrl = `/storage/cvs/${filename}`;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // --- HEADER ---
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(userProfile.fullName, { align: 'left' });

      doc.moveDown(0.2);

      const contactParts = [
        parsedCV.contactInfo?.email || userProfile.email,
        parsedCV.contactInfo?.phone || userProfile.phone,
        parsedCV.contactInfo?.location || userProfile.location || 'Dubai, UAE',
        userProfile.linkedinUrl
      ].filter(Boolean);

      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor('#475569')
        .text(contactParts.join(' | '), { align: 'left' });

      doc.moveDown(0.8);
      this.drawDivider(doc);

      // --- PROFESSIONAL SUMMARY ---
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('PROFESSIONAL SUMMARY');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(tailoredSummary, { align: 'justify', lineGap: 3 });

      // --- TECHNICAL SKILLS ---
      doc.moveDown(0.8);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('CORE SKILLS & TECHNOLOGIES');
      doc.moveDown(0.3);

      const skillsToPrint = tailoredSkills.length > 0 ? tailoredSkills : parsedCV.skills;
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(skillsToPrint.join(' • '), { lineGap: 3 });

      // --- WORK EXPERIENCE ---
      if (parsedCV.experience && parsedCV.experience.length > 0) {
        doc.moveDown(0.8);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('PROFESSIONAL EXPERIENCE');
        doc.moveDown(0.4);

        for (const exp of parsedCV.experience) {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(exp.role, { continued: true });
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('#64748b').text(` — ${exp.company} (${exp.startDate} - ${exp.endDate})`);
          
          if (exp.location) {
            doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text(exp.location);
          }

          doc.moveDown(0.2);

          for (const bullet of exp.description || []) {
            doc
              .fontSize(9.5)
              .font('Helvetica')
              .fillColor('#334155')
              .text(`•  ${bullet}`, { indent: 10, lineGap: 2 });
          }

          doc.moveDown(0.5);
        }
      }

      // --- EDUCATION & CERTIFICATIONS ---
      if (parsedCV.education && parsedCV.education.length > 0) {
        doc.moveDown(0.4);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('EDUCATION');
        doc.moveDown(0.3);

        for (const edu of parsedCV.education) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(`${edu.degree} in ${edu.fieldOfStudy || 'Computer Science'}`);
          doc
            .fontSize(9.5)
            .font('Helvetica')
            .fillColor('#64748b')
            .text(`${edu.institution}${edu.graduationYear ? ' (' + edu.graduationYear + ')' : ''}`);
          doc.moveDown(0.3);
        }
      }

      if (parsedCV.certifications && parsedCV.certifications.length > 0) {
        doc.moveDown(0.4);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('CERTIFICATIONS');
        doc.moveDown(0.3);
        doc.fontSize(9.5).font('Helvetica').fillColor('#334155').text(parsedCV.certifications.join(' • '));
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve({ pdfPath, pdfUrl });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    });
  }

  private static drawDivider(doc: typeof PDFDocument.prototype) {
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .stroke();
  }
}
