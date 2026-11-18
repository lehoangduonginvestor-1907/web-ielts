// ---- Nội dung đề (đọc từ content/tests/*.json) ----

export interface Opt {
  key: string;
  text?: string;
}

export interface Explanation {
  evidence?: string; // câu dẫn chứng, trích nguyên văn bài đọc / transcript
  vi?: string; // dịch câu dẫn chứng
  why: string; // giải thích (hỗ trợ **đậm** và *nghiêng*)
  para?: [string, string][]; // cặp paraphrase: [cách đề nói, cách bài nói]
  trap?: string; // vì sao phương án gây nhiễu sai
}

export interface Question {
  n: number;
  prompt?: string;
  options?: Opt[];
  answer: string[];
  explain?: Explanation;
}

export type GroupKind = 'gap' | 'mcq' | 'multi' | 'tfng' | 'ynng' | 'match';

export interface Group {
  from: number;
  to: number;
  kind: GroupKind;
  type: string; // tên dạng câu hỏi để thống kê, vd. "Note completion"
  instructions: string;
  image?: string; // hình bản đồ / sơ đồ trong content/images (Map, Plan, Diagram labelling)
  title?: string;
  prompt?: string; // câu hỏi chung của nhóm (multi)
  template?: string; // gap: văn bản có {{n}}
  options?: Opt[]; // match / multi / gap chọn từ danh sách
  optionsTitle?: string;
  pick?: number;
  questions: Question[];
}

export interface Paragraph {
  label?: string;
  text: string;
}

export interface VocabItem {
  word: string;
  pos?: string;
  vi: string;
  context?: string;
}

export interface Passage {
  n: number;
  title: string;
  subtitle?: string;
  footnotes?: string[];
  paragraphs: Paragraph[];
  groups: Group[];
  vocab?: VocabItem[];
}

export interface ScriptSegment {
  speaker?: string;
  text: string;
  ts?: number[]; // giây bắt đầu của từng từ (tách theo khoảng trắng) + lúc đoạn kết thúc; xem lib/timing.ts
}

export interface ListeningPart {
  n: number;
  title: string;
  audio: string;
  script: ScriptSegment[];
  groups: Group[];
  vocab?: VocabItem[];
}

export interface Test {
  id: string;
  book: number;
  test: number;
  listening: ListeningPart[];
  reading: Passage[];
}

export interface UnitIndex {
  n: number;
  title: string;
  from: number;
  to: number;
  audio?: boolean; // phần nghe: false = chưa có file audio
}

export interface TestIndexEntry {
  id: string;
  book: number;
  test: number;
  listening: UnitIndex[];
  reading: UnitIndex[];
}

export type Skill = 'listening' | 'reading';

// Một "đơn vị" luyện: 1 phần nghe / 1 bài đọc, hoặc cả bài thi (units = tất cả)
export interface UnitRef {
  testId: string;
  skill: Skill;
  units: number[];
}

// ---- Dữ liệu người học (lưu trong trình duyệt) ----

export type Answers = Record<number, string | string[]>;

export interface Attempt {
  id: string;
  testId: string;
  skill: Skill;
  units: number[];
  mode: 'practice' | 'exam';
  focus?: number[]; // làm lại một số câu
  drill?: boolean; // luyện theo dạng: focus là các câu của một nhóm câu, có tính vào thống kê dạng câu
  startedAt: number;
  finishedAt: number;
  seconds: number; // thời gian thực sự làm bài
  answers: Answers;
  results: Record<number, boolean>;
  types: Record<number, string>; // dạng câu hỏi của từng câu
  score: number;
  total: number;
  blank?: number[]; // các câu bỏ trống lúc nộp
  incomplete?: boolean; // trả lời chưa tới một nửa số câu: lưu để xem lại nhưng không tính là đã làm
  resumed?: boolean; // làm tiếp từ bản nháp (bị gián đoạn): vẫn chữa bài, nhưng không tính vào band
}

export interface Draft {
  answers: Answers;
  seconds: number;
  flagged: number[];
  startedAt: number;
  mode?: 'practice' | 'exam';
  unitIdx?: number; // phần đang làm khi bị gián đoạn
}

export interface Srs {
  due: number; // timestamp
  interval: number; // ngày
  ease: number;
  reps: number;
  lapses: number;
}

export interface Word {
  id: string;
  word: string;
  vi: string;
  pos?: string;
  context?: string;
  source?: string; // vd. "c17t1 · Reading 1"
  addedAt: number;
  srs: Srs;
}

export type MistakeReason = 'vocab' | 'paraphrase' | 'locate' | 'missed' | 'careless' | 'time';

export interface MistakeState {
  reason?: MistakeReason;
  step: number; // số lần làm lại đúng liên tiếp
  due: number; // lần làm lại tiếp theo
  resolved?: boolean;
}

export interface JournalEntry {
  mood?: number; // 1..4
  note?: string;
}

export interface DayLog {
  seconds: number;
  units: number; // số Part/Passage đã làm xong (một đề Listening cả bài = 4)
  cards: number; // số thẻ từ đã ôn
  drills?: number; // số lượt làm lại câu sai / luyện theo dạng
}

export interface LessonState {
  done?: boolean; // đã đánh dấu học xong
  checks?: Record<number, boolean>; // kết quả lần đầu của từng câu thử nhanh
}

