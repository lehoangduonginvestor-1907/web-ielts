'use client';

import type { MistakeReason, Store, TestIndexEntry } from '@/lib/types';
import { bandEstimate, countsForBand, fullAttempts, speakingBandEstimate, typeStats, writingBandEstimate } from '@/lib/progress';
import { isActive, longestStreak, streakOf } from '@/lib/store';
import { addDays, dayKey, daysBetween, fmtDay, fmtDuration, weekdayName } from '@/lib/dates';
import { bandFor, fmtBand } from '@/lib/band';
import { LESSONS } from '@/lib/skills';
import { WRITING_PROMPTS } from '@/lib/writingPrompts';
import { SPEAKING_TOPICS } from '@/lib/speakingTopics';
import { CoachNoteEditor } from './CoachNote';
import { HedgehogMood, MascotDuo } from './Mascots';

const REASON: Record<MistakeReason, string> = {
  vocab: 'Thiếu từ vựng',
  paraphrase: 'Không nhận ra paraphrase',
  locate: 'Không tìm được chỗ',
  missed: 'Nghe sót / không kịp',
  careless: 'Ẩu, đọc sai đề',
  time: 'Hết giờ',
};

const MOOD = ['', 'rất mệt', 'hơi nản', 'ổn', 'hứng thú'];

