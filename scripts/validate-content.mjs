// Kiểm tra toàn bộ đề trong content/tests: đánh số câu, đáp án, chỗ trống,
// và quan trọng nhất: câu dẫn chứng trong lời giải phải có thật trong bài đọc / transcript.
// Chạy: npm run validate
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'content', 'tests');
const norm = s => s
  .toLowerCase()
  .replace(/[‘’`´]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—−]/g, '-')
  .replace(/\*/g, '')
  .replace(/\s+/g, ' ')
  .trim();

let errors = 0;
let warnings = 0;
const err = (id, msg) => { errors++; console.log(`✗ ${id}: ${msg}`); };
const warn = (id, msg) => { warnings++; console.log(`! ${id}: ${msg}`); };

function checkSection(id, label, units, sourceOf) {
  const seen = [];
  for (const unit of units) {
    const source = norm(sourceOf(unit));
    for (const g of unit.groups) {
      const where = `${id} ${label}${unit.n} Q${g.from}-${g.to}`;
      const nums = g.questions.map(q => q.n);
      const expected = Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i);
      if (nums.join() !== expected.join()) err(where, `số câu ${nums} ≠ ${expected}`);
      seen.push(...nums);
      if (!g.instructions) err(where, 'thiếu instructions');
      if (g.kind === 'gap') {
        const holes = [...(g.template || '').matchAll(/\{\{(\d+)\}\}/g)].map(m => +m[1]);
        if (holes.join() !== expected.join()) err(where, `chỗ trống ${holes} ≠ ${expected}`);
      }
      const keys = new Set((g.options || []).map(o => o.key));
      for (const q of g.questions) {
        const qw = `${where} #${q.n}`;
        if (!q.answer?.length) err(qw, 'thiếu đáp án');
        if (['mcq'].includes(g.kind)) {
          const own = new Set((q.options || []).map(o => o.key));
          if (!q.prompt || !own.size) err(qw, 'MCQ thiếu prompt/options');
          q.answer.forEach(a => own.has(a) || err(qw, `đáp án ${a} không có trong options`));
        }
        if (['match', 'multi'].includes(g.kind) || (g.kind === 'gap' && keys.size)) {
          q.answer.forEach(a => keys.has(a) || err(qw, `đáp án ${a} không có trong options`));
        }
        if (g.kind === 'multi' && q.answer.length !== g.pick) err(qw, `multi cần ${g.pick} đáp án`);
        if (g.kind === 'tfng') q.answer.forEach(a => ['TRUE', 'FALSE', 'NOT GIVEN'].includes(a) || err(qw, `đáp án ${a}`));
        if (g.kind === 'ynng') q.answer.forEach(a => ['YES', 'NO', 'NOT GIVEN'].includes(a) || err(qw, `đáp án ${a}`));
        const ex = q.explain;
        if (!ex) { warn(qw, 'chưa có lời giải'); continue; }
        if (!ex.why) err(qw, 'lời giải thiếu "why"');
        if (!ex.evidence) err(qw, 'thiếu dẫn chứng (evidence)');
        else if (!source.includes(norm(ex.evidence))) err(qw, `dẫn chứng không có trong bài: "${ex.evidence.slice(0, 70)}…"`);
      }
    }
  }
  const sorted = [...seen].sort((a, b) => a - b);
  if (sorted.join() !== Array.from({ length: 40 }, (_, i) => i + 1).join()) err(id, `${label} không đủ 40 câu (${sorted.length})`);
}

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];
for (const f of files) {
  const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  // Văn bản quá ngắn = cắt sai dải dòng (transcript một phần thường 3.000–6.000 ký tự, bài đọc 4.000–7.000)
  for (const p of t.listening ?? []) {
    const len = (p.script || []).map(s => s.text).join(' ').length;
    if (len < 1500) err(t.id, `transcript Part ${p.n} quá ngắn (${len} ký tự): kiểm tra lại dải dòng`);
  }
  for (const p of t.reading ?? []) {
    const len = p.paragraphs.map(x => x.text).join(' ').length;
    if (len < 2500) err(t.id, `bài đọc Passage ${p.n} quá ngắn (${len} ký tự): kiểm tra lại dải dòng`);
  }
  if (t.listening?.length) {
    checkSection(t.id, 'L', t.listening, p => (p.script || []).map(s => s.text).join(' '));
    for (const p of t.listening) {
      if (!fs.existsSync(path.join(process.cwd(), 'content', 'audio', p.audio))) warn(t.id, `chưa có audio ${p.audio} (phần này bị ẩn khỏi luyện tập)`);
    }
  }
  if (t.reading?.length) checkSection(t.id, 'R', t.reading, p => p.paragraphs.map(x => x.text).join(' '));
}
console.log(`\n${files.length} đề · ${errors} lỗi · ${warnings} cảnh báo`);
process.exit(errors ? 1 : 0);
