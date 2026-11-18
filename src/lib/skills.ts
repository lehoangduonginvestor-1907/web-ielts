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
  foundation: 'Nền tảng',
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

export const LESSONS: LessonDef[] = [
  // ---- Nền tảng ----
  { slug: 'paraphrase', group: 'foundation', title: 'Đề luôn "nói khác đi"', summary: 'Câu hỏi và bài gần như không bao giờ dùng cùng một từ. Học cách nhận ra cùng một ý dưới lớp chữ khác.', minutes: 7 },
  { slug: 'skim-scan', group: 'foundation', title: 'Đọc lướt và dò tìm', summary: 'Không ai đọc kỹ cả 900 chữ. Lướt để nắm bố cục, dò để tìm đúng chỗ, rồi mới đọc kỹ hai ba câu.', minutes: 6 },
  { slug: 'read-ahead', group: 'foundation', title: 'Đọc câu hỏi trước khi nghe', summary: 'Dùng 30 giây trước mỗi đoạn để biết mình sắp nghe gì và ô trống cần loại từ nào.', minutes: 6 },
  { slug: 'spelling-numbers', group: 'foundation', title: 'Chính tả, số, ngày tháng, đánh vần tên', summary: 'Nghe đúng mà viết sai vẫn mất điểm. Các lỗi hay gặp ở Part 1 và cách tránh.', minutes: 6 },
  // ---- Listening ----
  { slug: 'l-completion', group: 'listening', title: 'Điền form, note, bảng', summary: 'Dạng chiếm nhiều câu nhất của Listening. Đi theo thứ tự, bám mốc, viết đúng số từ.', minutes: 7, skill: 'listening', types: ['Form completion', 'Note completion', 'Table completion', 'Sentence completion', 'Flow-chart completion'] },
  { slug: 'l-mcq', group: 'listening', title: 'Trắc nghiệm và bẫy "nói rồi đổi ý"', summary: 'Cả ba phương án đều được nhắc tới. Đáp án là ý được chốt, không phải ý nghe thấy đầu tiên.', minutes: 7, skill: 'listening', types: ['Multiple choice', 'Multiple choice (two answers)'] },
  { slug: 'l-matching', group: 'listening', title: 'Nối thông tin khi nghe', summary: 'Danh sách câu hỏi đi theo thứ tự bài nghe, danh sách lựa chọn thì không. Cách giữ nhịp.', minutes: 6, skill: 'listening', types: ['Matching', 'Matching features'] },
  { slug: 'l-map', group: 'listening', title: 'Gắn nhãn bản đồ, sơ đồ', summary: 'Tìm điểm xuất phát, xoay bản đồ trong đầu, và thuộc nhóm từ chỉ hướng.', minutes: 7, skill: 'listening', types: ['Map labelling'] },
  { slug: 'l-part4', group: 'listening', title: 'Part 4: bài giảng không nghỉ', summary: 'Mười câu liền, không có quãng dừng. Dùng tiêu đề trong note và từ chuyển ý để không lạc.', minutes: 6 },
  // ---- Reading ----
  { slug: 'r-tfng', group: 'reading', title: 'True / False / Not Given', summary: 'Phân biệt "bài nói ngược lại" với "bài không nói". Dạng dễ mất điểm nhất ở band 5.', minutes: 8, skill: 'reading', types: ['True / False / Not Given', 'Yes / No / Not Given'] },
  { slug: 'r-headings', group: 'reading', title: 'Matching headings', summary: 'Chọn tiêu đề cho từng đoạn: tìm ý chính của cả đoạn, không phải một chi tiết trùng chữ.', minutes: 7, skill: 'reading', types: ['Matching headings'] },
  { slug: 'r-matching-info', group: 'reading', title: 'Matching information', summary: 'Đoạn nào chứa thông tin này? Câu hỏi không theo thứ tự bài, nên cần cách dò riêng.', minutes: 6, skill: 'reading', types: ['Matching information'] },
  { slug: 'r-matching-features', group: 'reading', title: 'Matching features', summary: 'Nối phát biểu với người, nơi chốn hay thời kỳ. Khoanh tên trước, đọc quanh tên sau.', minutes: 6, skill: 'reading', types: ['Matching features'] },
  { slug: 'r-completion', group: 'reading', title: 'Điền từ lấy từ bài', summary: 'Note, câu, bảng, sơ đồ, tóm tắt: từ điền phải lấy nguyên từ bài và đúng giới hạn số từ.', minutes: 7, skill: 'reading', types: ['Note completion', 'Sentence completion', 'Summary completion', 'Table completion', 'Table / note completion', 'Diagram labelling', 'Short-answer questions'] },
  { slug: 'r-summary-list', group: 'reading', title: 'Tóm tắt có danh sách từ', summary: 'Từ trong khung thường là từ đồng nghĩa với từ trong bài. Loại theo ngữ pháp trước, nghĩa sau.', minutes: 6, skill: 'reading', types: ['Summary completion (word list)'] },
  { slug: 'r-mcq', group: 'reading', title: 'Trắc nghiệm trong bài đọc', summary: 'Tìm đúng đoạn, tự trả lời trước, rồi mới so với bốn phương án.', minutes: 7, skill: 'reading', types: ['Multiple choice', 'Multiple choice (two answers)'] },
  { slug: 'r-endings', group: 'reading', title: 'Matching sentence endings', summary: 'Nửa câu đầu cho biết chỗ tìm trong bài; nửa sau phải khớp cả nghĩa lẫn ngữ pháp.', minutes: 6, skill: 'reading', types: ['Matching sentence endings'] },
  { slug: 'r-timing', group: 'reading', title: 'Chia 60 phút cho ba bài đọc', summary: 'Bài 1 dễ nhất nhưng không được ăn hết giờ. Kế hoạch 17–20–23 và khi nào thì bỏ câu.', minutes: 5 },
  // ---- Writing ----
  { slug: 'w-task1-overview', group: 'writing', title: 'Task 1: Viết Overview và chọn số liệu nổi bật', summary: 'Không có Overview không thể qua band 5.5 Task Achievement. Học cách gom nhóm và chọn mốc đắt giá.', minutes: 7 },
  { slug: 'w-task1-map-process', group: 'writing', title: 'Task 1: Tả Bản đồ & Quy trình', summary: 'Dùng thì bị động, từ nối trình tự và giới từ chỉ hướng chuẩn xác khi không có con số để so sánh.', minutes: 7 },
  { slug: 'w-task2-peel', group: 'writing', title: 'Task 2: Lập luận đoạn văn theo khung PEEL', summary: 'Point → Explain → Example → Link. Cách triển khai ý sâu sắc thay vì liệt kê ý cụt lủn.', minutes: 8 },
  // ---- Speaking ----
  { slug: 's-part1-expand', group: 'speaking', title: 'Part 1: Mở rộng câu trả lời tự nhiên trong 2–3 câu', summary: 'Tránh trả lời cộc lốc Yes/No hoặc học thuộc lòng. Dùng công thức Trả lời trực tiếp + Lý do/Ví dụ ngắn.', minutes: 6 },
  { slug: 's-part2-cuecard', group: 'speaking', title: 'Part 2: Tận dụng 1 phút chuẩn bị Cue Card', summary: 'Ghi từ khóa thay vì viết cả câu. Chia bài nói 2 phút thành 4 chặng để không bao giờ cạn ý giữa chừng.', minutes: 7 },
  { slug: 's-part3-reasoning', group: 'speaking', title: 'Part 3: Trả lời câu hỏi trừu tượng & so sánh đa chiều', summary: 'Chuyển từ câu chuyện cá nhân sang góc nhìn xã hội bằng cấu trúc so sánh quá khứ-hiện tại và giả định.', minutes: 7 },
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
