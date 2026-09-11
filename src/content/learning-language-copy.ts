import type { InterfaceLocale, LearningLanguage } from "@/domain/models";

type Copy = {
  chooseTitle: string;
  chooseBody: string;
  learningLanguage: string;
  english: string;
  spanish: string;
  preferencesTitle: Record<LearningLanguage, string>;
  pronunciation: string;
  american: string;
  british: string;
  latinAmerican: string;
  castilian: string;
};

export const learningLanguageCopy: Record<InterfaceLocale, Copy> = {
  en:{chooseTitle:"What language are you learning?",chooseBody:"Your Fersons will speak this language with you.",learningLanguage:"Language you’re learning",english:"English",spanish:"Spanish",preferencesTitle:{en:"Make English fit your life",es:"Make Spanish fit your life"},pronunciation:"Pronunciation model",american:"General American",british:"Modern British",latinAmerican:"Latin American Spanish",castilian:"Spanish from Spain"},
  "es-419":{chooseTitle:"¿Qué idioma estás aprendiendo?",chooseBody:"Tus Fersons hablarán contigo en este idioma.",learningLanguage:"Idioma que estás aprendiendo",english:"Inglés",spanish:"Español",preferencesTitle:{en:"Adapta el inglés a tu vida",es:"Adapta el español a tu vida"},pronunciation:"Modelo de pronunciación",american:"Inglés estadounidense general",british:"Inglés británico moderno",latinAmerican:"Español latinoamericano",castilian:"Español de España"},
  "es-ES":{chooseTitle:"¿Qué idioma estás aprendiendo?",chooseBody:"Tus Fersons hablarán contigo en este idioma.",learningLanguage:"Idioma que estás aprendiendo",english:"Inglés",spanish:"Español",preferencesTitle:{en:"Adapta el inglés a tu vida",es:"Adapta el español a tu vida"},pronunciation:"Modelo de pronunciación",american:"Inglés estadounidense general",british:"Inglés británico moderno",latinAmerican:"Español latinoamericano",castilian:"Español de España"},
  "pt-BR":{chooseTitle:"Qual idioma você está aprendendo?",chooseBody:"Seus Fersons conversarão com você nesse idioma.",learningLanguage:"Idioma que você está aprendendo",english:"Inglês",spanish:"Espanhol",preferencesTitle:{en:"Adapte o inglês à sua vida",es:"Adapte o espanhol à sua vida"},pronunciation:"Modelo de pronúncia",american:"Inglês americano geral",british:"Inglês britânico moderno",latinAmerican:"Espanhol latino-americano",castilian:"Espanhol da Espanha"},
  "zh-Hans":{chooseTitle:"你在学习哪种语言？",chooseBody:"你的 Ferson 会用这种语言与你交谈。",learningLanguage:"正在学习的语言",english:"英语",spanish:"西班牙语",preferencesTitle:{en:"让英语融入你的生活",es:"让西班牙语融入你的生活"},pronunciation:"发音类型",american:"通用美式英语",british:"现代英式英语",latinAmerican:"拉丁美洲西班牙语",castilian:"西班牙西班牙语"},
  ja:{chooseTitle:"どの言語を学んでいますか？",chooseBody:"Ferson はその言語であなたと会話します。",learningLanguage:"学習する言語",english:"英語",spanish:"スペイン語",preferencesTitle:{en:"英語を生活に取り入れよう",es:"スペイン語を生活に取り入れよう"},pronunciation:"発音モデル",american:"一般アメリカ英語",british:"現代イギリス英語",latinAmerican:"ラテンアメリカのスペイン語",castilian:"スペインのスペイン語"},
  ko:{chooseTitle:"어떤 언어를 배우고 있나요?",chooseBody:"Ferson이 이 언어로 대화해요.",learningLanguage:"학습 언어",english:"영어",spanish:"스페인어",preferencesTitle:{en:"영어를 일상에 맞춰 보세요",es:"스페인어를 일상에 맞춰 보세요"},pronunciation:"발음 모델",american:"일반 미국 영어",british:"현대 영국 영어",latinAmerican:"라틴아메리카 스페인어",castilian:"스페인 스페인어"},
  vi:{chooseTitle:"Bạn đang học ngôn ngữ nào?",chooseBody:"Các Ferson sẽ trò chuyện với bạn bằng ngôn ngữ này.",learningLanguage:"Ngôn ngữ đang học",english:"Tiếng Anh",spanish:"Tiếng Tây Ban Nha",preferencesTitle:{en:"Đưa tiếng Anh vào cuộc sống",es:"Đưa tiếng Tây Ban Nha vào cuộc sống"},pronunciation:"Kiểu phát âm",american:"Anh-Mỹ phổ thông",british:"Anh-Anh hiện đại",latinAmerican:"Tây Ban Nha Mỹ Latinh",castilian:"Tây Ban Nha tại Tây Ban Nha"},
  id:{chooseTitle:"Bahasa apa yang sedang kamu pelajari?",chooseBody:"Ferson akan berbicara denganmu dalam bahasa ini.",learningLanguage:"Bahasa yang dipelajari",english:"Bahasa Inggris",spanish:"Bahasa Spanyol",preferencesTitle:{en:"Sesuaikan bahasa Inggris dengan hidupmu",es:"Sesuaikan bahasa Spanyol dengan hidupmu"},pronunciation:"Model pelafalan",american:"Inggris Amerika Umum",british:"Inggris Britania Modern",latinAmerican:"Spanyol Amerika Latin",castilian:"Spanyol dari Spanyol"},
  ar:{chooseTitle:"ما اللغة التي تتعلمها؟",chooseBody:"ستتحدث شخصيات Ferson معك بهذه اللغة.",learningLanguage:"اللغة التي تتعلمها",english:"الإنجليزية",spanish:"الإسبانية",preferencesTitle:{en:"اجعل الإنجليزية جزءًا من حياتك",es:"اجعل الإسبانية جزءًا من حياتك"},pronunciation:"نموذج النطق",american:"الإنجليزية الأمريكية العامة",british:"الإنجليزية البريطانية الحديثة",latinAmerican:"الإسبانية اللاتينية",castilian:"الإسبانية من إسبانيا"},
  fr:{chooseTitle:"Quelle langue apprenez-vous ?",chooseBody:"Vos Fersons parleront avec vous dans cette langue.",learningLanguage:"Langue apprise",english:"Anglais",spanish:"Espagnol",preferencesTitle:{en:"Intégrez l’anglais à votre vie",es:"Intégrez l’espagnol à votre vie"},pronunciation:"Modèle de prononciation",american:"Anglais américain général",british:"Anglais britannique moderne",latinAmerican:"Espagnol latino-américain",castilian:"Espagnol d’Espagne"},
  tr:{chooseTitle:"Hangi dili öğreniyorsun?",chooseBody:"Fersonların seninle bu dilde konuşacak.",learningLanguage:"Öğrendiğin dil",english:"İngilizce",spanish:"İspanyolca",preferencesTitle:{en:"İngilizceyi hayatına uyarla",es:"İspanyolcayı hayatına uyarla"},pronunciation:"Telaffuz modeli",american:"Genel Amerikan İngilizcesi",british:"Modern Britanya İngilizcesi",latinAmerican:"Latin Amerika İspanyolcası",castilian:"İspanya İspanyolcası"},
};
