# Brief: write the remaining IELTS strategy lessons

You are writing short strategy lessons for an IELTS self-study web app. One learner, band 5.0–5.5, Vietnamese, aiming for 6.5. Lessons teach **how to do each question type**, not English grammar.

## What to produce

One Markdown file per lesson in `D:/web-ielts/src/content/learn/<slug>.md`, for the 15 slugs listed at the bottom. Do not touch any other file. Do not edit the three finished lessons.

**First read the three finished lessons and match their voice, depth and structure exactly:**

- `D:/web-ielts/src/content/learn/paraphrase.md`
- `D:/web-ielts/src/content/learn/r-tfng.md`
- `D:/web-ielts/src/content/learn/l-map.md`

## Hard rules

1. **Language:** explanations in Vietnamese. English only for example sentences, question wording, and vocabulary being taught (with a Vietnamese gloss where a band-5 learner needs it).
2. **Original content only.** Every example passage, question and audio line must be invented by you. Do NOT quote or closely imitate any Cambridge IELTS book, any real test, or any published prep book. Do not name specific Cambridge tests.
3. **Length:** 550–900 words. Reading time 5–8 minutes. Short paragraphs.
4. **No title line.** The file starts directly with one or two opening paragraphs (the page prints the title itself). Top-level sections use `##`, sub-sections `###`. Never use `#`.
5. **Every lesson contains:** one `:::steps` block with the method; at least one `:::trap`; at least two `:::check` questions with invented mini-passages; at least one table or `:::examples` block. End with a short practical section (what to do when stuck, or how to review).
6. **Accuracy.** Only state facts about the IELTS format that are true for Academic Reading and Listening: Listening has 4 parts of 10 questions, audio played once, questions follow the order of the recording; Reading has 3 passages, 40 questions, 60 minutes, no extra transfer time; spelling counts; a word limit such as "NO MORE THAN TWO WORDS" is strict; no negative marking. If you are not sure a claim is true, leave it out.
7. **Style:** plain, direct, calm. Address the learner as "bạn". No exclamation marks, no emoji, no hype, no rhetorical questions as headings, no em dashes (use a comma, colon or full stop). Do not promise score gains.

## File syntax (a custom parser reads these files; anything else breaks the page)

- Paragraphs separated by a blank line. Lists with `- ` or `1. `. GitHub-style tables.
- Inline: `**bold**`, `*italic*`, `[[underlined]]`, `~~struck~~`, `____` (a blank).
  **Never nest emphasis** (no bold inside italic or the reverse). If a quoted English sentence needs a bold word, leave the sentence un-italicised and put it in double quotes.
- Boxes, each closed by a line containing only `:::`:
  - `:::rule Optional title`, `:::tip Optional title`, `:::trap Optional title`, `:::note Optional title`, `:::steps Optional title`
- Examples block, one example per line, each line starting with `✓` or `✗`, optional comment after ` // `:

```
:::examples
✓ Đề: The flat is [[cheap]]. Bài: The flat is very [[affordable]]. // từ đồng nghĩa
✗ Đề: ... Bài: ... // vì sao không khớp
:::
```

- Quick check: prompt lines, then options (`- [x]` marks the single correct one), then explanation lines starting with `>`:

```
:::check
Bài đọc: "..."

Câu phát biểu: *...*
- [ ] TRUE
- [x] FALSE
- [ ] NOT GIVEN
> Giải thích ngắn bằng tiếng Việt: vì sao đúng, vì sao các lựa chọn kia sai.
:::
```

- Do not put `:::` blocks inside lists or tables. Do not use HTML, images, links, code fences or footnotes.

## Lessons to write

For each: slug, title shown on the page (do not repeat it in the file), and the points that must be covered.

