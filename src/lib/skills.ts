import type { Skill } from './types';

// Danh mục bài học "cách làm từng dạng câu" và kho luyện theo dạng.
// Nội dung bài nằm ở src/content/learn/<slug>.md (tự viết, ví dụ tự soạn, không chép đề Cambridge).

export type LessonGroup = 'foundation' | 'listening' | 'reading' | 'writing' | 'speaking';

export interface LessonDef {
  slug: string;
  group: LessonGroup;
  title: string;
  summary: string;
  minutes: number;
  skill?: Skill; // kỹ năng của các dạng câu bên dưới
  types?: string[]; // tên dạng câu (Group.type) mà bài này dạy; dùng để luyện và để gợi ý bài
}

export const GROUP_LABEL: Record<LessonGroup, string> = {
  foundation: 'Foundations',
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

export const LESSONS: LessonDef[] = [
  // ---- Foundations ----
  { slug: 'paraphrase', group: 'foundation', title: 'Questions always say it differently', summary: 'Questions almost never reuse the exact wording from the text. Learn to spot the same idea beneath new phrasing.', minutes: 7 },
  { slug: 'skim-scan', group: 'foundation', title: 'Skimming and scanning', summary: 'Nobody reads all 900 words closely. Skim for structure, scan for the right spot, then read two or three sentences carefully.', minutes: 6 },
  { slug: 'read-ahead', group: 'foundation', title: 'Previewing questions before listening', summary: 'Use the 30 seconds before each recording to predict what is coming and what word type each gap needs.', minutes: 6 },
  { slug: 'spelling-numbers', group: 'foundation', title: 'Spelling, numbers, dates & names', summary: 'Hearing the right answer still loses marks if spelled wrong. Common Part 1 pitfalls and how to avoid them.', minutes: 6 },
  // ---- Listening ----
  { slug: 'l-completion', group: 'listening', title: 'Form, note & table completion', summary: 'The most frequent Listening task. Answers follow audio order—anchor to signposts and obey the word limit.', minutes: 7, skill: 'listening', types: ['Form completion', 'Note completion', 'Table completion', 'Sentence completion', 'Flow-chart completion'] },
  { slug: 'l-mcq', group: 'listening', title: 'Multiple choice & distractor traps', summary: 'All three options are usually mentioned. The right answer is what the speakers settle on, not what you hear first.', minutes: 7, skill: 'listening', types: ['Multiple choice', 'Multiple choice (two answers)'] },
  { slug: 'l-matching', group: 'listening', title: 'Matching while listening', summary: 'The numbered questions follow the audio order, while the lettered options do not. How to keep your place.', minutes: 6, skill: 'listening', types: ['Matching', 'Matching features'] },
  { slug: 'l-map', group: 'listening', title: 'Map & plan labelling', summary: 'Find the starting point, orient yourself on the map, and master everyday direction vocabulary.', minutes: 7, skill: 'listening', types: ['Map labelling'] },
  { slug: 'l-part4', group: 'listening', title: 'Part 4: uninterrupted lecture', summary: 'Ten questions straight through with no break. Use subheadings and signpost transitions so you never get lost.', minutes: 6 },
  // ---- Reading ----
  { slug: 'r-tfng', group: 'reading', title: 'True / False / Not Given', summary: 'Distinguish “the passage says the opposite” from “the passage does not say.” The top score-loser around Band 5.', minutes: 8, skill: 'reading', types: ['True / False / Not Given', 'Yes / No / Not Given'] },
  { slug: 'r-headings', group: 'reading', title: 'Matching headings', summary: 'Choose a heading for each paragraph by capturing its main idea rather than matching a single detail.', minutes: 7, skill: 'reading', types: ['Matching headings'] },
  { slug: 'r-matching-info', group: 'reading', title: 'Matching information', summary: 'Which paragraph contains this detail? Questions are out of order, so you need a targeted scanning strategy.', minutes: 6, skill: 'reading', types: ['Matching information'] },
  { slug: 'r-matching-features', group: 'reading', title: 'Matching features', summary: 'Link statements to people, places, or periods. Locate all names first, then read carefully around each one.', minutes: 6, skill: 'reading', types: ['Matching features'] },
  { slug: 'r-completion', group: 'reading', title: 'Gap-fill from the passage', summary: 'Notes, sentences, tables, diagrams, and summaries: copy exact words from the text within the word limit.', minutes: 7, skill: 'reading', types: ['Note completion', 'Sentence completion', 'Summary completion', 'Table completion', 'Table / note completion', 'Diagram labelling', 'Short-answer questions'] },
  { slug: 'r-summary-list', group: 'reading', title: 'Summary completion (word list)', summary: 'Boxed words are usually synonyms of words in the passage. Narrow by grammar first, then match meaning.', minutes: 6, skill: 'reading', types: ['Summary completion (word list)'] },
  { slug: 'r-mcq', group: 'reading', title: 'Reading multiple choice', summary: 'Find the right paragraph, answer in your own words first, and only then compare with the four options.', minutes: 7, skill: 'reading', types: ['Multiple choice', 'Multiple choice (two answers)'] },
  { slug: 'r-endings', group: 'reading', title: 'Matching sentence endings', summary: 'The sentence stem tells you where to look; the ending must match both the passage meaning and grammar.', minutes: 6, skill: 'reading', types: ['Matching sentence endings'] },
  { slug: 'r-timing', group: 'reading', title: 'Pacing 60 minutes across 3 passages', summary: 'Passage 1 is easiest, so never let it eat your clock. Use a 17–20–23 plan and know when to move on.', minutes: 5 },
  // ---- Writing ----
  { slug: 'w-task1-overview', group: 'writing', title: 'Task 1: Writing an overview & key figures', summary: 'Without a clear overview, Task Achievement cannot pass Band 5.5. Learn to group data and pick standout trends.', minutes: 7 },
  { slug: 'w-task1-map-process', group: 'writing', title: 'Task 1: Describing maps & processes', summary: 'Use passive voice, sequencing linkers, and location prepositions accurately when there are no numbers to compare.', minutes: 7 },
  { slug: 'w-task2-peel', group: 'writing', title: 'Task 2: Building arguments with PEEL', summary: 'Point → Explain → Example → Link. Develop ideas in depth instead of listing shallow points.', minutes: 8 },
  // ---- Speaking ----
  { slug: 's-part1-expand', group: 'speaking', title: 'Part 1: Extending answers in 2–3 sentences', summary: 'Avoid abrupt Yes/No replies or memorised scripts. Use a Direct Answer + Reason or Short Example pattern.', minutes: 6 },
  { slug: 's-part2-cuecard', group: 'speaking', title: 'Part 2: Making the most of 1-minute prep', summary: 'Jot down keywords instead of full sentences. Divide your 2-minute talk into 4 stages so you never run dry.', minutes: 7 },
  { slug: 's-part3-reasoning', group: 'speaking', title: 'Part 3: Abstract questions & balanced comparisons', summary: 'Shift from personal stories to broader social viewpoints using past-vs-present comparisons and hypotheticals.', minutes: 7 },
];

export const findLesson = (slug: string) => LESSONS.find(l => l.slug === slug);

/** Bài học dạy dạng câu này (nếu có). */
export function lessonFor(skill: Skill, type: string): LessonDef | undefined {
  return LESSONS.find(l => l.skill === skill && l.types?.includes(type));
}

// ---- Kho luyện theo dạng: mỗi "nhóm" là một nhóm câu cùng dạng trong đề thuộc kho luyện ----

export interface DrillGroup {
  testId: string;
  book: number;
  test: number;
  skill: Skill;
  unit: number;
  unitTitle: string;
  from: number;
  to: number;
  type: string;
}

export function drillHref(g: DrillGroup): string {
  const nums = Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i);
  return `/test/${g.testId}/${g.skill}?p=${g.unit}&focus=${nums.join(',')}&drill=1`;
}

export const drillsOf = (groups: DrillGroup[], l: LessonDef) => (l.skill && l.types ? groups.filter(g => g.skill === l.skill && l.types!.includes(g.type)) : []);

// Hai cuốn cũ nhất làm kho luyện theo dạng (khi đã có từ 6 cuốn): không giao trong lộ trình
// để câu luyện dạng không trùng với đề luyện theo phần và đề thi thử.
export function drillBooks(index: { book: number }[]): number[] {
  const books = [...new Set(index.map(t => t.book))].sort((a, b) => a - b);
  return books.length >= 6 ? books.slice(0, 2) : [];
}
