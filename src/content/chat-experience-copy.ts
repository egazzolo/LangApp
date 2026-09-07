import type { InterfaceLocale } from "@/domain/models";

type ChatExperienceCopy = { connectionError: string; messageError: string; suggestionError: string };

export const chatExperienceCopy: Record<InterfaceLocale, ChatExperienceCopy> = {
  en: { connectionError: "Couldn’t connect right now. Try again.", messageError: "Couldn’t send that message. Try again.", suggestionError: "Oops, I hit a mental block. Ask me again?" },
  "es-419": { connectionError: "No pudimos conectarnos ahora. Inténtalo de nuevo.", messageError: "No se pudo enviar ese mensaje. Inténtalo de nuevo.", suggestionError: "¡Ups! Me quedé en blanco. ¿Me preguntas de nuevo?" },
  "es-ES": { connectionError: "No pudimos conectarnos ahora. Inténtalo de nuevo.", messageError: "No se pudo enviar ese mensaje. Inténtalo de nuevo.", suggestionError: "¡Ups! Me quedé en blanco. ¿Me preguntas de nuevo?" },
  "pt-BR": { connectionError: "Não foi possível conectar agora. Tente novamente.", messageError: "Não foi possível enviar essa mensagem. Tente novamente.", suggestionError: "Ops! Deu um branco. Pode perguntar de novo?" },
  "zh-Hans": { connectionError: "暂时无法连接，请重试。", messageError: "这条消息未能发送，请重试。", suggestionError: "糟糕，我一时没想到。再问我一次好吗？" },
  ja: { connectionError: "今は接続できません。もう一度お試しください。", messageError: "メッセージを送信できませんでした。もう一度お試しください。", suggestionError: "ごめん、ちょっと思いつかなかった。もう一度聞いてくれる？" },
  ko: { connectionError: "지금은 연결할 수 없어요. 다시 시도해 주세요.", messageError: "메시지를 보내지 못했어요. 다시 시도해 주세요.", suggestionError: "앗, 잠깐 생각이 막혔어요. 다시 물어봐 줄래요?" },
  vi: { connectionError: "Hiện chưa thể kết nối. Hãy thử lại.", messageError: "Không gửi được tin nhắn đó. Hãy thử lại.", suggestionError: "Ôi, mình bí ý tưởng mất rồi. Hỏi lại mình nhé?" },
  id: { connectionError: "Belum bisa terhubung saat ini. Coba lagi.", messageError: "Pesan itu belum terkirim. Coba lagi.", suggestionError: "Ups, aku sedang buntu. Tanya lagi, ya?" },
  ar: { connectionError: "تعذّر الاتصال الآن. حاول مرة أخرى.", messageError: "تعذّر إرسال الرسالة. حاول مرة أخرى.", suggestionError: "عذرًا، توقفت أفكاري للحظة. هل تسألني مرة أخرى؟" },
  fr: { connectionError: "Impossible de se connecter pour le moment. Réessayez.", messageError: "Ce message n’a pas pu être envoyé. Réessayez.", suggestionError: "Oups, j’ai un trou. Vous pouvez me redemander ?" },
  tr: { connectionError: "Şu anda bağlanılamıyor. Tekrar dene.", messageError: "Bu mesaj gönderilemedi. Tekrar dene.", suggestionError: "Hay aksi, bir an aklım durdu. Tekrar sorar mısın?" },
};
