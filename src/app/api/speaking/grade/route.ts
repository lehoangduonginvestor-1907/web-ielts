import { currentRole } from '@/lib/session';
import { MANUAL_GRADE_LABEL } from '@/lib/manualGrade';
import { extractJson, missingBands } from '@/lib/gradeGuard';
import { overallBand, wholeBand } from '@/lib/ieltsRubric';
import { findSpeakingTopic } from '@/lib/speakingTopics';
import type { SpeakingFeedback, SpeakingMode, SpeakingPartNum, SpeakingSentenceFix, SpeakingTimelineMark } from '@/lib/types';

const SPEAKING_CRITERIA = ['fc', 'lr', 'gra', 'p'] as const;

type Crit = 'fc' | 'lr' | 'gra' | 'p';

interface CriterionAssessment {
  evidence: string;
  notesVi: string;
  band: number;
}

interface RawSpeakingGrade {
  attemptId?: string;
  listeningCheck: {
    candidateAudible: boolean;
    examinerAudible: boolean;
    candidateSpeakingSeconds: number;
    audioIssuesVi: string;
  };
  assessment: Record<Crit, CriterionAssessment>;
  flags: { memorisedDelivery: boolean; nonEnglishSpeech: boolean; offTopic: boolean };
  confidence: 'low' | 'medium' | 'high';
  confidenceVi: string;
  summaryVi: string;
  strengthsVi: string[];
  prioritiesVi: string[];
  utteranceFixes: SpeakingSentenceFix[];
  pronunciationTipsVi: string[];
  suggestedVocab: { word: string; pos: string; vi: string; context: string }[];
}

function finalizeSpeakingGrade(
  raw: RawSpeakingGrade,
  opts: { parts: SpeakingPartNum[]; typedAnswers: number; recordingKind: 'conversation' | 'candidate' },
  modelLabel: string,
): { feedback?: SpeakingFeedback; error?: string; status?: number } {
  if (!raw?.assessment || raw.listeningCheck?.candidateAudible === false) {
    const why = raw?.listeningCheck?.audioIssuesVi?.trim();
    return {
      error: `Gemini could not hear your voice clearly enough in the recording to grade it.${why ? ` (${why})` : ''} Check your microphone and try practicing again.`,
      status: 422,
    };
  }

  const fc = wholeBand(raw.assessment.fc?.band);
  const lr = wholeBand(raw.assessment.lr?.band);
  const gra = wholeBand(raw.assessment.gra?.band);
  const p = wholeBand(raw.assessment.p?.band);

  const notes: string[] = [];
  let confidence = raw.confidence ?? 'medium';
  const spoke = raw.listeningCheck?.candidateSpeakingSeconds ?? 0;
  if (spoke > 0 && spoke < 60) {
    confidence = 'low';
    notes.push(`You spoke for only about ${spoke} seconds — too brief for a reliable band estimate.`);
  }
  if (!opts.parts.includes(3)) notes.push('This session did not include Part 3, so there is limited evidence to confirm Band 7+ (abstract discussion).');
  if (opts.typedAnswers) notes.push(`${opts.typedAnswers} typed answer(s) were excluded because IELTS Speaking grades spoken performance only.`);
  if (opts.recordingKind === 'candidate') notes.push('This recording contains only your voice (without the examiner audio), so question relevance was checked against the topic prompt list.');
  if (raw.flags?.memorisedDelivery) notes.push('Some responses sounded memorised or recited — these are not rewarded with higher bands.');
  if (raw.flags?.nonEnglishSpeech) notes.push('Non-English speech was detected and excluded from the assessment.');
  if (raw.flags?.offTopic) notes.push('Several answers did not directly address the questions asked, lowering Fluency & Coherence.');
  if (raw.listeningCheck?.audioIssuesVi?.trim()) notes.push(`Audio note: ${raw.listeningCheck.audioIssuesVi.trim()}`);

  const feedback: SpeakingFeedback = {
    scores: { fc, lr, gra, p, overall: overallBand([fc, lr, gra, p]) },
    gradedBy: modelLabel,
    gradedFrom: 'audio',
    confidence,
    confidenceVi: raw.confidenceVi,
    gradingNotesVi: notes,
    summaryVi: raw.summaryVi ?? '',
    strengthsVi: Array.isArray(raw.strengthsVi) ? raw.strengthsVi : [],
    prioritiesVi: Array.isArray(raw.prioritiesVi) ? raw.prioritiesVi : [],
    criteriaNotesVi: {
      fc: raw.assessment.fc?.notesVi ?? '',
      lr: raw.assessment.lr?.notesVi ?? '',
      gra: raw.assessment.gra?.notesVi ?? '',
      p: raw.assessment.p?.notesVi ?? '',
    },
    utteranceFixes: (Array.isArray(raw.utteranceFixes) ? raw.utteranceFixes : []).filter(f => f?.original?.trim() && f?.improved?.trim()),
    pronunciationTipsVi: Array.isArray(raw.pronunciationTipsVi) ? raw.pronunciationTipsVi : [],
    suggestedVocab: Array.isArray(raw.suggestedVocab) ? raw.suggestedVocab : [],
  };

  return { feedback };
}

export async function POST(req: Request) {
  if ((await currentRole()) !== 'learner') {
    return new Response('Unauthorized', { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';

  // Kết quả người học dán từ Gemini (thanh Gemini của Chrome / gemini.google.com); app không tự gọi model nào
  if (contentType.includes('application/json')) {
    let body: {
      topicId?: string;
      attemptId?: string;
      mode?: SpeakingMode;
      parts?: SpeakingPartNum[];
      seconds?: number;
      recordingKind?: 'conversation' | 'candidate';
      timeline?: SpeakingTimelineMark[];
      typedAnswers?: number;
      manualJson?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const topic = body.topicId ? findSpeakingTopic(body.topicId) : undefined;
    if (!topic) {
      return Response.json({ error: 'Speaking topic not found for this session.' }, { status: 400 });
    }

    const cleaned = extractJson(body.manualJson ?? '');
    let raw: RawSpeakingGrade | null = null;
    try {
      raw = JSON.parse(cleaned) as RawSpeakingGrade;
    } catch {
      raw = null;
    }
    if (!raw || typeof raw !== 'object' || !raw.assessment) {
      return Response.json(
        { error: 'This is not a complete grading result. If Gemini’s JSON stops in the middle, ask it to send the complete JSON again; then click the copy icon on the JSON box and paste here.' },
        { status: 400 },
      );
    }
    const missing = raw.listeningCheck?.candidateAudible === false ? [] : missingBands(raw.assessment, SPEAKING_CRITERIA);
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
        { error: 'This JSON result belongs to a different Speaking session (session ID mismatch).' },
        { status: 400 },
      );
    }

    const parts: SpeakingPartNum[] = body.parts?.length ? body.parts : [1, 2, 3];
    const recordingKind = body.recordingKind ?? 'candidate';
    const typedAnswers = Math.max(0, body.typedAnswers ?? 0);
    const out = finalizeSpeakingGrade(raw, { parts, typedAnswers, recordingKind }, MANUAL_GRADE_LABEL);
    if (!out.feedback) {
      return Response.json({ error: out.error || 'Could not grade this Speaking session.' }, { status: out.status ?? 422 });
    }
    return Response.json({ feedback: out.feedback, model: MANUAL_GRADE_LABEL });
  }

  return Response.json(
    { error: 'Paste the grading JSON from Gemini — follow the steps under “Grade your session with Gemini”.' },
    { status: 400 },
  );
}
