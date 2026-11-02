import jsPDF from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import type { ExamAttempt, Exam, Question } from '../types';
import type { QuestionGradingResult } from './scoringService';
import { gradeExamAttempt } from './scoringService';
import { db } from '../db';

/**
 * Formats seconds into human-readable minutes and seconds.
 */
function formatDuration(totalSecs: number): string {
  if (!totalSecs || totalSecs < 0) return '0s';
  const mins = Math.floor(totalSecs / 60);
  const secs = Math.floor(totalSecs % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

/**
 * Resolves station grading results if not explicitly provided.
 */
async function resolveStationResults(
  attempt: ExamAttempt,
  providedResults?: QuestionGradingResult[]
): Promise<{ exam?: Exam; results: QuestionGradingResult[] }> {
  if (providedResults && providedResults.length > 0) {
    try {
      if (typeof indexedDB !== 'undefined') {
        const exam = await db.exams.get(attempt.examId);
        return { exam, results: providedResults };
      }
    } catch {
      // Ignore if db unavailable in test/sandbox
    }
    return { results: providedResults };
  }

  // Load from IndexedDB
  try {
    if (typeof indexedDB !== 'undefined') {
      const exam = await db.exams.get(attempt.examId);
      const questions: Question[] = await db.questions
        .where('examId')
        .equals(attempt.examId)
        .sortBy('orderIndex');

      if (exam && questions.length > 0) {
        const { stationResults: rawResults } = gradeExamAttempt(
          exam,
          attempt.subjectName,
          questions,
          attempt.answers || {},
          attempt.startedAt,
          attempt.totalTimeSpentSeconds
        );

        // If student self-grading marks are present, override with student's evaluated marks
        const results = rawResults.map((sr) => {
          if (attempt.grades && attempt.grades[sr.question.id] !== undefined) {
            const selfGrade = attempt.grades[sr.question.id];
            const maxPts = sr.maxPoints || 1;
            const earned = Math.round(selfGrade * maxPts * 10) / 10;
            return {
              ...sr,
              earnedPoints: earned,
              isCorrect: selfGrade === 1,
              evaluationExplanation:
                selfGrade === 1
                  ? 'Candidate Self-Assessment: 1.0 pt (Fully Correct)'
                  : selfGrade === 0.5
                  ? 'Candidate Self-Assessment: 0.5 pt (Partially Correct)'
                  : 'Candidate Self-Assessment: 0.0 pt (Incorrect)',
            };
          }
          return sr;
        });

        return { exam, results };
      }
    }
  } catch (err) {
    console.warn('Could not load exam/questions from db for PDF:', err);
  }

  // If exam was deleted or stations not found, synthesize results from attempt.answers
  const syntheticResults: QuestionGradingResult[] = Object.entries(attempt.answers || {}).map(
    ([qId, ans], idx) => ({
      question: {
        id: qId,
        examId: attempt.examId,
        orderIndex: idx,
        type: 'spotter',
        questionText: `Station ${idx + 1}`,
        points: 1,
        explanation: '',
      },
      studentAnswer: ans,
      isCorrect: false,
      earnedPoints: 0,
      maxPoints: 1,
      correctAnswerSummary: 'Archived record',
      studentAnswerSummary: ans.typedAnswer || 'Completed',
    })
  );
  return { results: syntheticResults };
}

/**
 * Generates a clean, publication-grade formatted PDF report for an OSPE Exam Attempt.
 */
export async function generateExamAttemptPdf(
  attempt: ExamAttempt,
  stationResults?: QuestionGradingResult[]
): Promise<jsPDF> {
  const { results } = await resolveStationResults(attempt, stationResults);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const clrPrimaryBurgundy: [number, number, number] = [136, 19, 55]; // #881337
  const clrDarkSlate: [number, number, number] = [15, 23, 42]; // #0f172a
  const clrMutedText: [number, number, number] = [71, 85, 105]; // #475569
  const clrLightSlate: [number, number, number] = [248, 250, 252]; // #f8fafc
  const clrBorderSlate: [number, number, number] = [226, 232, 240]; // #e2e8f0
  const clrPassGreen: [number, number, number] = [5, 150, 105]; // #059669
  const clrFailRose: [number, number, number] = [225, 29, 72]; // #e11d48

  // 1. Top Decorative Brand Bar
  doc.setFillColor(...clrPrimaryBurgundy);
  doc.rect(0, 0, pageWidth, 5, 'F');

  let currentY = 14;

  // 2. Header & Medical Institution Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...clrPrimaryBurgundy);
  doc.text('SCRUB PRACTICAL · CLINICAL EXAMINATION SYSTEM', margin, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...clrMutedText);
  doc.text('OBJECTIVE STRUCTURED PRACTICAL EXAMINATION (OSPE) REPORT', margin, currentY);

  // Attempt ID / Date on right side
  const formattedDate = new Date(attempt.completedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Date: ${formattedDate}`, pageWidth - margin, currentY - 4, { align: 'right' });
  doc.text(`Record ID: OSPE-${attempt.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, currentY, {
    align: 'right',
  });

  currentY += 4;
  doc.setDrawColor(...clrBorderSlate);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // 3. Exam Title & Subject
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...clrDarkSlate);
  doc.text(attempt.examTitle, margin, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...clrPrimaryBurgundy);
  doc.text(`DISCIPLINE: ${attempt.subjectName.toUpperCase()}`, margin, currentY);

  currentY += 6;

  // 4. Score & Status Banner Card
  const bannerHeight = 22;
  const isPassed = attempt.passed;
  const bannerBg = isPassed ? [236, 253, 245] : [255, 241, 242]; // emerald-50 or rose-50
  const bannerBorder = isPassed ? [167, 243, 208] : [254, 205, 211];
  const bannerColor = isPassed ? clrPassGreen : clrFailRose;

  // Card background
  doc.setFillColor(bannerBg[0], bannerBg[1], bannerBg[2]);
  doc.setDrawColor(bannerBorder[0], bannerBorder[1], bannerBorder[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, bannerHeight, 2, 2, 'FD');

  // Status Badge Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  const statusText = isPassed ? 'PRACTICAL EXAMINATION PASSED' : 'REVISION RECOMMENDED';
  doc.text(statusText, margin + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...clrMutedText);
  const statusSubtitle = isPassed
    ? 'Candidate successfully met or exceeded the clinical competency threshold.'
    : 'Candidate scored below the passing standard. Target missed stations for clinical review.';
  doc.text(statusSubtitle, margin + 4, currentY + 12);

  // Total Score on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.text(`${attempt.percentage}%`, pageWidth - margin - 4, currentY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...clrMutedText);
  doc.text(
    `${attempt.score} / ${attempt.maxScore} Marks`,
    pageWidth - margin - 4,
    currentY + 13,
    { align: 'right' }
  );

  currentY += bannerHeight + 5;

  // 5. Four Key Summary KPI Blocks
  const kpiCount = 4;
  const kpiGap = 3;
  const kpiWidth = (contentWidth - kpiGap * (kpiCount - 1)) / kpiCount;
  const kpiHeight = 14;

  const correctCount = results.filter((r) => r.isCorrect).length;
  const missedCount = results.length - correctCount;
  const flaggedCount = results.filter((r) => r.studentAnswer?.isFlagged).length;

  const kpis = [
    { label: 'TOTAL STATIONS', value: `${results.length} Stations` },
    { label: 'ACCURACY', value: `${correctCount} Correct (${missedCount} Missed)` },
    { label: 'TIME SPENT', value: formatDuration(attempt.totalTimeSpentSeconds) },
    { label: 'FLAGGED STATIONS', value: `${flaggedCount} Flagged` },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + kpiGap);
    doc.setFillColor(clrLightSlate[0], clrLightSlate[1], clrLightSlate[2]);
    doc.setDrawColor(...clrBorderSlate);
    doc.setLineWidth(0.2);
    doc.roundedRect(kpiX, currentY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...clrMutedText);
    doc.text(kpi.label, kpiX + 3, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...clrDarkSlate);
    doc.text(kpi.value, kpiX + 3, currentY + 10);
  });

  currentY += kpiHeight + 6;

  // 6. Candidate Personal Study Notes (if present)
  if (attempt.notes && attempt.notes.trim()) {
    const notesContent = attempt.notes.trim();
    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.setLineWidth(0.3);

    // Calculate height needed for wrapped text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(notesContent, contentWidth - 8);
    const notesBoxHeight = 10 + splitNotes.length * 3.8;

    doc.roundedRect(margin, currentY, contentWidth, notesBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text('CANDIDATE PERSONAL STUDY NOTES & CLINICAL MNEMONICS:', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(69, 26, 3); // amber-950
    doc.text(splitNotes, margin + 4, currentY + 9);

    currentY += notesBoxHeight + 5;
  }

  // 7. Section Header for Station Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...clrDarkSlate);
  doc.text('STATION-BY-STATION CLINICAL PERFORMANCE BREAKDOWN', margin, currentY);

  currentY += 2;

  // 8. AutoTable for Station Results
  const tableData = results.map((res, idx) => {
    const stnNum = `Stn ${idx + 1}`;
    const stnType =
      res.question.type === 'spotter'
        ? 'Spotter'
        : res.question.type === 'image_mcq'
        ? 'Image MCQ'
        : res.question.type === 'clinical_mcq'
        ? 'Clinical'
        : 'MCQ';

    const promptText = res.question.title
      ? `${res.question.title}\n${res.question.questionText}`
      : res.question.questionText;

    const studentAns = res.studentAnswerSummary || 'Unanswered';
    const correctAns = res.correctAnswerSummary || '-';

    const resultLabel = res.isCorrect
      ? `PASS (${res.earnedPoints}/${res.maxPoints})`
      : `MISSED (0/${res.maxPoints})`;

    const timeSpent = res.studentAnswer
      ? `${res.studentAnswer.timeSpentSeconds}s`
      : '-';

    const flaggedTag = res.studentAnswer?.isFlagged ? ' [Flagged]' : '';

    return [
      stnNum + flaggedTag,
      stnType,
      promptText,
      studentAns,
      correctAns,
      resultLabel,
      timeSpent,
    ];
  });

  const tableOptions: UserOptions = {
    startY: currentY,
    head: [['Station', 'Type', 'Clinical Prompt & Vignette', 'Your Answer', 'Key / Acceptable Answers', 'Result', 'Time']],
    body: tableData,
    margin: { left: margin, right: margin, bottom: 16 },
    theme: 'grid',
    headStyles: {
      fillColor: clrPrimaryBurgundy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.5,
      textColor: clrDarkSlate,
      overflow: 'linebreak',
      valign: 'top',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold' },
      1: { cellWidth: 16 },
      2: { cellWidth: 54 },
      3: { cellWidth: 34 },
      4: { cellWidth: 34 },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 10, halign: 'right' },
    },
    didParseCell: (data) => {
      // Highlight result column (index 5)
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text.startsWith('PASS')) {
          data.cell.styles.textColor = clrPassGreen;
        } else {
          data.cell.styles.textColor = clrFailRose;
        }
      }
    },
    didDrawPage: (data) => {
      // Running Footer on every page
      const pageNumber = data.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...clrMutedText);

      // Footer divider line
      doc.setDrawColor(...clrBorderSlate);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

      // Left text
      doc.text(
        'Scrub Practical · Candidate Examination Record · Clinical Offline Simulation',
        margin,
        pageHeight - 6.5
      );

      // Right text: page count placeholder will be replaced after total pages known
      doc.text(
        `Page ${pageNumber}`,
        pageWidth - margin,
        pageHeight - 6.5,
        { align: 'right' }
      );
    },
  };

  autoTable(doc, tableOptions);

  // Second pass: Update total page counts in footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...clrMutedText);

    // Overwrite right footer with "Page X of Y"
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - margin - 25, pageHeight - 9, 25, 4, 'F');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  return doc;
}

/**
 * Downloads the generated PDF report directly to the candidate's device.
 */
export async function downloadExamAttemptPdf(
  attempt: ExamAttempt,
  stationResults?: QuestionGradingResult[],
  customFilename?: string
): Promise<string> {
  const doc = await generateExamAttemptPdf(attempt, stationResults);
  const cleanCode = attempt.examTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 30);
  const dateStr = new Date(attempt.completedAt).toISOString().split('T')[0];
  const finalFilename = customFilename || `OSPE_Report_${cleanCode}_${dateStr}.pdf`;

  doc.save(finalFilename);
  return finalFilename;
}

/**
 * Triggers printing of the generated PDF report via a print dialog.
 */
export async function printExamAttemptPdf(
  attempt: ExamAttempt,
  stationResults?: QuestionGradingResult[]
): Promise<void> {
  const doc = await generateExamAttemptPdf(attempt, stationResults);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  // Create invisible iframe for seamless print triggering
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  printIframe.src = blobUrl;

  document.body.appendChild(printIframe);

  printIframe.onload = () => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch {
      // Fallback if browser blocks iframe print
      window.open(blobUrl, '_blank');
    }
    // Cleanup blob after 60 seconds
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }, 60000);
  };
}
