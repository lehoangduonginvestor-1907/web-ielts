import type { WritingPrompt } from './types';

// Kho đề IELTS Writing (Task 1 & Task 2), có khung viết từng đoạn (scaffold),
// số liệu / hình minh hoạ SVG tự dựng, từ vựng chủ đề và bài mẫu tham khảo Band 7.5.

const MAP_NORBITON_SVG = `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="680" height="320" fill="#faf5ee" rx="8"/>
  <text x="170" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#3b2e28">Norbiton Industrial Area: PRESENT</text>
  <text x="510" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#2f7d69">PLANNED FUTURE DEVELOPMENT</text>
  <line x1="340" y1="18" x2="340" y2="305" stroke="#d8c5b4" stroke-dasharray="4 4"/>
  <!-- Left: Present -->
  <rect x="20" y="38" width="300" height="255" fill="#fff" stroke="#d8c5b4" rx="6"/>
  <path d="M20 75 Q170 60 320 78" fill="none" stroke="#85b8cb" stroke-width="14"/>
  <text x="170" y="79" text-anchor="middle" font-size="10" font-weight="600" fill="#245266">River</text>
  <rect x="35" y="92" width="115" height="60" fill="#e8dfd3" stroke="#8c7a70" rx="4"/>
  <text x="92" y="126" text-anchor="middle" font-size="11" fill="#3b2e28">Farmland</text>
  <line x1="170" y1="95" x2="170" y2="270" stroke="#8c7a70" stroke-width="7"/>
  <circle cx="170" cy="240" r="14" fill="#faf5ee" stroke="#8c7a70" stroke-width="5"/>
  <line x1="35" y1="240" x2="305" y2="240" stroke="#8c7a70" stroke-width="6"/>
  <rect x="195" y="125" width="48" height="32" fill="#d8c5b4" stroke="#5c4b43"/>
  <text x="219" y="145" text-anchor="middle" font-size="9" fill="#3b2e28">Factory</text>
  <rect x="252" y="115" width="52" height="36" fill="#d8c5b4" stroke="#5c4b43"/>
  <text x="278" y="137" text-anchor="middle" font-size="9" fill="#3b2e28">Factory</text>
  <rect x="195" y="180" width="48" height="32" fill="#d8c5b4" stroke="#5c4b43"/>
  <text x="219" y="200" text-anchor="middle" font-size="9" fill="#3b2e28">Factory</text>
  <rect x="255" y="182" width="48" height="30" fill="#d8c5b4" stroke="#5c4b43"/>
  <text x="279" y="201" text-anchor="middle" font-size="9" fill="#3b2e28">Factory</text>
  <text x="170" y="284" text-anchor="middle" font-size="10" fill="#5c4b43">Main Road (East–West)</text>
  <!-- Right: Future -->
  <rect x="360" y="38" width="300" height="255" fill="#fff" stroke="#d8c5b4" rx="6"/>
  <path d="M360 75 Q510 60 660 78" fill="none" stroke="#85b8cb" stroke-width="14"/>
  <rect x="503" y="64" width="14" height="26" fill="#8c7a70"/>
  <rect x="385" y="88" width="90" height="38" fill="#e1f0e4" stroke="#2f7d4a" rx="4"/>
  <text x="430" y="111" text-anchor="middle" font-size="10" font-weight="600" fill="#2f7d4a">Housing</text>
  <rect x="528" y="88" width="110" height="38" fill="#e1f0e4" stroke="#2f7d4a" rx="4"/>
  <text x="583" y="111" text-anchor="middle" font-size="10" font-weight="600" fill="#2f7d4a">Housing + Playground</text>
  <line x1="510" y1="64" x2="510" y2="270" stroke="#8c7a70" stroke-width="7"/>
  <circle cx="510" cy="240" r="14" fill="#faf5ee" stroke="#8c7a70" stroke-width="5"/>
  <circle cx="510" cy="155" r="10" fill="#faf5ee" stroke="#8c7a70" stroke-width="4"/>
  <line x1="375" y1="240" x2="645" y2="240" stroke="#8c7a70" stroke-width="6"/>
  <rect x="385" y="150" width="75" height="36" fill="#e1f0e4" stroke="#2f7d4a" rx="4"/>
  <text x="422" y="172" text-anchor="middle" font-size="10" fill="#2f7d4a">Housing</text>
  <rect x="445" y="200" width="44" height="26" fill="#fde6df" stroke="#ec7457" rx="3"/>
  <text x="467" y="217" text-anchor="middle" font-size="9" font-weight="600" fill="#c44536">Shops</text>
  <rect x="530" y="198" width="54" height="28" fill="#dff0eb" stroke="#2f7d69" rx="3"/>
  <text x="557" y="216" text-anchor="middle" font-size="9" font-weight="600" fill="#246353">Medical</text>
  <rect x="598" y="150" width="48" height="44" fill="#dff0eb" stroke="#2f7d69" rx="4"/>
  <text x="622" y="176" text-anchor="middle" font-size="10" font-weight="600" fill="#246353">School</text>
  <!-- Compass -->
  <text x="642" y="54" text-anchor="middle" font-size="10" font-weight="700" fill="#5c4b43">N ↑</text>
</svg>`;

