import type { InterfaceLocale } from "@/domain/models";

type WelcomeCopy = { eyebrow:string; title:string; body:string };

export const welcomeLearningCopy: Record<InterfaceLocale,WelcomeCopy> = {
  en:{eyebrow:"YOUR LANGUAGE-SPEAKING CIRCLE",title:"A language gets better when it becomes part of your life.",body:"Build real-feeling, ongoing friendships with AI Fersons—and learn naturally in every conversation."},
  "es-419":{eyebrow:"TU CÍRCULO PARA PRACTICAR",title:"Un idioma mejora cuando se vuelve parte de tu vida.",body:"Crea amistades continuas y naturales con Fersons de IA, y aprende en cada conversación."},
  "es-ES":{eyebrow:"TU CÍRCULO PARA PRACTICAR",title:"Un idioma mejora cuando se convierte en parte de tu vida.",body:"Crea amistades continuas y naturales con Fersons de IA, y aprende en cada conversación."},
  "pt-BR":{eyebrow:"SEU CÍRCULO DE PRÁTICA",title:"Um idioma melhora quando passa a fazer parte da sua vida.",body:"Crie amizades contínuas e naturais com Fersons de IA e aprenda em cada conversa."},
  "zh-Hans":{eyebrow:"你的语言练习圈",title:"当一门语言融入生活，你就会进步。",body:"与 AI Ferson 建立自然、持续的友谊，在每次对话中学习。"},
  ja:{eyebrow:"あなたの言語練習サークル",title:"言語は生活の一部になると上達します。",body:"AI Ferson と自然で継続的な関係を築き、会話のたびに学びましょう。"},
  ko:{eyebrow:"나만의 언어 연습 모임",title:"언어가 일상의 일부가 되면 실력이 늘어요.",body:"AI Ferson과 자연스럽게 관계를 이어 가며 대화할 때마다 배워 보세요."},
  vi:{eyebrow:"CỘNG ĐỒNG LUYỆN NGÔN NGỮ",title:"Ngôn ngữ tiến bộ khi trở thành một phần cuộc sống.",body:"Xây dựng tình bạn tự nhiên, lâu dài với các Ferson AI và học qua từng cuộc trò chuyện."},
  id:{eyebrow:"LINGKARAN LATIHAN BAHASAMU",title:"Bahasa berkembang saat menjadi bagian dari hidupmu.",body:"Bangun pertemanan yang alami dan berkelanjutan dengan Ferson AI, lalu belajar dari setiap percakapan."},
  ar:{eyebrow:"دائرتك لممارسة اللغة",title:"تتحسن اللغة عندما تصبح جزءًا من حياتك.",body:"كوّن صداقات طبيعية ومستمرة مع شخصيات Ferson بالذكاء الاصطناعي، وتعلّم من كل محادثة."},
  fr:{eyebrow:"VOTRE CERCLE DE PRATIQUE",title:"Une langue progresse lorsqu’elle fait partie de votre vie.",body:"Nouez des amitiés naturelles et durables avec des Fersons IA, et apprenez à chaque conversation."},
  tr:{eyebrow:"DİL PRATİĞİ ÇEVREN",title:"Bir dil hayatının parçası olduğunda gelişir.",body:"Yapay zekâ Fersonlarla doğal ve devamlı arkadaşlıklar kur, her sohbette öğren."},
};