1. `skim-scan` — Đọc lướt và dò tìm. Skimming (title, first sentence of each paragraph, 2–3 minutes per passage) versus scanning (hunting a name, number or date); when to switch to careful reading; why reading every word runs out of time; a note that scanning for a synonym does not work, so scan for anchors (names, numbers).
2. `read-ahead` — Đọc câu hỏi trước khi nghe. Using the silent time before each section; underline anchors in the questions; predict the type of word for each gap (noun, number, adjective; singular or plural; a price, a date, a name); notice the word limit; keep eyes one question ahead while listening.
3. `spelling-numbers` — Chính tả, số, ngày tháng, đánh vần tên. Letters often confused when spelled aloud (A/E/I, G/J, M/N, B/P/V, "double T"); 13 vs 30, 15 vs 50 by stress; phone numbers ("oh", "double seven"); prices and decimals; accepted date formats; plural -s; capital letters are not required; a wrong spelling is a wrong answer.
4. `l-completion` — Điền form, note, bảng (Listening). Answers come in order; the words written are the words heard, while the surrounding note is paraphrased; read row and column headings of a table first; the word limit; distractors where a speaker corrects a detail ("no, sorry, it's the 15th"); checking grammar and plurals afterwards.
5. `l-mcq` — Trắc nghiệm và bẫy "nói rồi đổi ý" (Listening). All options are usually mentioned; the answer is the idea that is confirmed, not the first one heard; signal words for a change of mind (but, actually, in the end, I was going to, on second thoughts); paraphrase between option and recording; for "choose TWO" questions the two answers can come in any order; what to do when you miss one.
6. `l-matching` — Nối thông tin khi nghe. The numbered items follow the recording order, the lettered options do not; read and shorten the options into keywords beforehand; options are paraphrased; an option may be used once, more than once or not at all depending on the instructions (read them); cross off used options only when the rubric says each is used once.
7. `l-part4` — Part 4: bài giảng không nghỉ. One speaker, academic topic, 10 questions with no break in the middle; use the headings and sub-headings of the notes as a map; signposting language (firstly, moving on to, another point, in contrast, to sum up) tells you which section you are in; what to do when lost (jump to the next heading); unfamiliar technical words are usually explained or not needed.
8. `r-headings` — Matching headings. Find the main idea of the whole paragraph, not a detail; read the first two sentences and the last one, then check the middle; headings that reuse an exact word from the paragraph are often traps; do the easiest paragraphs first and cross off headings; there are more headings than paragraphs.
9. `r-matching-info` — Matching information. Which paragraph contains this information; questions are NOT in passage order; the information is a detail, not the main idea; classify what each question asks for (a reason, an example, a comparison, a description, a reference to...) and look for that kind of content; a paragraph can be used more than once when the rubric says so; do this type after the other questions on the same passage, when you already know the passage.
10. `r-matching-features` — Matching features. Match statements to people, places, periods; scan and mark every occurrence of each name first (including "he", "the professor", surname only); read around each occurrence; statements are paraphrased; some names may be used more than once or not at all (read the rubric).
11. `r-completion` — Điền từ lấy từ bài (Reading). Notes, sentences, tables, diagrams, summaries without a word list, short answers; the answer is copied exactly from the passage, never changed in form; respect the word limit (what counts as a word, a number counts as a number); predict the word type from the grammar of the gap; answers usually follow passage order within one question group; check spelling against the passage.
12. `r-summary-list` — Tóm tắt có danh sách từ. Options in the box are usually synonyms of words in the passage, not the passage's own words; eliminate by grammar first (word class, singular or plural), then by meaning; there are more options than gaps; the summary may cover one part of the passage only, so locate that part first.
13. `r-mcq` — Trắc nghiệm trong bài đọc. Questions follow passage order; use the question stem to locate the part; answer in your own words before reading the options; typical wrong options (true in the passage but answers a different question, too extreme, mentioned by someone else, opposite); the last question on a passage may ask about the writer's overall purpose or a title.
14. `r-endings` — Matching sentence endings. The sentence beginnings follow passage order and tell you where to look; the ending must fit both the meaning in the passage and the grammar of the beginning; use grammar to eliminate impossible endings quickly; there are more endings than beginnings; an ending that sounds logical but is not supported by the passage is the usual trap.
15. `r-timing` — Chia 60 phút cho ba bài đọc. No extra time to transfer answers in Reading; a plan such as about 17, 20 and 23 minutes because passages get harder; never leave a blank (no negative marking); when to drop a question and guess (about a minute and a half without progress); which question types to do first within a passage; how to practise timing gradually (untimed first, then with a timer).

## When done

Report: the list of files written with their word counts, and anything in this brief you could not follow.