const POLICE_BUDGET_SVG = `<svg viewBox="0 0 680 310" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="680" height="310" fill="#faf5ee" rx="8"/>
  <text x="340" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#3b2e28">Police Budget: Sources &amp; How Money Was Spent (2017–2018)</text>
  <!-- Left table: Sources -->
  <rect x="20" y="42" width="305" height="245" fill="#fff" stroke="#d8c5b4" rx="6"/>
  <text x="172" y="64" text-anchor="middle" font-size="12" font-weight="700" fill="#2f7d69">Sources (£ millions)</text>
  <g font-size="11.5" fill="#3b2e28">
    <line x1="35" y1="80" x2="310" y2="80" stroke="#eadcd0"/>
    <text x="40" y="98" font-weight="700">Source</text><text x="195" y="98" font-weight="700">2017</text><text x="260" y="98" font-weight="700">2018</text>
    <line x1="35" y1="108" x2="310" y2="108" stroke="#d8c5b4"/>
    <text x="40" y="132">National Government</text><text x="195" y="132">£175.5m</text><text x="260" y="132">£177.8m</text>
    <line x1="35" y1="146" x2="310" y2="146" stroke="#eadcd0"/>
    <text x="40" y="170">Local Taxes</text><text x="195" y="170">£91.2m</text><text x="260" y="170">£102.3m</text>
    <line x1="35" y1="184" x2="310" y2="184" stroke="#eadcd0"/>
    <text x="40" y="208">Other sources (grants)</text><text x="195" y="208">£38.0m</text><text x="260" y="208">£38.5m</text>
    <line x1="35" y1="224" x2="310" y2="224" stroke="#3b2e28"/>
    <text x="40" y="248" font-weight="700">Total</text><text x="195" y="248" font-weight="700">£304.7m</text><text x="260" y="248" font-weight="700">£318.6m</text>
  </g>
  <!-- Right bars: Expenditure -->
  <rect x="345" y="42" width="315" height="245" fill="#fff" stroke="#d8c5b4" rx="6"/>
  <text x="502" y="64" text-anchor="middle" font-size="12" font-weight="700" fill="#ec7457">How Money Was Spent (%)</text>
  <g font-size="11" fill="#3b2e28">
    <text x="360" y="96" font-weight="600">Salaries (officers &amp; staff)</text>
    <rect x="360" y="103" width="210" height="14" fill="#2f7d69" rx="2"/><text x="576" y="114">2017: 75%</text>
    <rect x="360" y="120" width="193" height="14" fill="#ec7457" rx="2"/><text x="559" y="131">2018: 69%</text>
    <text x="360" y="158" font-weight="600">Technology</text>
    <rect x="360" y="165" width="24" height="14" fill="#2f7d69" rx="2"/><text x="390" y="176">2017: 8%</text>
    <rect x="360" y="182" width="42" height="14" fill="#ec7457" rx="2"/><text x="408" y="193">2018: 14%</text>
    <text x="360" y="220" font-weight="600">Buildings &amp; Transport</text>
    <rect x="360" y="227" width="51" height="14" fill="#2f7d69" rx="2"/><text x="417" y="238">2017: 17%</text>
    <rect x="360" y="244" width="51" height="14" fill="#ec7457" rx="2"/><text x="417" y="255">2018: 17%</text>
  </g>
</svg>`;

const FAMILY_SPENDING_SVG = `<svg viewBox="0 0 680 310" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="680" height="310" fill="#faf5ee" rx="8"/>
  <text x="340" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#3b2e28">Average Family Weekly Expenditure (% of total income, 1968 vs 2018)</text>
  <rect x="25" y="38" width="630" height="252" fill="#fff" stroke="#d8c5b4" rx="6"/>
  <g font-size="11" fill="#3b2e28">
    <!-- Legend -->
    <rect x="440" y="50" width="12" height="12" fill="#2f7d69" rx="2"/><text x="457" y="60">1968</text>
    <rect x="515" y="50" width="12" height="12" fill="#ec7457" rx="2"/><text x="532" y="60">2018</text>
    <!-- Rows -->
    <text x="40" y="88">Food</text><rect x="190" y="77" width="280" height="10" fill="#2f7d69"/><text x="476" y="86">35%</text><rect x="190" y="89" width="136" height="10" fill="#ec7457"/><text x="332" y="98">17%</text>
    <text x="40" y="122">Housing</text><rect x="190" y="111" width="80" height="10" fill="#2f7d69"/><text x="276" y="120">10%</text><rect x="190" y="123" width="152" height="10" fill="#ec7457"/><text x="348" y="132">19%</text>
    <text x="40" y="156">Leisure</text><rect x="190" y="145" width="72" height="10" fill="#2f7d69"/><text x="268" y="154">9%</text><rect x="190" y="157" width="176" height="10" fill="#ec7457"/><text x="372" y="166">22%</text>
    <text x="40" y="190">Transport</text><rect x="190" y="179" width="64" height="10" fill="#2f7d69"/><text x="260" y="188">8%</text><rect x="190" y="191" width="112" height="10" fill="#ec7457"/><text x="308" y="200">14%</text>
    <text x="40" y="224">Clothing &amp; Footwear</text><rect x="190" y="213" width="80" height="10" fill="#2f7d69"/><text x="276" y="222">10%</text><rect x="190" y="225" width="40" height="10" fill="#ec7457"/><text x="236" y="234">5%</text>
    <text x="40" y="258">Fuel &amp; Power</text><rect x="190" y="247" width="48" height="10" fill="#2f7d69"/><text x="244" y="256">6%</text><rect x="190" y="259" width="32" height="10" fill="#ec7457"/><text x="228" y="268">4%</text>
  </g>
</svg>`;

const SHOP_CLOSURES_SVG = `<svg viewBox="0 0 680 310" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="680" height="310" fill="#faf5ee" rx="8"/>
  <text x="340" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#3b2e28">Number of Shop Closures and Openings in One Country (2011–2018)</text>
  <rect x="30" y="40" width="620" height="250" fill="#fff" stroke="#d8c5b4" rx="6"/>
  <!-- Grid & Y axis -->
  <g stroke="#eadcd0" stroke-width="1">
    <line x1="80" y1="80" x2="620" y2="80"/><line x1="80" y1="125" x2="620" y2="125"/>
    <line x1="80" y1="170" x2="620" y2="170"/><line x1="80" y1="215" x2="620" y2="215"/>
    <line x1="80" y1="255" x2="620" y2="255" stroke="#8c7a70"/>
  </g>
  <g font-size="10.5" fill="#5c4b43" text-anchor="end">
    <text x="72" y="84">9,000</text><text x="72" y="129">7,000</text><text x="72" y="174">5,000</text><text x="72" y="219">3,000</text><text x="72" y="259">1,000</text>
  </g>
  <!-- X labels -->
  <g font-size="11" fill="#3b2e28" text-anchor="middle">
    <text x="100" y="274">2011</text><text x="170" y="274">2012</text><text x="240" y="274">2013</text><text x="310" y="274">2014</text>
    <text x="380" y="274">2015</text><text x="450" y="274">2016</text><text x="520" y="274">2017</text><text x="590" y="274">2018</text>
  </g>
  <!-- Openings (green solid) -->
  <polyline fill="none" stroke="#2f7d69" stroke-width="3" points="100,90 170,192 240,170 310,148 380,192 450,192 520,188 590,215"/>
  <!-- Closures (ember dashed) -->
  <polyline fill="none" stroke="#ec7457" stroke-width="3" stroke-dasharray="6 4" points="100,138 170,147 240,121 310,136 380,120 450,165 520,163 590,170"/>
  <!-- Legend -->
  <line x1="410" y1="58" x2="435" y2="58" stroke="#2f7d69" stroke-width="3"/><text x="442" y="62" font-size="11" fill="#3b2e28">Openings</text>
  <line x1="515" y1="58" x2="540" y2="58" stroke="#ec7457" stroke-width="3" stroke-dasharray="6 4"/><text x="547" y="62" font-size="11" fill="#3b2e28">Closures</text>
</svg>`;