// Trang chỉ đọc cho người kèm: tuần này học thế nào, điểm đang đi về đâu, vướng ở đâu.
export default function Coach({ store, index }: { store: Store | null; index: TestIndexEntry[] }) {
  const logout = async () => {
    await fetch('/api/login', { method: 'DELETE' });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login'; // tải lại hẳn trang để bỏ mọi dữ liệu đang giữ
  };

  if (!store?.profile) {
    return (
      <Shell onLogout={logout}>
        <p className="card p-6 text-muted">Chưa có dữ liệu. Người học chưa mở app lần nào, hoặc tiến độ chưa kịp đồng bộ lên máy chủ.</p>
        <CoachNoteEditor />
      </Shell>
    );
  }

  const p = store.profile;
  const today = dayKey();
  const real = store.attempts.filter(a => !a.incomplete);
  const lastSync = store.updatedAt ? new Date(store.updatedAt) : null;

  // Bốn tuần gần nhất (mỗi tuần 7 ngày, tính lùi từ hôm nay)
  const weeks = [0, 1, 2, 3].map(w => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, -(w * 7 + i)));
    const logs = days.map(d => store.days[d]);
    const atts = real.filter(a => days.includes(dayKey(a.finishedAt)));
    const ok = atts.reduce((n, a) => n + a.score, 0);
    const all = atts.reduce((n, a) => n + a.total, 0);
    return {
      label: w === 0 ? '7 ngày qua' : `${fmtDay(days[6])} – ${fmtDay(days[0])}`,
      active: logs.filter(l => isActive(l)).length,
      seconds: logs.reduce((n, l) => n + (l?.seconds ?? 0), 0),
      // Đếm từ bài làm (đúng cả với dữ liệu cũ): một đề Listening cả bài = 4 phần; làm lại câu sai / luyện dạng đếm riêng
      units: atts.filter(a => !a.focus?.length).reduce((n, a) => n + a.units.length, 0),
      drills: atts.filter(a => a.focus?.length).length,
      cards: logs.reduce((n, l) => n + (l?.cards ?? 0), 0),
      acc: all ? Math.round((ok / all) * 100) : null,
    };
  });
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  const mocks = (['listening', 'reading'] as const).flatMap(skill => fullAttempts(store, skill)).sort((a, b) => b.finishedAt - a.finishedAt);
  const weak = typeStats(store).filter(t => t.all >= 5).slice(0, 6);
  const open = Object.values(store.mistakes).filter(m => !m.resolved);
  const reasons = new Map<MistakeReason, number>();
  open.forEach(m => m.reason && reasons.set(m.reason, (reasons.get(m.reason) ?? 0) + 1));
  const lessonsDone = LESSONS.filter(l => store.lessons?.[l.slug]?.done);
  const notes = Object.entries(store.journal)
    .filter(([, j]) => j.note || j.mood)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 10);
  const recent = [...real].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 12);
  const testName = (id: string) => {
    const t = index.find(x => x.id === id);
    return t ? `Cam ${t.book} Test ${t.test}` : id;
  };
  const idle = lastActiveGap(store, today);

  return (
    <Shell onLogout={logout}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] leading-tight font-semibold">{p.name}</h1>
          <p className="mt-1 text-ink-2">
            Mục tiêu {fmtBand(p.target)} · {p.goalMinutes} phút mỗi ngày
            {p.examDate && ` · thi ngày ${p.examDate.split('-').reverse().join('/')} (còn ${Math.max(0, daysBetween(today, p.examDate))} ngày)`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {lastSync ? `Dữ liệu cập nhật lúc ${lastSync.toLocaleString('vi-VN')}` : 'Chưa rõ lần cập nhật gần nhất'}
            {idle !== null && idle >= 2 && <span className="ml-2 font-semibold text-ember">· đã {idle} ngày không học</span>}
          </p>
        </div>
        <MascotDuo size={102} mood="study" />
      </header>

      <CoachNoteEditor />

      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Chuỗi ngày" value={`${streakOf(store)}`} note={`kỷ lục ${longestStreak(store)}`} />
        <Stat label="7 ngày qua" value={fmtDuration(weeks[0].seconds)} note={`${weeks[0].active}/7 ngày có học`} />
        {(['listening', 'reading'] as const).map(skill => {
          const b = bandEstimate(store, skill);
          return <Stat key={skill} label={`Band ${skill === 'listening' ? 'Listening' : 'Reading'}`} value={b ? fmtBand(b.avg) : '–'} note={b ? `TB ${b.count} đề mới` : 'chưa đủ dữ liệu'} />;
        })}
        {(() => {
          const bw = writingBandEstimate(store);
          const bs = speakingBandEstimate(store);
          return (
            <>
              <Stat label="Band Writing" value={bw ? fmtBand(bw.avg) : '–'} note={bw ? `TB ${bw.count} bài chấm` : 'chưa có bài'} />
              <Stat label="Band Speaking" value={bs ? fmtBand(bs.avg) : '–'} note={bs ? `TB ${bs.count} buổi nói` : 'chưa có buổi'} />
            </>
          );
        })()}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">14 ngày gần nhất</h2>
        <div className="card flex items-end gap-1.5 p-4">
          {last14.map(d => {
            const m = Math.round((store.days[d]?.seconds ?? 0) / 60);
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${weekdayName(d)} ${fmtDay(d)}: ${m} phút`}>
                <span className="num text-[11px] text-muted">{m || ''}</span>
                <div className="flex h-24 w-full items-end rounded bg-sunk">
                  <div className={`w-full rounded ${m >= p.goalMinutes ? 'bg-good' : 'bg-ember'}`} style={{ height: `${Math.min(100, (m / Math.max(p.goalMinutes, 1)) * 100)}%` }} />
                </div>
                <span className={`text-[10px] ${d === today ? 'font-bold text-ink' : 'text-muted'}`}>{fmtDay(d)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted">Cột xanh: đạt mục tiêu {p.goalMinutes} phút. Số trên cột là số phút học.</p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Theo tuần</h2>
        <div className="card scroll-thin overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                {['Tuần', 'Ngày có học', 'Thời gian', 'Part/Passage đã làm', 'Lượt làm lại, luyện dạng', 'Thẻ từ đã ôn', 'Tỷ lệ đúng'].map(h => (
                  <th key={h} className="px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="num divide-y divide-line">
              {weeks.map(w => (
                <tr key={w.label}>
                  <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{w.label}</td>
                  <td className="px-4 py-2.5">{w.active}/7</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{fmtDuration(w.seconds)}</td>
                  <td className="px-4 py-2.5">{w.units}</td>
                  <td className="px-4 py-2.5">{w.drills}</td>
                  <td className="px-4 py-2.5">{w.cards}</td>
                  <td className="px-4 py-2.5">{w.acc === null ? '–' : `${w.acc}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <p className="eyebrow">Dạng câu yếu nhất (60 ngày)</p>
          {weak.length ? (
            <ul className="mt-3 space-y-2.5">
              {weak.map(w => (
                <li key={`${w.skill}${w.type}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {w.type} <span className="text-muted">· {w.skill === 'listening' ? 'L' : 'R'}</span>
                    </span>
                    <span className="num font-semibold">
                      {Math.round((w.ok / w.all) * 100)}% <span className="font-normal text-muted">({w.ok}/{w.all})</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-sunk">
                    <div className="h-full rounded-full bg-ember" style={{ width: `${(w.ok / w.all) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Chưa đủ dữ liệu (cần từ 5 câu mỗi dạng).</p>
          )}
        </div>
        <div className="card p-5">
          <p className="eyebrow">Sổ lỗi</p>
          <p className="mt-2 text-sm">
            <span className="num font-serif text-[26px] font-semibold">{open.length}</span> câu đang chờ làm lại ·{' '}
            {Object.values(store.mistakes).filter(m => m.resolved).length} câu đã gỡ
          </p>
          {reasons.size > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {[...reasons.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="text-ink-2">{REASON[k]}</span>
                    <span className="num font-semibold">{n}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Người học chưa gắn lý do sai cho câu nào.</p>
          )}
          <p className="mt-4 border-t border-line pt-3 text-sm text-ink-2">
            Thẻ từ: <span className="num font-semibold">{store.words.length}</span> · Bài học đã đọc:{' '}
            <span className="num font-semibold">
              {lessonsDone.length}/{LESSONS.length}
            </span>
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Bài 40 câu</h2>
        <p className="-mt-2 mb-3 text-xs text-muted">Chỉ bài thi thử trên đề chưa gặp mới tính vào band. Bài luyện tập (tua lại được) và đề làm lại chỉ để tham khảo.</p>
        {mocks.length ? (
          <ul className="card divide-y divide-line text-sm">
            {mocks.slice(0, 10).map(a => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="num w-14 text-muted">{fmtDay(dayKey(a.finishedAt))}</span>
                <span className="flex-1 font-semibold">
                  {testName(a.testId)} · {a.skill === 'listening' ? 'Listening' : 'Reading'}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {countsForBand(store, a) ? 'thi thử · tính band' : a.mode === 'exam' ? 'thi thử · đề đã gặp' : 'luyện tập'}
                  </span>
                </span>
                <span className="num">{a.score}/40</span>
                <span className={`num font-serif text-lg font-semibold ${countsForBand(store, a) ? 'text-accent' : 'text-muted'}`}>{fmtBand(bandFor(a.skill, a.score))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">Chưa làm bài nào đủ 40 câu.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Bài làm gần đây</h2>
        {recent.length ? (
          <ul className="card divide-y divide-line text-sm">
            {recent.map(a => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="num w-14 text-muted">{fmtDay(dayKey(a.finishedAt))}</span>
                <span className="flex-1">
                  {testName(a.testId)} · {a.skill === 'listening' ? 'Listening' : 'Reading'}{' '}
                  {a.units.length === 1 ? `${a.skill === 'listening' ? 'Part' : 'Passage'} ${a.units[0]}` : 'cả bài'}
                  {a.drill ? <span className="ml-2 text-xs text-muted">luyện dạng</span> : a.focus?.length ? <span className="ml-2 text-xs text-muted">làm lại câu sai</span> : null}
                </span>
                <span className="num text-muted">{fmtDuration(a.seconds)}</span>
                <span className="num w-12 text-right font-semibold">
                  {a.score}/{a.total}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">Chưa có bài làm nào.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Writing &amp; Speaking gần đây</h2>
        {(store.writingAttempts?.length || store.speakingAttempts?.length) ? (
          <ul className="card divide-y divide-line text-sm">
            {[
              ...(store.writingAttempts ?? []).map(w => ({
                id: w.id,
                at: w.finishedAt,
                label: `Writing ${w.task === 'task1' ? 'T1' : 'T2'} · ${WRITING_PROMPTS.find(p => p.id === w.promptId)?.title ?? w.promptId}`,
                meta: `${w.wordCount} từ`,
                band: w.feedback?.scores.overall,
              })),
              ...(store.speakingAttempts ?? []).map(s => ({
                id: s.id,
                at: s.finishedAt,
                label: `Speaking (${s.mode}) · ${SPEAKING_TOPICS.find(t => t.id === s.topicId)?.title ?? s.topicId}`,
                meta: `${s.transcript.filter(x => x.role === 'candidate').length} lượt nói`,
                band: s.feedback?.scores.overall,
              })),
            ]
              .sort((a, b) => b.at - a.at)
              .slice(0, 10)
              .map(item => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
                  <span className="num w-14 text-muted">{fmtDay(dayKey(item.at))}</span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="text-xs text-muted">{item.meta}</span>
                  <span className="num font-serif font-semibold text-accent">{item.band !== undefined ? fmtBand(item.band) : '–'}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">Chưa có bài Writing hoặc buổi Speaking nào.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Nhật ký của người học</h2>
        {notes.length ? (
          <ul className="card divide-y divide-line text-sm">
            {notes.map(([d, j]) => (
              <li key={d} className="px-4 py-3">
                <span className="num text-muted">
                  {weekdayName(d)} {fmtDay(d)}
                </span>
                {j.mood ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-ink-2">
                    · <HedgehogMood mood={j.mood as 1 | 2 | 3 | 4} size={17} /> {MOOD[j.mood]}
                  </span>
                ) : null}
                {j.note && <p className="mt-1 font-serif text-[15px] whitespace-pre-line">{j.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-muted">Chưa có ghi chú nào.</p>
        )}
      </section>
    </Shell>
  );
}

// Số ngày kể từ lần học gần nhất (0 = hôm nay có học); null nếu chưa học ngày nào
function lastActiveGap(store: Store, today: string): number | null {
  const days = Object.keys(store.days).filter(k => isActive(store.days[k])).sort();
  return days.length ? daysBetween(days[days.length - 1], today) : null;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="num mt-1 font-serif text-[26px] leading-tight font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
    </div>
  );
}

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-4xl space-y-8 px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between">
        <span className="eyebrow">đều. · trang người kèm</span>
        <button className="btn-quiet" onClick={onLogout}>
          Đăng xuất
        </button>
      </div>
      {children}
    </div>
  );
}
