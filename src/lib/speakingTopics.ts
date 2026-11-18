import type { SpeakingTopic } from './types';

// Kho đề IELTS Speaking (đủ 3 Part theo chuẩn Cambridge & các chủ đề thi thật hay gặp).

export const SPEAKING_TOPICS: SpeakingTopic[] = [
  {
    id: 's-c17t1',
    title: 'History & Outdoor Adventure',
    themeVi: 'Lịch sử · Hoạt động ngoài trời & Chấp nhận rủi ro',
    book: 17,
    test: 1,
    part1: {
      topic: 'History',
      questions: [
        'Did you enjoy learning history when you were at school?',
        'When was the last time you read a book or watched a film about history?',
        'Do you think history is an important subject for children today?',
        'Is there a historical place in your country you would like to visit?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a place where you went to do an outdoor activity.',
      bullets: [
        'where this place is',
        'when you went there',
        'what outdoor activity you did there',
        'and explain how you felt about the experience.',
      ],
      followUp: 'Would you like to go back to that place again?',
      prepHintsVi: [
        'Chọn 1 chuyến đi thật (leo núi, đạp xe ven hồ, cắm trại cuối tuần).',
        'Chuẩn bị 3–4 từ tả cảnh: lush greenery, fresh air, scenic trail, steep path.',
        'Kể 1 chi tiết nhỏ (trời bất ngờ đổ mưa hoặc cảnh bình minh) để nói tròn 2 phút.',
      ],
    },
    part3: {
      theme: 'Outdoor Activities & Risk-taking',
      questions: [
        'Why do some people enjoy doing dangerous outdoor sports?',
        'Do you think young people today spend less time outdoors than past generations?',
        'Should governments spend money building more public parks in big cities?',
        'What skills can children learn from taking safe risks outdoors?',
      ],
    },
    usefulVocab: [
      { word: 'clear my head', pos: 'v.phr', vi: 'giải tỏa đầu óc', context: 'Going cycling outdoors really helps me clear my head after work.' },
      { word: 'scenic trail', pos: 'n.phr', vi: 'con đường mòn đẹp', context: 'We hiked along a scenic trail overlooking the valley.' },
      { word: 'step out of my comfort zone', pos: 'v.phr', vi: 'bước ra khỏi vùng an toàn', context: 'Rock climbing pushed me to step out of my comfort zone.' },
      { word: 'relish the challenge', pos: 'v.phr', vi: 'tận hưởng thử thách', context: 'Many young people relish the challenge of mountain trekking.' },
    ],
  },
  {
    id: 's-c17t2',
    title: 'Reading & Dream Cities',
    themeVi: 'Thói quen đọc · Thành phố muốn ghé thăm & Đô thị hóa',
    book: 17,
    test: 2,
    part1: {
      topic: 'Reading',
      questions: [
        'Do you prefer reading paper books or reading on a screen?',
        'What kind of things do you usually read in your daily life?',
        'Did you read a lot when you were a child?',
        'Do you ever read in a quiet café or library?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a big city you would like to visit.',
      bullets: [
        'which city it is',
        'how you know about this city',
        'what you would like to see and do there',
        'and explain why this city appeals to you.',
      ],
      followUp: 'Would you consider living in that city permanently?',
      prepHintsVi: [
        'Chọn thành phố bạn có ấn tượng rõ (Kyoto, London, Singapore, Melbourne...).',
        'Nêu 2 điểm thu hút: kiến trúc/ẩm thực và nhịp sống/văn hóa.',
        'Dùng cấu trúc giả định: If I ever got the chance to visit..., I’d definitely...',
      ],
    },
    part3: {
      theme: 'Urbanization & City Life',
      questions: [
        'Why do so many young people move from small towns to big cities?',
        'What are the biggest disadvantages of living in a crowded metropolis?',
        'How can city planners make large cities more livable for older residents?',
        'Do you think big cities will become even larger in the next twenty years?',
      ],
    },
    usefulVocab: [
      { word: 'vibrant atmosphere', pos: 'n.phr', vi: 'bầu không khí sôi động', context: 'I am drawn to London because of its vibrant cultural atmosphere.' },
      { word: 'blend of old and new', pos: 'n.phr', vi: 'sự hòa quyện giữa cổ kính và hiện đại', context: 'The city offers a fascinating blend of old and new architecture.' },
      { word: 'high cost of living', pos: 'n.phr', vi: 'chi phí sinh hoạt đắt đỏ', context: 'The high cost of living puts pressure on young graduates.' },
      { word: 'hectic pace of life', pos: 'n.phr', vi: 'nhịp sống hối hả', context: 'Not everyone enjoys the hectic pace of life in a megacity.' },
    ],
  },
  {
    id: 's-c17t3',
    title: 'Sharing & Helping Others',
    themeVi: 'Chia sẻ · Lần giúp đỡ trẻ nhỏ & Tinh thần cộng đồng',
    book: 17,
    test: 3,
    part1: {
      topic: 'Sharing',
      questions: [
        'Did your parents teach you to share things with others when you were young?',
        'What kind of things do you prefer not to share with other people?',
        'Do you like sharing food with friends or family when eating out?',
        'Is sharing common among neighbours where you live?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a time when you helped a child.',
      bullets: [
        'when and where this happened',
        'who the child was',
        'how you helped him or her',
        'and explain how you felt afterwards.',
      ],
      followUp: 'Was it difficult to help the child at that moment?',
      prepHintsVi: [
        'Kể chuyện gần gũi: hướng dẫn em nhỏ làm bài tập, tìm mẹ trong siêu thị, hoặc sửa xích xe đạp.',
        'Nhấn mạnh thái độ kiên nhẫn (reassured them, knelt down to talk calmly).',
        'Kết bằng cảm giác ấm áp và ý nghĩa của việc giúp người khác.',
      ],
    },
    part3: {
      theme: 'Community & Helping Behaviour',
      questions: [
        'Why is it important to teach children to help others from an early age?',
        'Do you think people in modern cities are less willing to help strangers than before?',
        'How can schools encourage students to take part in community volunteering?',
        'Should companies give employees paid days off to do charity work?',
      ],
    },
    usefulVocab: [
      { word: 'lend a helping hand', pos: 'v.phr', vi: 'giúp một tay', context: 'I was glad I could lend a helping hand when the boy got lost.' },
      { word: 'sense of fulfilment', pos: 'n.phr', vi: 'cảm giác viên mãn / ý nghĩa', context: 'Helping someone without expecting anything brings a sense of fulfilment.' },
      { word: 'look out for one another', pos: 'v.phr', vi: 'quan tâm, để ý giúp đỡ nhau', context: 'Tight-knit neighbourhoods always look out for one another.' },
      { word: 'set a good example', pos: 'v.phr', vi: 'làm gương tốt', context: 'Parents set a good example when they volunteer locally.' },
    ],
  },
  {
    id: 's-c17t4',
    title: 'Maps, Cinema & Role Models',
    themeVi: 'Bản đồ · Diễn viên yêu thích & Ảnh hưởng truyền thông',
    book: 17,
    test: 4,
    part1: {
      topic: 'Maps & Directions',
      questions: [
        'Do you often use maps on your phone when going to a new place?',
        'Are you good at reading paper maps or finding directions?',
        'Have you ever got lost in a city you did not know?',
        'Do people still ask strangers for directions nowadays?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe an actor or actress whom you admire.',
      bullets: [
        'who this person is',
        'what kind of films or shows they appear in',
        'what makes their acting special',
        'and explain why you admire them.',
      ],
      followUp: 'Have you seen most of the movies they starred in?',
      prepHintsVi: [
        'Nêu tên diễn viên quen thuộc và 1–2 bộ phim cụ thể để khỏi bí từ.',
        'Đừng chỉ khen "good acting"; nói rõ khả năng biến hóa (versatile, convey subtle emotions).',
        'Nhắc thêm thái độ sống ngoài đời (humble, dedicated to their craft).',
      ],
    },
    part3: {
      theme: 'Fame, Cinema & Media Influence',
      questions: [
        'What qualities separate a genuinely great actor from a famous celebrity?',
        'Do you think actors and athletes are paid too much money?',
        'How have streaming platforms changed the way people watch films today?',
        'Should famous actors speak out about social or environmental issues?',
      ],
    },
    usefulVocab: [
      { word: 'versatile performer', pos: 'n.phr', vi: 'nghệ sĩ đa tài, biến hóa tốt', context: 'She is a remarkably versatile performer across drama and comedy.' },
      { word: 'convey subtle emotions', pos: 'v.phr', vi: 'truyền tải cảm xúc tinh tế', context: 'He can convey subtle emotions with just a facial expression.' },
      { word: 'dedicated to their craft', pos: 'adj.phr', vi: 'tận tụy với nghề', context: 'I admire artists who remain humble and dedicated to their craft.' },
      { word: 'binge-watch', pos: 'v', vi: 'xem liên tục nhiều tập', context: 'Streaming apps encourage viewers to binge-watch entire series.' },
    ],
  },
  {
    id: 's-tech',
    title: 'Everyday Technology & AI',
    themeVi: 'Ứng dụng công nghệ · Công cụ hữu ích & Trí tuệ nhân tạo',
    part1: {
      topic: 'Technology & Apps',
      questions: [
        'What apps do you use the most on your smartphone?',
        'Could you go a whole weekend without checking your phone?',
        'Do you enjoy learning how to use new pieces of software?',
        'Have smartphones made communication with your family better or worse?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a useful piece of technology that you use almost every day.',
      bullets: [
        'what the device or app is',
        'when you started using it',
        'what you use it for',
        'and explain why you find it so useful.',
      ],
      followUp: 'Do you think you rely on it too much?',
      prepHintsVi: [
        'Chọn thiết bị hoặc ứng dụng rất quen (tai nghe chống ồn, ứng dụng ghi chú, laptop).',
        'So sánh trước và sau khi có nó (tiết kiệm thời gian, tập trung hơn).',
        'Nói thêm 1 hạn chế nhỏ để câu trả lời có chiều sâu.',
      ],
    },
    part3: {
      theme: 'AI & Modern Work',
      questions: [
        'Which jobs do you think will be most affected by artificial intelligence?',
        'What are the dangers of people becoming overly dependent on digital tools?',
        'Should schools teach students how to use AI tools responsibly?',
        'Why do older people sometimes struggle to adapt to rapid technological change?',
      ],
    },
    usefulVocab: [
      { word: 'indispensable tool', pos: 'n.phr', vi: 'công cụ không thể thiếu', context: 'My noise-cancelling headphones have become an indispensable tool for studying.' },
      { word: 'streamline my workflow', pos: 'v.phr', vi: 'tối ưu hóa quy trình làm việc', context: 'Digital calendars help streamline my daily workflow.' },
      { word: 'overly dependent on', pos: 'adj.phr', vi: 'quá phụ thuộc vào', context: 'We risk becoming overly dependent on automated spellcheckers.' },
      { word: 'bridge the digital divide', pos: 'v.phr', vi: 'thu hẹp khoảng cách công nghệ', context: 'Community classes help bridge the digital divide for seniors.' },
    ],
  },
  {
    id: 's-env',
    title: 'Nature, Weather & Environment',
    themeVi: 'Thời tiết · Nơi yên tĩnh & Bảo vệ môi trường',
    part1: {
      topic: 'Weather & Nature',
      questions: [
        'What kind of weather do you enjoy the most?',
        'Does bad weather ever change your plans for the weekend?',
        'Is the weather in your hometown different from what it was ten years ago?',
        'Do you like spending time near lakes, rivers, or the sea?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a quiet place you like to spend time in.',
      bullets: [
        'where it is',
        'how often you go there',
        'what you usually do there',
        'and explain why you like this quiet place.',
      ],
      followUp: 'Has this place changed much since you first discovered it?',
      prepHintsVi: [
        'Có thể tả công viên buổi sáng sớm, góc thư viện, hoặc bờ hồ vắng.',
        'Dùng từ chỉ âm thanh & không gian: peaceful, tranquil, rustling leaves, escape the hustle and bustle.',
      ],
    },
    part3: {
      theme: 'Environmental Protection',
      questions: [
        'Why is noise pollution becoming a bigger problem in growing cities?',
        'Who bears greater responsibility for fighting climate change: individuals or governments?',
        'Are young people more environmentally conscious than older generations?',
        'How can businesses be encouraged to reduce plastic packaging?',
      ],
    },
    usefulVocab: [
      { word: 'hustle and bustle', pos: 'n.phr', vi: 'sự ồn ào náo nhiệt', context: 'I go to the botanical garden to escape the hustle and bustle of traffic.' },
      { word: 'tranquil atmosphere', pos: 'n.phr', vi: 'bầu không khí tĩnh lặng', context: 'Early mornings offer a wonderfully tranquil atmosphere.' },
      { word: 'environmentally conscious', pos: 'adj.phr', vi: 'có ý thức bảo vệ môi trường', context: 'Young consumers are increasingly environmentally conscious.' },
      { word: 'tackle single-use plastics', pos: 'v.phr', vi: 'giải quyết rác thải nhựa dùng một lần', context: 'Stricter regulations are needed to tackle single-use plastics.' },
    ],
  },
  {
    id: 's-edu',
    title: 'Learning & Education',
    themeVi: 'Học tập · Kỹ năng mất nhiều thời gian & Giáo dục',
    part1: {
      topic: 'Study & Routine',
      questions: [
        'Are you currently studying or working?',
        'What time of day do you feel most productive when studying?',
        'Do you prefer studying alone or in a small group?',
        'What is one thing you find difficult about learning English?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a skill that took you a long time to learn.',
      bullets: [
        'what the skill was',
        'why you wanted to learn it',
        'how you practised and overcame difficulties',
        'and explain how you felt once you mastered it.',
      ],
      followUp: 'Would you recommend this skill to your friends?',
      prepHintsVi: [
        'Chọn kỹ năng thực tế: bơi lội, lái xe, nấu ăn, chơi nhạc cụ hoặc viết luận tiếng Anh.',
        'Nhấn mạnh quá trình từ lúc vụng về/nản lòng (steep learning curve) đến khi tiến bộ nhờ kiên trì.',
      ],
    },
    part3: {
      theme: 'Education Systems & Lifelong Learning',
      questions: [
        'Why do some people give up quickly when learning a difficult skill?',
        'Should schools focus more on practical life skills alongside academic subjects?',
        'How does online learning compare with traditional classroom instruction?',
        'Why is lifelong learning essential in today’s fast-changing job market?',
      ],
    },
    usefulVocab: [
      { word: 'steep learning curve', pos: 'n.phr', vi: 'giai đoạn đầu học rất khó khăn', context: 'Playing the guitar had a pretty steep learning curve for me.' },
      { word: 'consistent practice', pos: 'n.phr', vi: 'luyện tập đều đặn', context: 'Consistent practice matters far more than cramming once a week.' },
      { word: 'hit a plateau', pos: 'v.phr', vi: 'chững lại không thấy tiến bộ', context: 'Many learners feel discouraged when they hit a plateau.' },
      { word: 'lifelong learning', pos: 'n.phr', vi: 'học tập suốt đời', context: 'Lifelong learning keeps workers adaptable in a shifting economy.' },
    ],
  },
  {
    id: 's-health',
    title: 'Sports, Fitness & Wellbeing',
    themeVi: 'Thể thao · Sức khỏe thể chất & Chính sách y tế',
    part1: {
      topic: 'Fitness & Daily Habits',
      questions: [
        'Do you do any physical exercise during a normal week?',
        'Did you enjoy PE classes when you were at school?',
        'What sports are most popular in your country?',
        'Do you think walking is enough exercise for most adults?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a sport or physical activity that you enjoy doing or watching.',
      bullets: [
        'what the activity is',
        'where and with whom you do or watch it',
        'what rules or equipment are needed',
        'and explain why you find it enjoyable.',
      ],
      followUp: 'Do you think you will continue this activity in the future?',
      prepHintsVi: [
        'Chọn môn dễ tả như cầu lông (badminton), chạy bộ (jogging) hay bóng đá.',
        'Mô tả lợi ích cả về thể lực lẫn gắn kết bạn bè.',
      ],
    },
    part3: {
      theme: 'Public Health & Work-Life Balance',
      questions: [
        'Why has obesity become a major health concern in many countries?',
        'Is it the government’s job to encourage citizens to live healthier lives?',
        'How do long working hours affect people’s physical and mental health?',
        'Should unhealthy fast food carry extra taxes like cigarettes?',
      ],
    },
    usefulVocab: [
      { word: 'keep fit', pos: 'v.phr', vi: 'giữ dáng, rèn sức khỏe', context: 'Playing badminton twice a week helps me keep fit without feeling bored.' },
      { word: 'preventive healthcare', pos: 'n.phr', vi: 'y tế dự phòng', context: 'Investing in preventive healthcare saves hospitals money long term.' },
      { word: 'work-life balance', pos: 'n.phr', vi: 'cân bằng công việc và cuộc sống', context: 'Long commutes often ruin people’s work-life balance.' },
      { word: 'burn off stress', pos: 'v.phr', vi: 'giải tỏa căng thẳng', context: 'An evening jog is the quickest way to burn off stress.' },
    ],
  },
  {
    id: 's-money',
    title: 'Shopping, Saving & Consumerism',
    themeVi: 'Mua sắm · Món đồ tiết kiệm để mua & Văn hóa tiêu dùng',
    part1: {
      topic: 'Shopping Habits',
      questions: [
        'Do you prefer shopping online or visiting physical stores?',
        'What kind of things do you spend most of your money on?',
        'Do you always compare prices before buying something expensive?',
        'Were you given pocket money when you were a child?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe something special that you saved money to buy.',
      bullets: [
        'what the item was',
        'how long it took you to save for it',
        'how you managed to save the money',
        'and explain how you felt when you finally bought it.',
      ],
      followUp: 'Do you still use this item today?',
      prepHintsVi: [
        'Chọn 1 món đồ đáng nhớ: chiếc laptop đầu tiên, máy ảnh, xe đạp hoặc món quà tặng bố mẹ.',
        'Kể cách cắt giảm chi tiêu nhỏ (nấu cơm mang đi, hạn chế trà sữa) để tạo sự đồng cảm.',
      ],
    },
    part3: {
      theme: 'Consumer Culture & Financial Literacy',
      questions: [
        'Why do people often buy things they do not genuinely need?',
        'Should schools teach teenagers how to manage personal finances?',
        'How has contactless payment changed people’s spending habits?',
        'Is advertising aimed at children ethical?',
      ],
    },
    usefulVocab: [
      { word: 'put money aside', pos: 'v.phr', vi: 'để dành tiền', context: 'I put a fixed amount aside from my allowance every month.' },
      { word: 'cut back on', pos: 'v.phr', vi: 'cắt giảm chi tiêu vào', context: 'I had to cut back on eating out for nearly six months.' },
      { word: 'impulse buying', pos: 'n.phr', vi: 'mua sắm bốc đồng', context: 'One-click checkout apps strongly encourage impulse buying.' },
      { word: 'financial literacy', pos: 'n.phr', vi: 'hiểu biết về tài chính cá nhân', context: 'Teaching financial literacy early prevents young adults from falling into debt.' },
    ],
  },
  {
    id: 's-culture',
    title: 'Festivals, Hometown & Traditions',
    themeVi: 'Quê hương · Lễ hội truyền thống & Bảo tồn văn hóa',
    part1: {
      topic: 'Hometown & Festivals',
      questions: [
        'What do you like most about the town or city where you grew up?',
        'Is your hometown a popular place for tourists to visit?',
        'What is your favourite public holiday of the year?',
        'How do people in your family usually celebrate special occasions?',
      ],
    },
    part2: {
      cueCardTitle: 'Describe a traditional festival or celebration in your country.',
      bullets: [
        'what the celebration is and when it takes place',
        'what people normally do and eat during it',
        'who you usually celebrate it with',
        'and explain why this tradition is important to people in your country.',
      ],
      followUp: 'Has the way people celebrate it changed in recent years?',
      prepHintsVi: [
        'Tết Nguyên Đán hoặc Trung Thu là chủ đề rất giàu từ vựng (family reunion, traditional delicacies, honouring ancestors).',
        'So sánh nhẹ cách đón lễ xưa và nay (trước tự làm bánh, nay bận rộn hơn nhưng tình cảm gia đình vẫn còn).',
      ],
    },
    part3: {
      theme: 'Preserving Cultural Heritage',
      questions: [
        'Why do some traditional customs disappear over time?',
        'Should governments spend money preserving historic buildings and local festivals?',
        'How does globalization affect local cultures around the world?',
        'What can be done to keep young people interested in traditional arts?',
      ],
    },
    usefulVocab: [
      { word: 'family reunion', pos: 'n.phr', vi: 'sự đoàn tụ gia đình', context: 'Lunar New Year is primarily a time for family reunions.' },
      { word: 'pass down from generation to generation', pos: 'v.phr', vi: 'truyền từ đời này sang đời khác', context: 'Folk recipes have been passed down from generation to generation.' },
      { word: 'sense of belonging', pos: 'n.phr', vi: 'cảm giác gắn kết / thuộc về', context: 'Shared celebrations strengthen our sense of belonging.' },
      { word: 'cultural heritage', pos: 'n.phr', vi: 'di sản văn hóa', context: 'Preserving cultural heritage helps communities remember their roots.' },
    ],
  },
];

export function findSpeakingTopic(id: string): SpeakingTopic | undefined {
  return SPEAKING_TOPICS.find(t => t.id === id);
}