const PROCESS_PLASTIC_SVG = `<svg viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="680" height="280" fill="#faf5ee" rx="8"/>
  <text x="340" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#3b2e28">Process of Recycling Used Plastic Bottles</text>
  <g fill="#fff" stroke="#2f7d69" stroke-width="1.5">
    <rect x="25" y="48" width="135" height="58" rx="8"/><rect x="190" y="48" width="135" height="58" rx="8"/>
    <rect x="355" y="48" width="135" height="58" rx="8"/><rect x="520" y="48" width="135" height="58" rx="8"/>
    <rect x="520" y="165" width="135" height="58" rx="8"/><rect x="355" y="165" width="135" height="58" rx="8"/>
    <rect x="190" y="165" width="135" height="58" rx="8"/><rect x="25" y="165" width="135" height="58" rx="8"/>
  </g>
  <g font-size="11" fill="#3b2e28" text-anchor="middle" font-weight="600">
    <text x="92" y="73">1. Disposal in</text><text x="92" y="89">recycling bins</text>
    <text x="257" y="73">2. Collection by</text><text x="257" y="89">trucks → plant</text>
    <text x="422" y="73">3. Manual sorting</text><text x="422" y="89">by colour &amp; type</text>
    <text x="587" y="73">4. Compression</text><text x="587" y="89">into large blocks</text>
    <text x="587" y="190">5. Crushing into</text><text x="587" y="206">small plastic flakes</text>
    <text x="422" y="190">6. Washing &amp;</text><text x="422" y="206">drying flakes</text>
    <text x="257" y="190">7. Melting &amp;</text><text x="257" y="206">forming pellets</text>
    <text x="92" y="190">8. Manufacturing</text><text x="92" y="206">new products</text>
  </g>
  <g stroke="#ec7457" stroke-width="2" fill="none">
    <path d="M162 77 L186 77"/><path d="M327 77 L351 77"/><path d="M492 77 L516 77"/>
    <path d="M587 110 L587 160"/>
    <path d="M516 194 L494 194"/><path d="M351 194 L329 194"/><path d="M186 194 L164 194"/>
  </g>
</svg>`;

const TABLE_SUBWAY_SVG = `<svg viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="680" height="280" fill="#faf5ee" rx="8"/>
  <text x="340" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#3b2e28">Underground Railway Systems in Six Major Cities</text>
  <rect x="24" y="42" width="632" height="216" fill="#fff" stroke="#d8c5b4" rx="6"/>
  <rect x="24" y="42" width="632" height="34" fill="#dff0eb" rx="6"/>
  <g font-size="11.5" fill="#246353" font-weight="700">
    <text x="45" y="63">City</text><text x="190" y="63">Date opened</text><text x="335" y="63">Route length (km)</text><text x="500" y="63">Passengers / year (millions)</text>
  </g>
  <g font-size="11.5" fill="#3b2e28">
    <text x="45" y="98" font-weight="600">London</text><text x="190" y="98">1863</text><text x="360" y="98">394</text><text x="545" y="98">775</text>
    <line x1="36" y1="110" x2="644" y2="110" stroke="#eadcd0"/>
    <text x="45" y="130" font-weight="600">Paris</text><text x="190" y="130">1900</text><text x="360" y="130">199</text><text x="545" y="130">1,191</text>
    <line x1="36" y1="142" x2="644" y2="142" stroke="#eadcd0"/>
    <text x="45" y="162" font-weight="600">Tokyo</text><text x="190" y="162">1927</text><text x="360" y="162">155</text><text x="545" y="162">1,927</text>
    <line x1="36" y1="174" x2="644" y2="174" stroke="#eadcd0"/>
    <text x="45" y="194" font-weight="600">Washington DC</text><text x="190" y="194">1976</text><text x="360" y="194">126</text><text x="545" y="194">144</text>
    <line x1="36" y1="206" x2="644" y2="206" stroke="#eadcd0"/>
    <text x="45" y="226" font-weight="600">Kyoto</text><text x="190" y="226">1981</text><text x="360" y="226">11</text><text x="545" y="226">45</text>
    <line x1="36" y1="236" x2="644" y2="236" stroke="#eadcd0"/>
    <text x="45" y="251" font-weight="600">Los Angeles</text><text x="190" y="251">2001</text><text x="360" y="251">28</text><text x="545" y="251">50</text>
  </g>
</svg>`;

const TASK1_SCAFFOLD = [
  {
    id: 'intro',
    label: '1. Introduction (Mở bài)',
    hint: 'Paraphrase lại câu đề bài trong 1–2 câu: biểu đồ cho thấy gì, ở đâu và vào mốc thời gian nào.',
    starters: ['The given diagrams illustrate...', 'The chart compares the percentage of...', 'The table provides data regarding...'],
    minWords: 22,
  },
  {
    id: 'overview',
    label: '2. Overview (Tổng quan — Bắt buộc)',
    hint: 'Nêu 2 đặc điểm lớn nhất (xu hướng chung, chênh lệch nổi bật nhất) mà không đưa số liệu chi tiết.',
    starters: ['Overall, it is clear that...', 'In general, the most noticeable trend is that...', 'Overall, significant changes are planned...'],
    minWords: 32,
  },
  {
    id: 'body1',
    label: '3. Body 1 (Nhóm chi tiết 1)',
    hint: 'Mô tả nhóm dữ liệu hoặc khu vực đầu tiên kèm số liệu đối chiếu chính xác.',
    starters: ['Looking at the details, ...', 'In terms of ..., the figure stood at...', 'To the north of the area, ...'],
    minWords: 48,
  },
  {
    id: 'body2',
    label: '4. Body 2 (Nhóm chi tiết 2)',
    hint: 'Trình bày phần còn lại, so sánh điểm tương phản, mốc giao nhau hoặc bước kết thúc.',
    starters: ['By contrast, ...', 'Turning to the remaining categories, ...', 'In the subsequent stages, ...'],
    minWords: 48,
  },
];

