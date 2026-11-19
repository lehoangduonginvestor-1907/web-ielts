// Mốc mô tả band IELTS (diễn đạt lại ngắn gọn từ bộ Band Descriptors công khai) dùng làm
// "thước đo" trong system prompt của các model chấm, cùng các hàm làm tròn điểm theo quy tắc IELTS.

export const WRITING_TASK1_TA = `TASK ACHIEVEMENT (Task 1)
9: Fully satisfies all requirements; key features fully and appropriately selected and developed, with a clear overview.
8: Covers all requirements appropriately and sufficiently; key features skilfully selected, clearly presented, highlighted and illustrated; only occasional omissions or lapses.
7: Covers the requirements; contains a CLEAR overview of the main trends, differences or stages; key features clearly presented and highlighted but could be more fully extended.
6: Addresses the requirements; HAS an overview with information appropriately selected; key features adequately highlighted, but some details may be irrelevant, inappropriate or inaccurate.
5: Generally addresses the task; recounts detail mechanically with NO clear overview; key features inadequately covered; may focus on details; may have no data to support the description; format may be inappropriate in places.
4: Attempts the task but does not cover all key features; may confuse key features with detail; parts may be unclear, irrelevant, repetitive or inaccurate.
3: Fails to address the task; very limited ideas, possibly irrelevant or repetitive.
1: Responses of 20 words or fewer, or content wholly unrelated to the task.`;

export const WRITING_TASK2_TR = `TASK RESPONSE (Task 2)
9: Fully addresses all parts of the task; fully developed position with relevant, fully extended and well-supported ideas.
8: Sufficiently addresses all parts; well-developed response with relevant, extended and supported ideas; only occasional omissions or lapses.
7: Addresses all parts; presents a CLEAR position THROUGHOUT; main ideas extended and supported, but there may be a tendency to over-generalise or supporting ideas may lack focus.
6: Addresses all parts, though some more fully than others; presents a relevant position although conclusions may become unclear or repetitive; relevant main ideas but some are inadequately developed or unclear.
5: Addresses the task only partially; expresses a position but its development is not always clear and there may be no conclusions drawn; main ideas are limited and not sufficiently developed; may include irrelevant detail or repetition; format may be inappropriate in places.
4: Responds to the task only minimally or tangentially; position is unclear; main ideas are difficult to identify and may be repetitive, irrelevant or poorly supported.
3: Does not adequately address any part of the task; no clear position; few ideas, largely undeveloped or irrelevant.
1: Responses of 20 words or fewer, or content wholly unrelated to the prompt.`;

export const WRITING_CC = `COHERENCE AND COHESION
9: Cohesion is used so skilfully it attracts no attention; paragraphing is skilfully managed.
8: Sequences information and ideas logically; manages all aspects of cohesion well; paragraphing is sufficient and appropriate.
7: Logically organises information and ideas with clear progression throughout; uses a range of cohesive devices appropriately although there may be some under- or over-use; each paragraph has a clear central topic.
6: Arranges information coherently with clear overall progression; cohesive devices are effective but cohesion within and/or between sentences may be faulty or mechanical; referencing not always clear; paragraphing not always logical.
5: Some organisation but may lack overall progression; inadequate, inaccurate or over-used cohesive devices; repetitive because of lack of referencing and substitution; paragraphing may be inadequate or missing.
4: Information and ideas not arranged coherently; no clear progression; basic cohesive devices that are inaccurate or repetitive; may not write in paragraphs.
3: Does not organise ideas logically; very limited range of cohesive devices that may not indicate a logical relationship.`;

export const WRITING_LR = `LEXICAL RESOURCE (Writing)
9: Wide range used with very natural and sophisticated control; rare minor errors occur only as slips.
8: Wide range used fluently and flexibly to convey precise meanings; skilful use of uncommon items; occasional inaccuracies in word choice and collocation; rare spelling or word-formation errors.
7: Sufficient range for some flexibility and precision; uses less common items with awareness of style and collocation; occasional errors in word choice, spelling and/or word formation.
6: Adequate range for the task; attempts less common vocabulary but with some inaccuracy; some spelling/word-formation errors that do not impede communication.
5: Limited range, minimally adequate for the task; noticeable spelling/word-formation errors that may cause some difficulty for the reader.
4: Basic vocabulary used repetitively or inappropriately; limited control of word formation and spelling; errors may strain the reader.
3: Very limited range and control; errors may severely distort the message.`;

export const WRITING_GRA = `GRAMMATICAL RANGE AND ACCURACY (Writing)
9: Wide range of structures with full flexibility and accuracy; rare minor errors occur only as slips.
8: Wide range of structures; the MAJORITY of sentences are error-free; only very occasional errors or inappropriacies.
7: Variety of complex structures; FREQUENT error-free sentences; good control of grammar and punctuation but may make a few errors.
6: Mix of simple and complex sentence forms; some errors in grammar and punctuation that rarely reduce communication.
5: Limited range of structures; complex sentences attempted but tend to be less accurate than simple ones; frequent grammatical errors and faulty punctuation that can cause some difficulty.
4: Very limited range; subordinate clauses rare; some accurate structures but errors predominate; punctuation often faulty.
3: Attempts sentence forms but errors in grammar and punctuation predominate and distort meaning.`;

