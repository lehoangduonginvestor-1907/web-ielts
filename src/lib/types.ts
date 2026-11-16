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
  units: number; // số phần/bài đã làm xong
  cards: number; // số thẻ từ đã ôn
}

export interface Profile {
  name: string;
  examDate?: string; // YYYY-MM-DD
  target: number; // band mục tiêu
  goalMinutes: number;
  createdAt: number;
}

export interface Store {
  version: 1;
  profile?: Profile;
  attempts: Attempt[];
  drafts: Record<string, { answers: Answers; seconds: number; flagged: number[]; startedAt: number }>;
  days: Record<string, DayLog>;
  journal: Record<string, JournalEntry>;
  words: Word[];
  mistakes: Record<string, MistakeState>; // khoá: testId:skill:n
  highlights: Record<string, { p: number; start: number; end: number }[]>; // khoá: testId:R:n
  freezes: number;
  frozenDays: string[];
}
