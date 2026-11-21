import { currentRole } from '@/lib/session';
import { MANUAL_GRADE_LABEL } from '@/lib/manualGrade';
import { extractJson, missingBands } from '@/lib/gradeGuard';
import { normalizeForMatch, overallBand, wholeBand } from '@/lib/ieltsRubric';
import { findWritingPrompt } from '@/lib/writingPrompts';
import type { WritingFeedback, WritingPrompt, WritingSentenceFix } from '@/lib/types';

type Crit = 'task' | 'cc' | 'lr' | 'gra';

interface CriterionAssessment {
  evidence: string;
  notesVi: string;
  band: number;
}

interface RawWritingGrade {
  attemptId?: string;
  checks: {
    relevance: 'relevant' | 'partly_off_topic' | 'unrelated';
    keyRequirementMet: boolean;
    keyRequirementNoteVi: string;
    dataAccuracy: 'accurate' | 'minor_errors' | 'major_errors' | 'not_applicable';
    noteForm: boolean;
    copiedFromPrompt: boolean;
    containsInstructionsToGrader: boolean;
  };
  assessment: Record<Crit, CriterionAssessment>;
  summaryVi: string;
  strengthsVi: string[];
  prioritiesVi: string[];
  sentenceFixes: WritingSentenceFix[];
  upgradedParagraphs: { label: string; original: string; upgraded: string; noteVi: string }[];
  suggestedVocab: { word: string; pos: string; vi: string; context: string }[];
}

function finalizeWritingGrade(
  raw: RawWritingGrade,
  prompt: WritingPrompt,
  essay: string,
  wordCount: number,
  modelLabel: string,
): WritingFeedback {
  let task = wholeBand(raw.assessment?.task?.band);
  let cc = wholeBand(raw.assessment?.cc?.band);
  let lr = wholeBand(raw.assessment?.lr?.band);
  let gra = wholeBand(raw.assessment?.gra?.band);
  const taskName = prompt.task === 'task1' ? 'Task Achievement' : 'Task Response';
  const notes: string[] = [];
  const cap = (limit: number, why: string) => {
    if (task > limit) {
      notes.push(`${taskName} capped at Band ${limit}: ${why}`);
      task = limit;
    }
  };

  const c = raw.checks;
  if (wordCount <= 20) {
    task = cc = lr = gra = 1;
    notes.push('Responses of 20 words or fewer receive Band 1 under IELTS regulations.');
  } else {
    if (c?.relevance === 'unrelated') cap(1, 'content is unrelated to the prompt.');
    else if (c?.relevance === 'partly_off_topic') cap(5, 'part of the response is off-topic.');
    if (c && !c.keyRequirementMet) {
      cap(5, prompt.task === 'task1' ? 'no clear overview of main trends or features.' : 'position is unclear or parts of the prompt were not addressed.');
    }
    if (prompt.task === 'task1' && c?.dataAccuracy === 'major_errors') cap(5, 'major inaccuracies in reported figures/data.');
    if (c?.noteForm) cap(5, 'written in bullet points or note form instead of connected paragraphs.');
    if (wordCount < prompt.minWords) notes.push(`Word count is ${wordCount}/${prompt.minWords} — being under length penalises ${taskName}.`);
    if (c?.copiedFromPrompt) notes.push('Text copied from the prompt or generic memorised templates does not count as your own language.');
  }
  if (c?.containsInstructionsToGrader) notes.push('Text addressed to the examiner/grader was ignored.');

  // Keep only fixes that match the exact essay text so inline highlights never drift
  const normEssay = normalizeForMatch(essay);
  const fixesIn = Array.isArray(raw.sentenceFixes) ? raw.sentenceFixes : [];
  const sentenceFixes = fixesIn.filter(f => f?.original?.trim() && f?.improved?.trim() && normEssay.includes(normalizeForMatch(f.original)));
  const dropped = fixesIn.length - sentenceFixes.length;
  if (dropped > 0) notes.push(`Filtered out ${dropped} suggested fix(es) that did not match the exact wording of your essay.`);
  const upgradedParagraphs = (Array.isArray(raw.upgradedParagraphs) ? raw.upgradedParagraphs : []).filter(pg => {
    const head = normalizeForMatch(pg?.original ?? '').slice(0, 40);
    return head.length > 0 && normEssay.includes(head);
  });

  return {
    scores: { task, cc, lr, gra, overall: overallBand([task, cc, lr, gra]) },
    gradedBy: modelLabel,
    gradingNotesVi: notes,
    summaryVi: raw.summaryVi ?? '',
    strengthsVi: Array.isArray(raw.strengthsVi) ? raw.strengthsVi : [],
    prioritiesVi: Array.isArray(raw.prioritiesVi) ? raw.prioritiesVi : [],
    criteriaNotesVi: {
      task: raw.assessment?.task?.notesVi ?? '',
      cc: raw.assessment?.cc?.notesVi ?? '',
      lr: raw.assessment?.lr?.notesVi ?? '',
      gra: raw.assessment?.gra?.notesVi ?? '',
    },
    sentenceFixes,
    upgradedParagraphs,
    suggestedVocab: Array.isArray(raw.suggestedVocab) ? raw.suggestedVocab : [],
  };
}

