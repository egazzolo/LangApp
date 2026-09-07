import type { InterfaceLocale } from "@/domain/models";

type ProgressCopy = { focusTitle:string; focusBody:string; usefulSounds:string; soundHint:string; hear:string };

export const progressCopy: Record<InterfaceLocale, ProgressCopy> = {
  en:{focusTitle:"Past tense in stories",focusBody:"You’re using it correctly more often. Keep noticing finished actions and time words like “yesterday.”",usefulSounds:"Sounds to practise",soundHint:"Tap a word to hear the sound in a real word.",hear:"Hear"},
  "es-419":{focusTitle:"El pasado al contar historias",focusBody:"Lo usas correctamente cada vez más. Fíjate en las acciones terminadas y en palabras de tiempo como “yesterday”.",usefulSounds:"Sonidos para practicar",soundHint:"Toca una palabra para escuchar el sonido en una palabra real.",hear:"Escuchar"},
  "es-ES":{focusTitle:"El pasado al contar historias",focusBody:"Lo usas correctamente cada vez más. Fíjate en las acciones terminadas y en palabras de tiempo como “yesterday”.",usefulSounds:"Sonidos para practicar",soundHint:"Toca una palabra para escuchar el sonido en una palabra real.",hear:"Escuchar"},
  "pt-BR":{focusTitle:"Passado ao contar histórias",focusBody:"Você está usando corretamente com mais frequência. Observe ações concluídas e palavras de tempo como “yesterday”.",usefulSounds:"Sons para praticar",soundHint:"Toque em uma palavra para ouvir o som em uma palavra real.",hear:"Ouvir"},
  "zh-Hans":{focusTitle:"故事中的过去时",focusBody:"你的使用越来越准确。请留意已完成的动作和 “yesterday” 等时间词。",usefulSounds:"需要练习的发音",soundHint:"点按单词，听这个发音在真实单词中的读法。",hear:"播放"},
  ja:{focusTitle:"物語で使う過去形",focusBody:"正しく使えることが増えています。完了した動作や “yesterday” などの時を表す語に注目しましょう。",usefulSounds:"練習する音",soundHint:"単語をタップすると、実際の単語で音を確認できます。",hear:"聞く"},
  ko:{focusTitle:"이야기 속 과거 시제",focusBody:"점점 더 정확하게 사용하고 있어요. 끝난 행동과 “yesterday” 같은 시간 표현에 주목하세요.",usefulSounds:"연습할 소리",soundHint:"단어를 눌러 실제 단어 속 발음을 들어 보세요.",hear:"듣기"},
  vi:{focusTitle:"Thì quá khứ khi kể chuyện",focusBody:"Bạn đang dùng đúng thường xuyên hơn. Hãy chú ý hành động đã kết thúc và từ chỉ thời gian như “yesterday”.",usefulSounds:"Âm cần luyện",soundHint:"Chạm vào một từ để nghe âm đó trong từ thực tế.",hear:"Nghe"},
  id:{focusTitle:"Bentuk lampau dalam cerita",focusBody:"Kamu semakin sering menggunakannya dengan benar. Perhatikan tindakan yang selesai dan kata waktu seperti “yesterday”.",usefulSounds:"Bunyi untuk dilatih",soundHint:"Ketuk kata untuk mendengar bunyinya dalam kata nyata.",hear:"Dengar"},
  ar:{focusTitle:"زمن الماضي في القصص",focusBody:"أصبحت تستخدمه بصورة صحيحة أكثر. انتبه إلى الأفعال المنتهية وكلمات الزمن مثل “yesterday”.",usefulSounds:"أصوات للتدرّب",soundHint:"اضغط على كلمة لسماع الصوت ضمن كلمة حقيقية.",hear:"استماع"},
  fr:{focusTitle:"Le passé dans les récits",focusBody:"Vous l’utilisez correctement plus souvent. Repérez les actions terminées et les marqueurs de temps comme “yesterday”.",usefulSounds:"Sons à travailler",soundHint:"Touchez un mot pour entendre le son dans un vrai mot.",hear:"Écouter"},
  tr:{focusTitle:"Hikâyelerde geçmiş zaman",focusBody:"Giderek daha sık doğru kullanıyorsun. Tamamlanmış eylemlere ve “yesterday” gibi zaman sözcüklerine dikkat et.",usefulSounds:"Çalışılacak sesler",soundHint:"Sesi gerçek bir sözcükte duymak için sözcüğe dokun.",hear:"Dinle"},
};

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