const TASK2_SCAFFOLD = [
  {
    id: 'intro',
    label: '1. Introduction (Mở bài)',
    hint: 'Câu 1: Paraphrase bối cảnh của đề. Câu 2: Trả lời thẳng câu hỏi/lập trường của bạn.',
    starters: ['In recent years, ... has sparked considerable debate.', 'While some argue that..., I believe that...', 'This essay will examine the reasons behind...'],
    minWords: 35,
  },
  {
    id: 'body1',
    label: '2. Body 1 (Luận điểm 1 — Khung PEEL)',
    hint: 'Point (câu chủ đề) → Explain (vì sao/cơ chế) → Example (ví dụ thực tế) → Link.',
    starters: ['On the one hand, there are compelling reasons why...', 'One primary factor driving this trend is that...', 'To illustrate, ...'],
    minWords: 85,
  },
  {
    id: 'body2',
    label: '3. Body 2 (Luận điểm 2 — Khung PEEL)',
    hint: 'Phát triển mặt còn lại hoặc luận điểm mạnh hơn của bạn theo đúng cấu trúc PEEL.',
    starters: ['On the other hand, I would contend that...', 'Furthermore, effective solutions require...', 'For instance, ...'],
    minWords: 85,
  },
  {
    id: 'conclusion',
    label: '4. Conclusion (Kết bài)',
    hint: 'Nhắc lại lập trường và tóm tắt hai ý chính bằng từ ngữ khác. Không đưa ý mới.',
    starters: ['In conclusion, although..., I firmly believe that...', 'To sum up, this issue stems from..., and can be addressed by...'],
    minWords: 30,
  },
];