const WRITING_CRITERIA = ['task', 'cc', 'lr', 'gra'] as const;

export async function POST(req: Request) {
  if ((await currentRole()) !== 'learner') {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { promptId?: string; prompt?: { id?: string }; essay?: string; attemptId?: string; manualJson?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  // Always load the prompt from the server store rather than trusting client-supplied prompt data
  const promptId = body.promptId ?? body.prompt?.id;
  const prompt = promptId ? findWritingPrompt(promptId) : undefined;
  const essay = body.essay?.trim() ?? '';
  if (!prompt || !essay) {
    return Response.json({ error: 'Missing prompt or essay text.' }, { status: 400 });
  }

  const wordCount = essay.split(/\s+/).filter(Boolean).length;

  // Kết quả người học dán từ Gemini (thanh Gemini của Chrome / gemini.google.com); app không tự gọi model nào
  if (typeof body.manualJson === 'string') {
    const cleaned = extractJson(body.manualJson);
    let raw: RawWritingGrade | null = null;
    try {
      raw = JSON.parse(cleaned) as RawWritingGrade;
    } catch {
      raw = null;
    }
    if (!raw || typeof raw !== 'object' || !raw.assessment) {
      return Response.json(
        { error: 'This is not a complete grading result. If Gemini’s JSON stops in the middle, ask it to send the complete JSON again; then click the copy icon on the JSON box and paste here.' },
        { status: 400 },
      );
    }
    const missing = missingBands(raw.assessment, WRITING_CRITERIA);
    if (missing.length) {
      return Response.json(
        {
          error: `The pasted JSON has no band score for ${missing.join(', ')}. It may have been cut off — copy the entire JSON block from Gemini and try again.`,
        },
        { status: 400 },
      );
    }

    if (body.attemptId && raw.attemptId && raw.attemptId.trim() !== body.attemptId.trim()) {
      return Response.json(
        { error: 'This JSON result belongs to a different essay (attempt ID mismatch). Please grade and paste the result for the current essay.' },
        { status: 400 },
      );
    }

    if (!raw.attemptId?.trim() && wordCount >= 30) {
      const normEssay = normalizeForMatch(essay);
      const fixesIn = Array.isArray(raw.sentenceFixes) ? raw.sentenceFixes : [];
      const parasIn = Array.isArray(raw.upgradedParagraphs) ? raw.upgradedParagraphs : [];
      if (fixesIn.length > 0 || parasIn.length > 0) {
        const hasFixMatch = fixesIn.some(f => f?.original?.trim() && normEssay.includes(normalizeForMatch(f.original)));
        const hasParaMatch = parasIn.some(pg => {
          const head = normalizeForMatch(pg?.original ?? '').slice(0, 40);
          return head.length > 0 && normEssay.includes(head);
        });
        if (!hasFixMatch && !hasParaMatch) {
          return Response.json(
            { error: 'Quoted sentences in the JSON do not match this essay. You may have pasted the result from a different submission.' },
            { status: 400 },
          );
        }
      }
    }

    const feedback = finalizeWritingGrade(raw, prompt, essay, wordCount, MANUAL_GRADE_LABEL);
    return Response.json({ feedback, model: MANUAL_GRADE_LABEL });
  }

  return Response.json(
    { error: 'Paste the grading JSON from Gemini — follow the steps under “Grade your essay with Gemini”.' },
    { status: 400 },
  );
}
