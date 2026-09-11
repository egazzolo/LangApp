import type {InterfaceLocale} from "@/domain/models";
type Copy={title:string;correctionsTitle:string;correctionsBody:string};
const en:Copy={title:"How Ferson works",correctionsTitle:"Corrections and casual language",correctionsBody:"Relaxed corrects only problems that make you hard to understand. Balanced corrects meaningful mistakes but usually leaves common casual forms alone. Intensive may also explain forms like “gonna,” “kinda,” “r u,” and “idk.” Native speakers use these forms with friends, but standard forms are better for formal speech and writing."};
export const tutorialCopy:Record<InterfaceLocale,Copy>={
 en,
 "es-419":{title:"Cómo funciona Ferson",correctionsTitle:"Correcciones y lenguaje informal",correctionsBody:"Relajado solo corrige problemas que dificultan entenderte. Equilibrado corrige errores errores importantes, pero normalmente deja en paz las formas informales comunes. Intensivo también puede explicar formas como “gonna”, “kinda”, “r u” e “idk”. Los hablantes nativos las usan con amigos, pero las formas estándar son mejores para hablar y escribir formalmente."},
 "es-ES":{title:"Cómo funciona Ferson",correctionsTitle:"Correcciones y lenguaje informal",correctionsBody:"Relajado solo corrige problemas que dificultan entenderte. Equilibrado corrige errores importantes, pero normalmente deja en paz las formas informales comunes. Intensivo también puede explicar formas como “gonna”, “kinda”, “r u” e “idk”. Los hablantes nativos las usan con amigos, pero las formas estándar son mejores para hablar y escribir formalmente."},
 "pt-BR":en,"zh-Hans":en,ja:en,ko:en,vi:en,id:en,ar:en,fr:en,tr:en,
};
