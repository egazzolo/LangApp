import type { InterfaceLocale } from "@/domain/models";

type ProgressCopy = { focusTitle:string; focusBody:string; usefulSounds:string; soundHint:string; hear:string; meaning:string };

export const progressCopy: Record<InterfaceLocale, ProgressCopy> = {
  en:{focusTitle:"Past tense in stories",focusBody:"You’re using it correctly more often. Keep noticing finished actions and time words like “yesterday.”",usefulSounds:"Sounds to practise",soundHint:"Tap the left side to hear it or the right side for its meaning.",hear:"Hear",meaning:"Meaning of"},
  "es-419":{focusTitle:"El pasado al contar historias",focusBody:"Lo usas correctamente cada vez más. Fíjate en las acciones terminadas y en palabras de tiempo como “yesterday”.",usefulSounds:"Sonidos para practicar",soundHint:"Toca el lado izquierdo para escucharlo o el derecho para ver su significado.",hear:"Escuchar",meaning:"Significado de"},
  "es-ES":{focusTitle:"El pasado al contar historias",focusBody:"Lo usas correctamente cada vez más. Fíjate en las acciones terminadas y en palabras de tiempo como “yesterday”.",usefulSounds:"Sonidos para practicar",soundHint:"Toca el lado izquierdo para escucharlo o el derecho para ver su significado.",hear:"Escuchar",meaning:"Significado de"},
  "pt-BR":{focusTitle:"Passado ao contar histórias",focusBody:"Você está usando corretamente com mais frequência. Observe ações concluídas e palavras de tempo como “yesterday”.",usefulSounds:"Sons para praticar",soundHint:"Toque à esquerda para ouvir ou à direita para ver o significado.",hear:"Ouvir",meaning:"Significado de"},
  "zh-Hans":{focusTitle:"故事中的过去时",focusBody:"你的使用越来越准确。请留意已完成的动作和 “yesterday” 等时间词。",usefulSounds:"需要练习的发音",soundHint:"点按左侧听发音，点按右侧查看含义。",hear:"播放",meaning:"含义"},
  ja:{focusTitle:"物語で使う過去形",focusBody:"正しく使えることが増えています。完了した動作や “yesterday” などの時を表す語に注目しましょう。",usefulSounds:"練習する音",soundHint:"左側で発音を聞き、右側で意味を確認できます。",hear:"聞く",meaning:"意味"},
  ko:{focusTitle:"이야기 속 과거 시제",focusBody:"점점 더 정확하게 사용하고 있어요. 끝난 행동과 “yesterday” 같은 시간 표현에 주목하세요.",usefulSounds:"연습할 소리",soundHint:"왼쪽을 누르면 발음, 오른쪽을 누르면 뜻을 볼 수 있어요.",hear:"듣기",meaning:"뜻"},
  vi:{focusTitle:"Thì quá khứ khi kể chuyện",focusBody:"Bạn đang dùng đúng thường xuyên hơn. Hãy chú ý hành động đã kết thúc và từ chỉ thời gian như “yesterday”.",usefulSounds:"Âm cần luyện",soundHint:"Chạm bên trái để nghe hoặc bên phải để xem nghĩa.",hear:"Nghe",meaning:"Nghĩa của"},
  id:{focusTitle:"Bentuk lampau dalam cerita",focusBody:"Kamu semakin sering menggunakannya dengan benar. Perhatikan tindakan yang selesai dan kata waktu seperti “yesterday”.",usefulSounds:"Bunyi untuk dilatih",soundHint:"Ketuk kiri untuk mendengar atau kanan untuk melihat artinya.",hear:"Dengar",meaning:"Arti"},
  ar:{focusTitle:"زمن الماضي في القصص",focusBody:"أصبحت تستخدمه بصورة صحيحة أكثر. انتبه إلى الأفعال المنتهية وكلمات الزمن مثل “yesterday”.",usefulSounds:"أصوات للتدرّب",soundHint:"اضغط على اليسار للاستماع أو اليمين لمعرفة المعنى.",hear:"استماع",meaning:"معنى"},
  fr:{focusTitle:"Le passé dans les récits",focusBody:"Vous l’utilisez correctement plus souvent. Repérez les actions terminées et les marqueurs de temps comme “yesterday”.",usefulSounds:"Sons à travailler",soundHint:"Touchez à gauche pour écouter ou à droite pour voir le sens.",hear:"Écouter",meaning:"Sens de"},
  tr:{focusTitle:"Hikâyelerde geçmiş zaman",focusBody:"Giderek daha sık doğru kullanıyorsun. Tamamlanmış eylemlere ve “yesterday” gibi zaman sözcüklerine dikkat et.",usefulSounds:"Çalışılacak sesler",soundHint:"Dinlemek için sola, anlamı görmek için sağa dokun.",hear:"Dinle",meaning:"Anlamı"},
};