export const WRITING_PROMPTS: WritingPrompt[] = [
  // ---- TASK 1 ----
  {
    id: 'w-c17t1-t1',
    task: 'task1',
    category: 'map',
    categoryLabel: 'Map (Bản đồ)',
    title: 'Norbiton Industrial Area: Hiện tại & Quy hoạch',
    book: 17,
    test: 1,
    prompt:
      'The maps below show an industrial area in the town of Norbiton, and planned future development of the site.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    chartSvg: MAP_NORBITON_SVG,
    chartSummary:
      'Present map: River along the north; farmland in the northwest; north-south road connecting to a roundabout and east-west main road; four factories east of the north-south road. Future plan: all factories demolished; bridge built across the river; new housing areas built north of the river (west and east with playground) and west of the north-south road; smaller roundabout added midway; shops south-west of the inner area; medical centre south of the main housing block; school in the east.',
    minWords: 150,
    recommendedMinutes: 20,
    scaffold: TASK1_SCAFFOLD,
    sampleBand7:
      'The two maps illustrate the current layout of the Norbiton industrial site and the proposed redevelopment plans for the area in the future.\n\nOverall, the site is set to undergo a complete transformation from an industrial zone into a predominantly residential neighbourhood, with all existing factories demolished to make way for housing and community facilities.\n\nCurrently, the area is bordered by a river to the north, with farmland occupying the north-western corner. A vertical road runs southward from the river to a roundabout connecting with the main east-west road. All four existing factories are clustered to the east of this vertical road.\n\nUnder the future plan, the factories and farmland will be cleared entirely. A bridge will be constructed over the river, leading north to newly built housing and a playground. Inside the central area, additional housing will replace the western farmland, supported by a smaller roundabout, shops, a medical centre, and a school in the east.',
    keyVocab: [
      { word: 'undergo a transformation', pos: 'v.phr', vi: 'trải qua sự biến đổi lớn', context: 'The site is set to undergo a complete transformation.' },
      { word: 'make way for', pos: 'v.phr', vi: 'nhường chỗ cho', context: 'Old factories will be demolished to make way for housing.' },
      { word: 'predominantly residential', pos: 'adj.phr', vi: 'chủ yếu là khu dân cư', context: 'It will become a predominantly residential neighbourhood.' },
      { word: 'clustered', pos: 'adj', vi: 'tập trung thành cụm', context: 'All four factories are clustered to the east of the road.' },
    ],
  },
  {
    id: 'w-c17t2-t1',
    task: 'task1',
    category: 'table',
    categoryLabel: 'Table & Chart (Hỗn hợp)',
    title: 'Nguồn thu & Chi tiêu Ngân sách Cảnh sát (2017–2018)',
    book: 17,
    test: 2,
    prompt:
      'The table and charts below give information on the police budget for 2017 and 2018 in one area of Britain. The table shows where the money came from and the charts show how it was distributed.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    chartSvg: POLICE_BUDGET_SVG,
    chartSummary:
      'Sources (£ millions): National Government 175.5 (2017) -> 177.8 (2018); Local Taxes 91.2 -> 102.3; Other sources (grants) 38.0 -> 38.5; Total 304.7 -> 318.6. Expenditure (%): Salaries 75% (2017) -> 69% (2018); Technology 8% -> 14%; Buildings & Transport stayed at 17% in both years.',
    minWords: 150,
    recommendedMinutes: 20,
    scaffold: TASK1_SCAFFOLD,
    sampleBand7:
      'The table details the funding sources for a British police force in 2017 and 2018, while the bar charts compare how the budget was allocated across three expenditure categories.\n\nOverall, the total police budget rose modestly over the two-year period, driven primarily by local taxes. In terms of spending, staff salaries consistently consumed the vast majority of funds, though the share devoted to technology nearly doubled.\n\nIn 2017, total revenue stood at £304.7 million, increasing to £318.6 million in 2018. National government funding remained the largest contributor, edging up slightly from £175.5 million to £177.8 million. Meanwhile, income from local taxes saw the sharpest growth, rising by over £11 million to £102.3 million, whereas other grants stayed almost flat around £38 million.\n\nRegarding distribution, officers and staff salaries fell from 75% in 2017 to 69% in 2018. Conversely, spending on technology surged from 8% to 14%, while buildings and transport remained unchanged at 17%.',
    keyVocab: [
      { word: 'allocate', pos: 'v', vi: 'phân bổ (ngân sách, nguồn lực)', context: 'The charts show how the budget was allocated across categories.' },
      { word: 'consume the vast majority', pos: 'v.phr', vi: 'chiếm phần lớn áp đảo', context: 'Staff salaries consistently consumed the vast majority of funds.' },
      { word: 'edge up slightly', pos: 'v.phr', vi: 'tăng nhẹ từng chút', context: 'Government funding edged up slightly from £175.5m to £177.8m.' },
      { word: 'remain unchanged', pos: 'v.phr', vi: 'giữ nguyên không đổi', context: 'Spending on buildings and transport remained unchanged at 17%.' },
    ],
  },
  {
    id: 'w-c17t3-t1',
    task: 'task1',
    category: 'bar',
    categoryLabel: 'Bar Chart (Biểu đồ cột)',
    title: 'Chi tiêu hàng tuần của gia đình (1968 vs 2018)',
    book: 17,
    test: 3,
    prompt:
      'The chart below gives information about how families in one country spent their weekly income in 1968 and in 2018.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    chartSvg: FAMILY_SPENDING_SVG,
    chartSummary:
      'Weekly household income shares (%): Food dropped from 35% (1968) to 17% (2018). Housing rose from 10% to 19%. Leisure surged from 9% to 22% (highest in 2018). Transport increased from 8% to 14%. Clothing & Footwear halved from 10% to 5%. Fuel & Power fell slightly from 6% to 4%.',
    minWords: 150,
    recommendedMinutes: 20,
    scaffold: TASK1_SCAFFOLD,
    sampleBand7:
      'The bar chart compares the proportion of weekly income that households in a particular nation allocated to six categories in 1968 and 2018.\n\nOverall, spending patterns shifted markedly over the half-century: while food dominated budgets in 1968, leisure and housing became the leading areas of expenditure by 2018.\n\nIn 1968, food accounted for 35% of weekly income, more than triple the share of any other item. By 2018, however, this figure had more than halved to 17%. Similarly, proportions spent on clothing and footwear fell by half from 10% to 5%, and fuel and power declined slightly from 6% to 4%.\n\nIn contrast, expenditure on non-essential and accommodation items grew substantially. Leisure experienced the steepest rise, jumping from 9% in 1968 to 22% in 2018 to become the largest single category. Housing nearly doubled from 10% to 19%, while transport rose from 8% to 14%.',
    keyVocab: [
      { word: 'proportion of', pos: 'n.phr', vi: 'tỷ lệ của', context: 'The chart compares the proportion of weekly income spent on six items.' },
      { word: 'more than halve', pos: 'v.phr', vi: 'giảm hơn một nửa', context: 'The figure for food more than halved over the period.' },
      { word: 'spending patterns', pos: 'n.phr', vi: 'xu hướng / mô hình chi tiêu', context: 'Household spending patterns shifted markedly between 1968 and 2018.' },
      { word: 'steepest rise', pos: 'n.phr', vi: 'mức tăng dốc / mạnh nhất', context: 'Leisure experienced the steepest rise, jumping from 9% to 22%.' },
    ],
  },
  {
    id: 'w-c17t4-t1',
    task: 'task1',
    category: 'line',
    categoryLabel: 'Line Graph (Biểu đồ đường)',
    title: 'Số cửa hàng đóng cửa và mở mới (2011–2018)',
    book: 17,
    test: 4,
    prompt:
      'The graph below shows the number of shops that closed and the number of new shops that opened in one country between 2011 and 2018.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    chartSvg: SHOP_CLOSURES_SVG,
    chartSummary:
      'Openings: started at ~8,500 in 2011, plunged to ~4,000 in 2012, recovered to ~6,000 in 2014, then fell back to ~4,000 (2015–2017) and ended at ~3,000 in 2018. Closures: started at ~6,400 in 2011, fluctuated between ~6,000 and ~7,200 (peaking in 2013 & 2015), dropped sharply to ~5,100 in 2016, and ended around ~5,000 in 2018.',
    minWords: 150,
    recommendedMinutes: 20,
    scaffold: TASK1_SCAFFOLD,
    sampleBand7:
      'The line graph tracks annual shop closures and openings in one country over an eight-year period from 2011 to 2018.\n\nOverall, both figures saw an overall downward trend, with shop openings declining much more sharply than closures. From 2012 onwards, closures consistently outnumbered new openings.\n\nIn 2011, approximately 8,500 new shops opened, outstripping closures at around 6,400. However, openings plummeted by more than half to roughly 4,000 in 2012. Although they rebounded to about 6,000 by 2014, the figure fell back to 4,000 in 2015 and ended at a low of around 3,000 in 2018.\n\nMeanwhile, shop closures fluctuated more moderately between 6,000 and just over 7,000 from 2011 to 2015, reaching their highest levels in 2013 and 2015. Thereafter, closures dropped markedly to around 5,100 in 2016 and remained steady near 5,000 until 2018.',
    keyVocab: [
      { word: 'outnumber', pos: 'v', vi: 'nhiều hơn về số lượng', context: 'From 2012 onwards, closures consistently outnumbered new openings.' },
      { word: 'plummet', pos: 'v', vi: 'rơi tự do / giảm mạnh đột ngột', context: 'Shop openings plummeted by more than half in 2012.' },
      { word: 'rebound', pos: 'v', vi: 'phục hồi / tăng trở lại', context: 'They rebounded to roughly 6,000 by 2014.' },
      { word: 'downward trend', pos: 'n.phr', vi: 'xu hướng đi xuống', context: 'Both metrics followed a downward trend over the eight-year span.' },
    ],
  },
  {
    id: 'w-process-01',
    task: 'task1',
    category: 'process',
    categoryLabel: 'Process (Quy trình)',
    title: 'Quy trình tái chế chai nhựa đã qua sử dụng',
    prompt:
      'The diagram below shows the process of recycling used plastic bottles.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    chartSvg: PROCESS_PLASTIC_SVG,
    chartSummary:
      '8-step linear recycling cycle: (1) Disposal of used bottles into recycling bins -> (2) Collection by trucks to recycling plant -> (3) Manual sorting by colour & plastic type -> (4) Compression into large blocks -> (5) Crushing into small plastic flakes -> (6) Washing and drying flakes -> (7) Melting and forming raw pellets -> (8) Manufacturing new plastic products.',
    minWords: 150,
    recommendedMinutes: 20,
    scaffold: TASK1_SCAFFOLD,
    sampleBand7:
      'The diagram outlines the sequential stages involved in recycling used plastic bottles into new commercial products.\n\nOverall, this man-made linear process comprises eight main stages, progressing from waste collection and sorting to mechanical processing and remoulding into usable raw material.\n\nInitially, discarded plastic bottles are placed in dedicated recycling bins before being collected by trucks and transported to a processing facility. Upon arrival, the bottles undergo manual sorting according to colour and plastic grade to ensure purity. Next, the sorted items are compressed into large, dense blocks for easier handling.\n\nIn the subsequent phase, these blocks are fed into a crusher to produce tiny plastic flakes, which are thoroughly washed and dried to remove impurities. Once clean, the flakes are melted down and shaped into pellets. Finally, these recycled pellets serve as raw material to manufacture brand-new products.',
    keyVocab: [
      { word: 'sequential stages', pos: 'n.phr', vi: 'các giai đoạn nối tiếp nhau', context: 'The diagram outlines eight sequential stages of recycling.' },
      { word: 'remove impurities', pos: 'v.phr', vi: 'loại bỏ tạp chất', context: 'The crushed flakes are washed thoroughly to remove impurities.' },
      { word: 'subsequent phase', pos: 'n.phr', vi: 'giai đoạn tiếp theo', context: 'In the subsequent phase, the compressed blocks are crushed.' },
      { word: 'serve as raw material', pos: 'v.phr', vi: 'đóng vai trò làm nguyên liệu thô', context: 'The pellets serve as raw material for manufacturing new items.' },
    ],
  },
  {
    id: 'w-table-01',
    task: 'task1',
    category: 'table',
    categoryLabel: 'Table (Bảng số liệu)',
    title: 'Hệ thống tàu điện ngầm tại sáu thành phố lớn',
    prompt:
      'The table below gives information about the underground railway systems in six cities.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    chartSvg: TABLE_SUBWAY_SVG,
    chartSummary:
      'London (1863, 394 km, 775m passengers/year); Paris (1900, 199 km, 1,191m); Tokyo (1927, 155 km, 1,927m); Washington DC (1976, 126 km, 144m); Kyoto (1981, 11 km, 45m); Los Angeles (2001, 28 km, 50m).',
    minWords: 150,
    recommendedMinutes: 20,
    scaffold: TASK1_SCAFFOLD,
    sampleBand7:
      'The table compares six major cities in terms of the opening dates, route lengths, and annual passenger numbers of their underground railway networks.\n\nOverall, the three older systems in London, Paris, and Tokyo are substantially larger and far busier than the newer networks in Washington DC, Kyoto, and Los Angeles. Notably, Tokyo serves the largest volume of passengers despite having a shorter track than London or Paris.\n\nLondon boasts the oldest and most extensive network, having opened in 1863 and spanning 394 km, serving 775 million riders annually. Paris, built in 1900, covers roughly half London’s length at 199 km yet carries significantly more commuters at 1,191 million. Tokyo’s system (1927), though measuring only 155 km, handles a record 1,927 million passengers per year.\n\nConversely, the three networks established after 1975 are much smaller. Washington DC operates 126 km with 144 million annual riders, whereas Kyoto (11 km) and Los Angeles (28 km) carry just 45 and 50 million passengers respectively.',
    keyVocab: [
      { word: 'extensive network', pos: 'n.phr', vi: 'mạng lưới rộng lớn', context: 'London operates the oldest and most extensive underground network.' },
      { word: 'annual passenger volume', pos: 'n.phr', vi: 'lượng hành khách hàng năm', context: 'Tokyo records the highest annual passenger volume at 1,927 million.' },
      { word: 'respectively', pos: 'adv', vi: 'lần lượt là', context: 'Kyoto and Los Angeles carry 45 and 50 million passengers respectively.' },
      { word: 'span', pos: 'v', vi: 'trải dài (khoảng cách)', context: 'The network spans 394 kilometres across the capital.' },
    ],
  },

  // ---- TASK 2 ----
  {
    id: 'w-c17t1-t2',
    task: 'task2',
    category: 'opinion',
    categoryLabel: 'Opinion (Ưu / Nhược)',
    title: 'Chấp nhận rủi ro trong công việc và cuộc sống',
    book: 17,
    test: 1,
    prompt:
      'It is important for people to take risks, both in their professional lives and their personal lives.\n\nDo you think the advantages of taking risks outweigh the disadvantages?',
    minWords: 250,
    recommendedMinutes: 40,
    scaffold: TASK2_SCAFFOLD,
    sampleBand7:
      'Taking calculated risks is often viewed as essential for growth in both career and personal development. Although stepping into uncertainty carries clear downsides such as financial loss or emotional stress, I firmly believe the long-term benefits far outweigh these drawbacks.\n\nOn the one hand, reckless risk-taking can expose individuals to severe setbacks. In professional life, quitting a stable job to launch a business without adequate preparation may lead to debt and prolonged anxiety. Similarly, making impulsive personal decisions—such as relocating abroad without researching the local job market—can isolate people from their support networks. Therefore, risks undertaken without foresight clearly threaten stability.\n\nOn the other hand, measured risks drive progress, innovation, and self-confidence. Professionally, employees who volunteer for unfamiliar projects or switch industries often acquire rare skills and accelerate their promotion prospects. For example, many successful founders had to leave secure corporate roles before discovering viable business ideas. On a personal level, embracing unfamiliar experiences helps individuals overcome self-doubt and build resilience that cannot be gained inside a comfort zone.\n\nIn conclusion, while poorly planned risks can result in financial or emotional harm, the rewards of taking thoughtful risks—namely career advancement and personal resilience—are significantly greater.',
    keyVocab: [
      { word: 'calculated risk', pos: 'n.phr', vi: 'rủi ro đã được tính toán kỹ', context: 'Taking calculated risks is essential for long-term career growth.' },
      { word: 'outweigh the drawbacks', pos: 'v.phr', vi: 'vượt trội hơn các mặt hạn chế', context: 'The personal and professional benefits outweigh the drawbacks.' },
      { word: 'build resilience', pos: 'v.phr', vi: 'rèn luyện sự kiên cường', context: 'Stepping outside one’s comfort zone helps build resilience.' },
      { word: 'severe setbacks', pos: 'n.phr', vi: 'những thất bại / trở ngại lớn', context: 'Reckless decisions can expose individuals to severe setbacks.' },
    ],
  },
  {
    id: 'w-c17t2-t2',
    task: 'task2',
    category: 'two_part',
    categoryLabel: 'Two-Part Question',
    title: 'Trẻ em dành nhiều giờ dùng điện thoại thông minh',
    book: 17,
    test: 2,
    prompt:
      'Some children spend hours every day on their smartphones.\n\nWhy is this the case? Do you think this is a positive or a negative development?',
    minWords: 250,
    recommendedMinutes: 40,
    scaffold: TASK2_SCAFFOLD,
    sampleBand7:
      'It is increasingly common to see young children spending several hours a day glued to smartphone screens. This trend stems mainly from algorithmic app design and busy parenting schedules, and despite minor educational benefits, I consider it a largely negative development.\n\nTwo key factors explain children’s excessive screen time. Firstly, social media and gaming platforms are engineered to trigger instant dopamine rewards through endless short videos and notifications, making it hard for young users with developing self-control to stop. Secondly, overworked parents frequently hand smartphones to children as a convenient digital babysitter during meals or commutes, inadvertently reinforcing daily dependency.\n\nAlthough smartphones provide quick access to language apps and educational videos, the harms to physical and mental wellbeing are far more concerning. Prolonged sedentary screen use contributes to poor posture, eye strain, and sleep disruption caused by blue light. Furthermore, replacing face-to-face play with virtual interaction can hinder social skills and shorten attention spans, leaving children struggling to focus on traditional classroom tasks.\n\nIn conclusion, children’s heavy smartphone use is driven by addictive app design and parental convenience. Because it impairs physical health, sleep, and real-world social development, it should be viewed as an overwhelmingly negative trend.',
    keyVocab: [
      { word: 'excessive screen time', pos: 'n.phr', vi: 'thời gian nhìn màn hình quá mức', context: 'Two major factors drive children’s excessive screen time.' },
      { word: 'develop self-control', pos: 'v.phr', vi: 'phát triển khả năng tự kiểm soát', context: 'Children are still developing self-control against addictive feeds.' },
      { word: 'sedentary lifestyle', pos: 'n.phr', vi: 'lối sống ít vận động', context: 'Prolonged phone use encourages a sedentary lifestyle.' },
      { word: 'attention span', pos: 'n.phr', vi: 'khoảng thời gian tập trung', context: 'Short-form videos can noticeably shorten children’s attention spans.' },
    ],
  },
  {
    id: 'w-c17t3-t2',
    task: 'task2',
    category: 'discussion',
    categoryLabel: 'Discussion + Opinion',
    title: 'Bác sĩ & Kỹ sư có nên bị ràng buộc làm việc trong nước?',
    book: 17,
    test: 3,
    prompt:
      'Some people believe that professionals, such as doctors and engineers, should be required to work in the country where they did their training. Others believe they should be free to work in another country if they wish.\n\nDiscuss both views and give your own opinion.',
    minWords: 250,
    recommendedMinutes: 40,
    scaffold: TASK2_SCAFFOLD,
    sampleBand7:
      'Whether skilled graduates such as doctors and engineers should be obligated to serve in the nation that trained them remains a contentious issue. While compelling professionals to stay helps protect domestic public services, I believe individuals should retain the freedom to work abroad, provided reasonable incentives are used instead of strict bans.\n\nSupporters of mandatory domestic service emphasize public investment and brain drain. In many countries, university education—especially medical school—is heavily subsidized by taxpayers. When top graduates emigrate immediately for higher salaries, local hospitals and infrastructure projects suffer acute skill shortages. Requiring graduates to work locally for a few years seems a fair return on national investment.\n\nHowever, restricting labour mobility infringes on personal autonomy and can backfire on career quality. Doctors and engineers often seek overseas posts to access advanced research equipment, specialized training, and better working conditions. Forcing unwilling professionals to remain in under-resourced workplaces may lower motivation and service quality. Instead, governments can retain talent more effectively by improving pay, upgrading facilities, or offering loan forgiveness for local service.\n\nIn conclusion, although protecting domestic workforces against brain drain is vital, freedom of movement should be respected. Positive incentives, rather than legal restrictions, offer a fairer and more sustainable solution.',
    keyVocab: [
      { word: 'brain drain', pos: 'n.phr', vi: 'chảy máu chất xám', context: 'Developing nations often suffer from severe brain drain.' },
      { word: 'heavily subsidized', pos: 'adj.phr', vi: 'được trợ cấp lớn (từ nhà nước)', context: 'Medical degrees are heavily subsidized by taxpayers.' },
      { word: 'infringe on personal autonomy', pos: 'v.phr', vi: 'xâm phạm quyền tự do cá nhân', context: 'Strict travel bans infringe on personal autonomy.' },
      { word: 'retain talent', pos: 'v.phr', vi: 'giữ chân nhân tài', context: 'Better working conditions help countries retain top talent.' },
    ],
  },
  {
    id: 'w-c17t4-t2',
    task: 'task2',
    category: 'advantages',
    categoryLabel: 'Positive / Negative',
    title: 'Xu hướng dùng y học thay thế thay vì đi khám bác sĩ',
    book: 17,
    test: 4,
    prompt:
      'Nowadays, a growing number of people with health problems are trying alternative medicines and treatments instead of visiting their usual doctor.\n\nDo you think this is a positive or a negative development?',
    minWords: 250,
    recommendedMinutes: 40,
    scaffold: TASK2_SCAFFOLD,
    sampleBand7:
      'In recent years, an increasing proportion of patients have turned to alternative therapies—such as herbal remedies and acupuncture—rather than consulting conventional doctors. Although complementary practices can support mild symptom relief, relying on them as a replacement for clinical care is largely a negative development.\n\nAdmittedly, certain alternative approaches offer genuine benefits when used sensibly. Practices like acupuncture, yoga, and herbal teas often help patients manage chronic stress, minor aches, or sleep problems with fewer chemical side effects than prescription drugs. Moreover, holistic practitioners typically spend more time listening to patients, which can foster emotional reassurance.\n\nNevertheless, substituting unproven treatments for evidence-based medicine poses serious health risks. Modern diagnostic tools—including blood tests and imaging scans—allow physicians to detect life-threatening illnesses such as cancer or heart disease at an early stage. Delaying standard medical care while relying solely on alternative remedies can allow treatable conditions to worsen irreversibly. Furthermore, many unregulated supplements lack clinical safety testing and may interact dangerously with existing medications.\n\nIn conclusion, while complementary therapies have value alongside standard care, abandoning conventional doctors in favour of alternative treatments carries unacceptable medical risks and is therefore a negative trend.',
    keyVocab: [
      { word: 'evidence-based medicine', pos: 'n.phr', vi: 'y học dựa trên bằng chứng khoa học', context: 'Patients should not replace evidence-based medicine with unproven remedies.' },
      { word: 'life-threatening illness', pos: 'n.phr', vi: 'căn bệnh đe dọa tính mạng', context: 'Early scans help doctors detect life-threatening illnesses.' },
      { word: 'unregulated supplements', pos: 'n.phr', vi: 'thực phẩm bổ sung không được kiểm soát', context: 'Unregulated supplements may cause unexpected side effects.' },
      { word: 'complementary therapy', pos: 'n.phr', vi: 'liệu pháp bổ trợ', context: 'Acupuncture works best as a complementary therapy.' },
    ],
  },
  {
    id: 'w-prob-01',
    task: 'task2',
    category: 'problem_solution',
    categoryLabel: 'Causes & Solutions',
    title: 'Ùn tắc giao thông và ô nhiễm không khí ở đô thị',
    prompt:
      'In many cities, traffic congestion and air pollution are growing worse.\n\nWhat are the main causes of these problems, and what measures can governments and individuals take to tackle them?',
    minWords: 250,
    recommendedMinutes: 40,
    scaffold: TASK2_SCAFFOLD,
    sampleBand7:
      'Worsening traffic congestion and urban air pollution have become urgent challenges in major cities worldwide. These issues stem largely from rising private vehicle ownership and inadequate public transit, and addressing them requires coordinated government investment alongside shifts in commuter habits.\n\nTwo primary causes drive urban gridlock and poor air quality. First, rapid urbanization and rising disposable incomes have enabled more residents to purchase private cars and motorbikes, saturating roads built decades ago. Second, when bus and metro networks are unreliable, overcrowded, or poorly connected to suburbs, citizens feel compelled to commute by private transport, releasing huge volumes of exhaust fumes daily.\n\nTackling these problems demands action from both authorities and individuals. Governments should prioritize expanding clean, punctual public transport—such as electric buses and underground lines—while introducing congestion charges or low-emission zones in city centres to discourage unnecessary driving. On an individual level, commuters can carpool with colleagues, cycle for short trips, or work remotely where possible to reduce peak-hour traffic.\n\nIn conclusion, urban congestion and pollution are fuelled by car dependency and weak transit infrastructure. Only through improved public transport policies and responsible daily travel choices can cities restore cleaner air and smoother mobility.',
    keyVocab: [
      { word: 'private vehicle ownership', pos: 'n.phr', vi: 'tỷ lệ sở hữu phương tiện cá nhân', context: 'Rising private vehicle ownership overwhelms narrow city streets.' },
      { word: 'inadequate public transit', pos: 'n.phr', vi: 'giao thông công cộng chưa đáp ứng', context: 'Inadequate public transit forces commuters to rely on cars.' },
      { word: 'congestion charge', pos: 'n.phr', vi: 'phí chống ùn tắc giao thông', context: 'Congestion charges discourage unnecessary driving into city centres.' },
      { word: 'exhaust fumes', pos: 'n.phr', vi: 'khí thải xe cộ', context: 'Heavy traffic produces toxic exhaust fumes every morning.' },
    ],
  },
  {
    id: 'w-twopart-01',
    task: 'task2',
    category: 'two_part',
    categoryLabel: 'Two-Part Question',
    title: 'Tiêu dùng hàng hóa ngày càng tăng và hạnh phúc',
    prompt:
      'In many countries today, people buy more household goods and clothes than ever before.\n\nWhy is this happening? Does it make people’s lives happier?',
    minWords: 250,
    recommendedMinutes: 40,
    scaffold: TASK2_SCAFFOLD,
    sampleBand7:
      'Modern consumers purchase far more clothing and household items than previous generations. This surge in consumption is fuelled by fast-fashion pricing and targeted digital marketing, yet beyond meeting basic comfort, it rarely delivers lasting happiness.\n\nAggressive marketing and falling production costs largely explain why people buy so much. Globalized supply chains allow retailers to sell trendy garments and gadgets at remarkably low prices, encouraging impulsive replacement rather than repair. Simultaneously, social media influencers and personalized advertisements constantly expose shoppers to curated lifestyles, manufacturing artificial desires for the newest products.\n\nWhile owning practical appliances saves household time and improves physical comfort, excessive shopping fails to generate genuine wellbeing. Psychologists note that the excitement of acquiring a new item fades quickly—a phenomenon known as hedonic adaptation—leaving consumers craving the next purchase. Worse still, chasing material status often pushes households into debt and creates clutter and environmental guilt, which undermines overall life satisfaction.\n\nIn conclusion, cheap mass production and persuasive digital advertising drive record levels of consumption. Although essential goods improve convenience, perpetual shopping offers only fleeting pleasure rather than true happiness.',
    keyVocab: [
      { word: 'impulsive purchase', pos: 'n.phr', vi: 'mua sắm bốc đồng', context: 'Flash sales encourage impulsive purchases online.' },
      { word: 'fleeting pleasure', pos: 'n.phr', vi: 'niềm vui thoáng qua', context: 'Material possessions bring only fleeting pleasure.' },
      { word: 'targeted marketing', pos: 'n.phr', vi: 'tiếp thị nhắm đúng đối tượng', context: 'Targeted marketing constantly tempts shoppers with new trends.' },
      { word: 'life satisfaction', pos: 'n.phr', vi: 'sự hài lòng với cuộc sống', context: 'Debt and clutter can gradually erode life satisfaction.' },
    ],
  },
];

export function findWritingPrompt(id: string): WritingPrompt | undefined {
  return WRITING_PROMPTS.find(p => p.id === id);
}
