import type { SpeakingTopic } from './types';

// IELTS Speaking topic bank (full 3-part sets modelled on Cambridge & frequent exam themes).

export const SPEAKING_TOPICS: SpeakingTopic[] = [
  {
    id: 's-c17t1',
    title: 'History & Outdoor Adventure',
    themeVi: 'History · Outdoor Activities & Risk-Taking',
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
        'Pick a real trip you remember well (hiking, cycling by a lake, or weekend camping).',
        'Prepare 3–4 vivid landscape phrases: lush greenery, fresh air, scenic trail, steep path.',
        'Include one small memorable detail (sudden rain or a sunrise view) to easily fill 2 minutes.',
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
      { word: 'clear my head', pos: 'v.phr', vi: 'relieve mental stress and think clearly again', context: 'Going cycling outdoors really helps me clear my head after work.' },
      { word: 'scenic trail', pos: 'n.phr', vi: 'a picturesque path through nature', context: 'We hiked along a scenic trail overlooking the valley.' },
      { word: 'step out of my comfort zone', pos: 'v.phr', vi: 'try something unfamiliar or challenging', context: 'Rock climbing pushed me to step out of my comfort zone.' },
      { word: 'relish the challenge', pos: 'v.phr', vi: 'genuinely enjoy taking on a tough task', context: 'Many young people relish the challenge of mountain trekking.' },
    ],
  },
  {
    id: 's-c17t2',
    title: 'Reading & Dream Cities',
    themeVi: 'Reading Habits · Dream Cities & Urbanization',
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
        'Choose a city you already know vivid details about (Kyoto, London, Singapore, Melbourne...).',
        'Highlight two distinct draws: architecture/cuisine and lifestyle/cultural vibe.',
        'Use natural hypothetical framing: "If I ever got the chance to visit..., I’d definitely..."',
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
      { word: 'vibrant atmosphere', pos: 'n.phr', vi: 'lively, energetic mood or environment', context: 'I am drawn to London because of its vibrant cultural atmosphere.' },
      { word: 'blend of old and new', pos: 'n.phr', vi: 'harmonious mix of historic and modern elements', context: 'The city offers a fascinating blend of old and new architecture.' },
      { word: 'high cost of living', pos: 'n.phr', vi: 'expensive everyday housing, food, and bills', context: 'The high cost of living puts pressure on young graduates.' },
      { word: 'hectic pace of life', pos: 'n.phr', vi: 'fast, busy, and stressful daily rhythm', context: 'Not everyone enjoys the hectic pace of life in a megacity.' },
    ],
  },
  {
    id: 's-c17t3',
    title: 'Sharing & Helping Others',
    themeVi: 'Sharing · Helping a Child & Community Spirit',
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
        'Tell a relatable story: helping a younger kid with homework, finding their parent in a store, or fixing a bike chain.',
        'Emphasize patience and empathy (reassured them, knelt down to talk calmly).',
        'Wrap up with the warm, rewarding feeling of making a small difference.',
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
      { word: 'lend a helping hand', pos: 'v.phr', vi: 'offer practical assistance to someone', context: 'I was glad I could lend a helping hand when the boy got lost.' },
      { word: 'sense of fulfilment', pos: 'n.phr', vi: 'deep satisfaction from doing something meaningful', context: 'Helping someone without expecting anything brings a sense of fulfilment.' },
      { word: 'look out for one another', pos: 'v.phr', vi: 'care for and watch over each other', context: 'Tight-knit neighbourhoods always look out for one another.' },
      { word: 'set a good example', pos: 'v.phr', vi: 'model positive behaviour for others to follow', context: 'Parents set a good example when they volunteer locally.' },
    ],
  },
  {
    id: 's-c17t4',
    title: 'Maps, Cinema & Role Models',
    themeVi: 'Maps & Directions · Admired Actors & Media Influence',
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
        'Name a familiar performer and 1–2 specific films so you never run out of concrete examples.',
        'Go beyond "good acting" — describe their range (versatile, convey subtle emotions).',
        'Mention their off-screen character as well (humble, dedicated to their craft).',
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
      { word: 'versatile performer', pos: 'n.phr', vi: 'an actor skilled across many different genres and roles', context: 'She is a remarkably versatile performer across drama and comedy.' },
      { word: 'convey subtle emotions', pos: 'v.phr', vi: 'express understated feelings convincingly', context: 'He can convey subtle emotions with just a facial expression.' },
      { word: 'dedicated to their craft', pos: 'adj.phr', vi: 'deeply committed to mastering their art', context: 'I admire artists who remain humble and dedicated to their craft.' },
      { word: 'binge-watch', pos: 'v', vi: 'watch several episodes of a show back to back', context: 'Streaming apps encourage viewers to binge-watch entire series.' },
    ],
  },
  {
    id: 's-tech',
    title: 'Everyday Technology & AI',
    themeVi: 'Tech Apps · Essential Devices & Artificial Intelligence',
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
        'Pick an everyday device or app you know well (noise-cancelling headphones, note-taking app, laptop).',
        'Contrast life before and after getting it (saves time, boosts focus).',
        'Mention one small downside to give your answer nuance and depth.',
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
      { word: 'indispensable tool', pos: 'n.phr', vi: 'something absolutely essential you rely on daily', context: 'My noise-cancelling headphones have become an indispensable tool for studying.' },
      { word: 'streamline my workflow', pos: 'v.phr', vi: 'make daily work smoother and more efficient', context: 'Digital calendars help streamline my daily workflow.' },
      { word: 'overly dependent on', pos: 'adj.phr', vi: 'relying too heavily on something', context: 'We risk becoming overly dependent on automated spellcheckers.' },
      { word: 'bridge the digital divide', pos: 'v.phr', vi: 'close the gap in tech access and skills', context: 'Community classes help bridge the digital divide for seniors.' },
    ],
  },
  {
    id: 's-env',
    title: 'Nature, Weather & Environment',
    themeVi: 'Weather · Quiet Places & Environmental Protection',
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
        'Describe an early-morning park, a quiet corner of a library, or a peaceful lakeside.',
        'Use sensory sound and atmosphere words: peaceful, tranquil, rustling leaves, escape the hustle and bustle.',
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
      { word: 'hustle and bustle', pos: 'n.phr', vi: 'busy, noisy rush of city life', context: 'I go to the botanical garden to escape the hustle and bustle of traffic.' },
      { word: 'tranquil atmosphere', pos: 'n.phr', vi: 'calm, peaceful surroundings', context: 'Early mornings offer a wonderfully tranquil atmosphere.' },
      { word: 'environmentally conscious', pos: 'adj.phr', vi: 'aware of and caring about protecting nature', context: 'Young consumers are increasingly environmentally conscious.' },
      { word: 'tackle single-use plastics', pos: 'v.phr', vi: 'take action to cut disposable plastic waste', context: 'Stricter regulations are needed to tackle single-use plastics.' },
    ],
  },
  {
    id: 's-edu',
    title: 'Learning & Education',
    themeVi: 'Study Habits · Long-Term Skills & Education',
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
        'Pick a practical skill: swimming, driving, cooking, playing an instrument, or academic essay writing.',
        'Highlight the arc from early frustration (steep learning curve) to steady progress through persistence.',
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
      { word: 'steep learning curve', pos: 'n.phr', vi: 'a skill that is very difficult to pick up at first', context: 'Playing the guitar had a pretty steep learning curve for me.' },
      { word: 'consistent practice', pos: 'n.phr', vi: 'regular, steady effort over time', context: 'Consistent practice matters far more than cramming once a week.' },
      { word: 'hit a plateau', pos: 'v.phr', vi: 'reach a stage where progress temporarily stalls', context: 'Many learners feel discouraged when they hit a plateau.' },
      { word: 'lifelong learning', pos: 'n.phr', vi: 'continuing to gain skills throughout adulthood', context: 'Lifelong learning keeps workers adaptable in a shifting economy.' },
    ],
  },
  {
    id: 's-health',
    title: 'Sports, Fitness & Wellbeing',
    themeVi: 'Sports · Physical Health & Public Wellbeing',
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
        'Choose an easy-to-describe sport such as badminton, jogging, or football.',
        'Cover both physical fitness benefits and social bonding with friends.',
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
      { word: 'keep fit', pos: 'v.phr', vi: 'stay physically healthy and active', context: 'Playing badminton twice a week helps me keep fit without feeling bored.' },
      { word: 'preventive healthcare', pos: 'n.phr', vi: 'medical care focused on stopping illness before it starts', context: 'Investing in preventive healthcare saves hospitals money long term.' },
      { word: 'work-life balance', pos: 'n.phr', vi: 'healthy split between career demands and personal time', context: 'Long commutes often ruin people’s work-life balance.' },
      { word: 'burn off stress', pos: 'v.phr', vi: 'release built-up tension through physical activity', context: 'An evening jog is the quickest way to burn off stress.' },
    ],
  },
  {
    id: 's-money',
    title: 'Shopping, Saving & Consumerism',
    themeVi: 'Shopping · Saving for Something Special & Consumer Culture',
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
        'Pick a memorable goal: your first laptop, a camera, a bicycle, or a gift for your parents.',
        'Share relatable small sacrifices (cooking at home, cutting back on café drinks) to make the story vivid.',
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
      { word: 'put money aside', pos: 'v.phr', vi: 'save money regularly for a future goal', context: 'I put a fixed amount aside from my allowance every month.' },
      { word: 'cut back on', pos: 'v.phr', vi: 'reduce spending or consumption of something', context: 'I had to cut back on eating out for nearly six months.' },
      { word: 'impulse buying', pos: 'n.phr', vi: 'purchasing things spontaneously without thinking ahead', context: 'One-click checkout apps strongly encourage impulse buying.' },
      { word: 'financial literacy', pos: 'n.phr', vi: 'practical understanding of budgeting and money management', context: 'Teaching financial literacy early prevents young adults from falling into debt.' },
    ],
  },
  {
    id: 's-culture',
    title: 'Festivals, Hometown & Traditions',
    themeVi: 'Hometown · Traditional Festivals & Cultural Heritage',
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
        'Major holidays like Lunar New Year, Mid-Autumn Festival, Diwali, or Thanksgiving offer rich vocabulary (family reunion, traditional delicacies, honouring ancestors).',
        'Add a brief past-vs-present contrast (homemade traditions in the past vs busier modern life, while family bonds remain strong).',
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
      { word: 'family reunion', pos: 'n.phr', vi: 'a special gathering where relatives come together', context: 'Lunar New Year is primarily a time for family reunions.' },
      { word: 'pass down from generation to generation', pos: 'v.phr', vi: 'hand traditions or knowledge down over the ages', context: 'Folk recipes have been passed down from generation to generation.' },
      { word: 'sense of belonging', pos: 'n.phr', vi: 'feeling connected to and accepted by a community', context: 'Shared celebrations strengthen our sense of belonging.' },
      { word: 'cultural heritage', pos: 'n.phr', vi: 'traditions, landmarks, and history inherited from the past', context: 'Preserving cultural heritage helps communities remember their roots.' },
    ],
  },
];

export function findSpeakingTopic(id: string): SpeakingTopic | undefined {
  return SPEAKING_TOPICS.find(t => t.id === id);
}