const meanings: Record<InterfaceLocale,Record<string,string>>={
  en:{this:"this / this one",ship:"ship",very:"very",pero:"but",perro:"dog",niño:"boy",cinco:"five",gente:"people"},
  "es-419":{this:"esto / este",ship:"barco",very:"muy",pero:"pero",perro:"perro",niño:"niño",cinco:"cinco",gente:"gente"},
  "es-ES":{this:"esto / este",ship:"barco",very:"muy",pero:"pero",perro:"perro",niño:"niño",cinco:"cinco",gente:"gente"},
  "pt-BR":{this:"isto / este",ship:"navio",very:"muito",pero:"mas",perro:"cachorro",niño:"menino",cinco:"cinco",gente:"pessoas"},
  "zh-Hans":{this:"这个",ship:"船",very:"非常",pero:"但是",perro:"狗",niño:"男孩",cinco:"五",gente:"人们"},
  ja:{this:"これ",ship:"船",very:"とても",pero:"しかし",perro:"犬",niño:"男の子",cinco:"五",gente:"人々"},
  ko:{this:"이것",ship:"배",very:"매우",pero:"하지만",perro:"개",niño:"소년",cinco:"다섯",gente:"사람들"},
  vi:{this:"cái này",ship:"tàu",very:"rất",pero:"nhưng",perro:"chó",niño:"cậu bé",cinco:"năm",gente:"mọi người"},
  id:{this:"ini",ship:"kapal",very:"sangat",pero:"tetapi",perro:"anjing",niño:"anak laki-laki",cinco:"lima",gente:"orang-orang"},
  ar:{this:"هذا",ship:"سفينة",very:"جدًا",pero:"لكن",perro:"كلب",niño:"ولد",cinco:"خمسة",gente:"الناس"},
  fr:{this:"ceci / ce",ship:"navire",very:"très",pero:"mais",perro:"chien",niño:"garçon",cinco:"cinq",gente:"les gens"},
  tr:{this:"bu",ship:"gemi",very:"çok",pero:"ama",perro:"köpek",niño:"erkek çocuk",cinco:"beş",gente:"insanlar"},
};

export const meaningFor=(locale:InterfaceLocale,word:string)=>meanings[locale][word]??word;

const examples:Record<string,string>={
  this:"This is my friend.",ship:"The ship leaves today.",very:"It’s very cold.",
  pero:"Quería ir, pero estaba cansado.",perro:"Mi perro duerme aquí.",niño:"El niño está jugando.",
  cinco:"Tengo cinco minutos.",gente:"Hay mucha gente aquí.",
};

export const exampleFor=(word:string)=>examples[word]??word;

export const progressDataCopy: Record<InterfaceLocale, { voiceMessages:string; awaitingFocus:string; pronunciationPractice:string }> = {
  en:{voiceMessages:"Voice messages",awaitingFocus:"Keep chatting—your first learning focus will appear here soon.",pronunciationPractice:"These are practice examples, not personal scores."},
  "es-419":{voiceMessages:"Mensajes de voz",awaitingFocus:"Sigue conversando; pronto aparecerá aquí tu primer enfoque de aprendizaje.",pronunciationPractice:"Estos son ejemplos de práctica, no puntuaciones personales."},
  "es-ES":{voiceMessages:"Mensajes de voz",awaitingFocus:"Sigue conversando; pronto aparecerá aquí tu primer enfoque de aprendizaje.",pronunciationPractice:"Estos son ejemplos de práctica, no puntuaciones personales."},
  "pt-BR":{voiceMessages:"Mensagens de voz",awaitingFocus:"Continue conversando — seu primeiro foco de aprendizagem aparecerá aqui em breve.",pronunciationPractice:"Estes são exemplos de prática, não pontuações pessoais."},
  "zh-Hans":{voiceMessages:"语音消息",awaitingFocus:"继续聊天，你的第一个学习重点很快会显示在这里。",pronunciationPractice:"这些是练习示例，不是个人评分。"},
  ja:{voiceMessages:"音声メッセージ",awaitingFocus:"会話を続けると、最初の学習ポイントがもうすぐここに表示されます。",pronunciationPractice:"これは練習例であり、個人スコアではありません。"},
  ko:{voiceMessages:"음성 메시지",awaitingFocus:"계속 대화해 보세요. 첫 학습 초점이 곧 여기에 나타납니다.",pronunciationPractice:"개인 점수가 아닌 연습 예시입니다."},
  vi:{voiceMessages:"Tin nhắn thoại",awaitingFocus:"Hãy tiếp tục trò chuyện—trọng tâm học tập đầu tiên sẽ sớm xuất hiện ở đây.",pronunciationPractice:"Đây là ví dụ luyện tập, không phải điểm cá nhân."},
  id:{voiceMessages:"Pesan suara",awaitingFocus:"Teruslah mengobrol—fokus belajar pertamamu akan segera muncul di sini.",pronunciationPractice:"Ini contoh latihan, bukan nilai pribadi."},
  ar:{voiceMessages:"رسائل صوتية",awaitingFocus:"واصل الدردشة—سيظهر أول محور لتعلّمك هنا قريبًا.",pronunciationPractice:"هذه أمثلة للتدريب وليست درجات شخصية."},
  fr:{voiceMessages:"Messages vocaux",awaitingFocus:"Continuez à discuter : votre premier axe d’apprentissage apparaîtra bientôt ici.",pronunciationPractice:"Ce sont des exemples d’entraînement, pas des scores personnels."},
  tr:{voiceMessages:"Sesli mesajlar",awaitingFocus:"Sohbet etmeye devam et—ilk öğrenme odağın yakında burada görünecek.",pronunciationPractice:"Bunlar kişisel puanlar değil, alıştırma örnekleridir."},
};