export interface Profile {
  name: string;
  examDate?: string; // YYYY-MM-DD
  target: number; // band mục tiêu
  goalMinutes: number;
  createdAt: number;
}

// ---- Writing & Speaking ----

export type WritingTaskType = 'task1' | 'task2';

export type WritingCategory =
  | 'line'
  | 'bar'
  | 'pie'
  | 'table'
  | 'process'
  | 'map'
  | 'opinion'
  | 'discussion'
  | 'advantages'
  | 'problem_solution'
  | 'two_part';

export type WritingMode = 'step' | 'full' | 'exam';

export interface WritingScaffoldStep {
  id: string;
  label: string;
  hint: string;
  starters: string[];
  minWords: number;
}

export interface WritingPrompt {
  id: string;
  task: WritingTaskType;
  category: WritingCategory;
  categoryLabel: string;
  title: string;
  book?: number;
  test?: number;
  prompt: string;
  chartSvg?: string;
  chartSummary?: string;
  minWords: number;
  recommendedMinutes: number;
  scaffold: WritingScaffoldStep[];
  sampleBand7: string;
  keyVocab: VocabItem[];
}

export interface WritingCriteriaScores {
  task: number;
  cc: number;
  lr: number;
  gra: number;
  overall: number;
}

export interface WritingSentenceFix {
  original: string;
  improved: string;
  criterion: 'task' | 'cc' | 'lr' | 'gra';
  reasonVi: string;
  errorPattern?: string;
}

export interface WritingFeedback {
  scores: WritingCriteriaScores;
  summaryVi: string;
  strengthsVi: string[];
  prioritiesVi: string[];
  criteriaNotesVi: { task: string; cc: string; lr: string; gra: string };
  sentenceFixes: WritingSentenceFix[];
  upgradedParagraphs: { label: string; original: string; upgraded: string; noteVi: string }[];
  suggestedVocab: { word: string; pos: string; vi: string; context: string }[];
}

export interface WritingAttempt {
  id: string;
  promptId: string;
  task: WritingTaskType;
  mode: WritingMode;
  startedAt: number;
  finishedAt: number;
  seconds: number;
  text: string;
  wordCount: number;
  feedback?: WritingFeedback;
  addedVocab?: boolean;
  addedMistakes?: boolean;
}

export interface WritingDraft {
  promptId: string;
  mode: WritingMode;
  text: string;
  stepTexts: string[];
  seconds: number;
  startedAt: number;
}

export type SpeakingPartNum = 1 | 2 | 3;

export type SpeakingMode = 'part1' | 'part2' | 'part3' | 'full';

export interface SpeakingTopic {
  id: string;
  title: string;
  themeVi: string;
  book?: number;
  test?: number;
  part1: { topic: string; questions: string[] };
  part2: { cueCardTitle: string; bullets: string[]; followUp: string; prepHintsVi: string[] };
  part3: { theme: string; questions: string[] };
  usefulVocab: { word: string; pos: string; vi: string; context: string }[];
}

export interface SpeakingTurn {
  role: 'examiner' | 'candidate';
  text: string;
  part: SpeakingPartNum;
  at: number;
}

export interface SpeakingCriteriaScores {
  fc: number;
  lr: number;
  gra: number;
  p: number;
  overall: number;
}

export interface SpeakingSentenceFix {
  original: string;
  improved: string;
  criterion: 'fc' | 'lr' | 'gra' | 'p';
  reasonVi: string;
  errorPattern?: string;
}

export interface SpeakingFeedback {
  scores: SpeakingCriteriaScores;
  summaryVi: string;
  strengthsVi: string[];
  prioritiesVi: string[];
  criteriaNotesVi: { fc: string; lr: string; gra: string; p: string };
  utteranceFixes: SpeakingSentenceFix[];
  pronunciationTipsVi: string[];
  suggestedVocab: { word: string; pos: string; vi: string; context: string }[];
}

export interface SpeakingAttempt {
  id: string;
  topicId: string;
  mode: SpeakingMode;
  parts: SpeakingPartNum[];
  startedAt: number;
  finishedAt: number;
  seconds: number;
  transcript: SpeakingTurn[];
  notes?: string;
  hasRecording?: boolean;
  feedback?: SpeakingFeedback;
  addedVocab?: boolean;
  addedMistakes?: boolean;
}

export interface GrammarMistake {
  id: string;
  sourceId: string;
  skill: 'writing' | 'speaking';
  original: string;
  improved: string;
  criterion: string;
  reasonVi: string;
  errorPattern?: string;
  addedAt: number;
  step: number;
  due: number;
  resolved?: boolean;
}

export interface Store {
  version: 1;
  updatedAt?: number; // lần sửa gần nhất; dùng để đồng bộ với bản lưu ở máy chủ
  profile?: Profile;
  attempts: Attempt[];
  drafts: Record<string, Draft>;
  days: Record<string, DayLog>;
  journal: Record<string, JournalEntry>;
  words: Word[];
  mistakes: Record<string, MistakeState>; // khoá: testId:skill:n
  highlights: Record<string, { p: number; start: number; end: number }[]>; // khoá: testId:R:n
  freezes: number;
  frozenDays: string[];
  lessons: Record<string, LessonState>; // khoá: slug bài học
  writingAttempts?: WritingAttempt[];
  writingDrafts?: Record<string, WritingDraft>;
  speakingAttempts?: SpeakingAttempt[];
  grammarMistakes?: GrammarMistake[];
}