export const SPEAKING_FC = `FLUENCY AND COHERENCE
9: Speaks fluently with only very occasional repetition or self-correction; any hesitation is to prepare CONTENT, not to find words or grammar; fully coherent; develops topics fully and appropriately.
8: Speaks fluently with only occasional repetition or self-correction; hesitation is usually content-related and only rarely to search for language; develops topics coherently and appropriately.
7: Speaks at length without noticeable effort or loss of coherence; may show language-related hesitation at times, or some repetition and/or self-correction; uses a range of connectives and discourse markers with some flexibility.
6: Willing to speak at length, though may lose coherence at times due to occasional repetition, self-correction or hesitation; uses a range of connectives and discourse markers but not always appropriately.
5: Usually maintains flow but uses repetition, self-correction and/or slow speech to keep going; may over-use certain connectives and discourse markers; simple speech is fluent but more complex communication causes fluency problems.
4: Cannot respond without noticeable pauses and may speak slowly, with frequent repetition and self-correction; links basic sentences with repetitious simple connectives; some breakdowns in coherence.
3: Speaks with long pauses; limited ability to link simple sentences; gives only simple responses and is frequently unable to convey a basic message.`;

export const SPEAKING_LR = `LEXICAL RESOURCE (Speaking)
9: Uses vocabulary with full flexibility and precision in all topics; uses idiomatic language naturally and accurately.
8: Uses a wide resource readily and flexibly to convey precise meaning; uses less common and idiomatic vocabulary skilfully, with occasional inaccuracies; paraphrases effectively as required.
7: Uses vocabulary flexibly to discuss a variety of topics; uses some less common and idiomatic vocabulary and shows awareness of style and collocation, with some inappropriate choices; paraphrases effectively.
6: Has a wide enough vocabulary to discuss topics at length and make meaning clear in spite of inappropriacies; generally paraphrases successfully.
5: Manages to talk about familiar and unfamiliar topics but uses vocabulary with limited flexibility; attempts to paraphrase with mixed success.
4: Able to talk about familiar topics but can only convey basic meaning on unfamiliar topics; frequent errors in word choice; rarely attempts paraphrase.
3: Uses simple vocabulary to convey personal information; insufficient vocabulary for less familiar topics.`;

export const SPEAKING_GRA = `GRAMMATICAL RANGE AND ACCURACY (Speaking)
9: Uses a full range of structures naturally and appropriately; consistently accurate apart from slips characteristic of native-speaker speech.
8: Uses a wide range of structures flexibly; produces a MAJORITY of error-free sentences, with only very occasional inappropriacies or basic/non-systematic errors.
7: Uses a range of complex structures with some flexibility; FREQUENTLY produces error-free sentences, though some grammatical mistakes persist.
6: Uses a mix of simple and complex structures, but with limited flexibility; may make frequent mistakes with complex structures, though these rarely cause comprehension problems.
5: Produces basic sentence forms with reasonable accuracy; uses a limited range of more complex structures, usually containing errors that may cause some comprehension problems.
4: Produces basic sentence forms and some correct simple sentences but subordinate structures are rare; errors are frequent and may lead to misunderstanding.
3: Attempts basic sentence forms but with limited success, or relies on apparently memorised utterances; makes numerous errors except in memorised expressions.`;

export const SPEAKING_P = `PRONUNCIATION
9: Uses a full range of pronunciation features with precision and subtlety; sustains flexible use throughout; is effortless to understand.
8: Uses a wide range of pronunciation features; sustains flexible use with only occasional lapses; is easy to understand throughout; L1 accent has minimal effect on intelligibility.
7: Shows all the positive features of Band 6 and some, but not all, of the positive features of Band 8.
6: Uses a range of pronunciation features with mixed control; shows some effective use of features but this is not sustained; can generally be understood throughout, though mispronunciation of individual words or sounds reduces clarity at times.
5: Shows all the positive features of Band 4 and some, but not all, of the positive features of Band 6.
4: Uses a limited range of pronunciation features; attempts to control features but lapses are frequent; mispronunciations are frequent and cause some difficulty for the listener.
3: Shows some of the features of Band 2 (speech often unintelligible) and some, but not all, of the positive features of Band 4.
Pronunciation features = individual sounds (vowels, consonants, word endings, clusters), word stress, sentence stress, rhythm, intonation, chunking/pausing, connected speech. An accent is NOT a fault; only reduced intelligibility or strain on the listener lowers the band.`;

/** Điểm từng tiêu chí IELTS là số nguyên 0–9. */
export function wholeBand(n: unknown): number {
  const num = typeof n === 'string' ? Number(n) : n;
  const v = typeof num === 'number' && Number.isFinite(num) ? num : 0;
  return Math.max(0, Math.min(9, Math.round(v)));
}

/**
 * Band tổng = trung bình các tiêu chí, làm tròn theo quy tắc IELTS:
 * phần lẻ .25 lên .5, .75 lên số nguyên kế tiếp, còn lại làm tròn xuống nửa band gần nhất.
 */
export function overallBand(scores: number[]): number {
  if (!scores.length) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const floor = Math.floor(mean);
  const frac = mean - floor;
  const eps = 1e-9;
  if (frac >= 0.75 - eps) return floor + 1;
  if (frac >= 0.25 - eps) return floor + 0.5;
  return floor;
}

/** Chuẩn hoá để so khớp câu trích nguyên văn (bỏ khác biệt dấu nháy, khoảng trắng). */
export function normalizeForMatch(s: string): string {
  return s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
