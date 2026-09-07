import type { InterfaceLocale } from "@/domain/models";

type SpecialistCopy = { title:string; body:string; field:string; example:string; alertTitle:string; alertBody:string };

export const specialistCopy: Record<InterfaceLocale, SpecialistCopy> = {
  en:{title:"Specialist Ferson",body:"Deeper practical knowledge in a professional field.",field:"Specialist field",example:"e.g. Mobile app development",alertTitle:"Premium feature",alertBody:"Specialist Fersons with deeper expertise are available with Premium."},
  "es-419":{title:"Ferson especialista",body:"Conocimiento práctico más profundo en un campo profesional.",field:"Área de especialidad",example:"p. ej., desarrollo de aplicaciones móviles",alertTitle:"Función Premium",alertBody:"Los Fersons especialistas están disponibles con Premium."},
  "es-ES":{title:"Ferson especialista",body:"Conocimientos prácticos más profundos en un campo profesional.",field:"Área de especialidad",example:"p. ej., desarrollo de aplicaciones móviles",alertTitle:"Función Premium",alertBody:"Los Fersons especialistas están disponibles con Premium."},
  "pt-BR":{title:"Ferson especialista",body:"Conhecimento prático mais profundo em uma área profissional.",field:"Área de especialidade",example:"ex.: desenvolvimento de aplicativos",alertTitle:"Recurso Premium",alertBody:"Fersons especialistas estão disponíveis no Premium."},
  "zh-Hans":{title:"专家 Ferson",body:"在特定专业领域拥有更深入的实用知识。",field:"专业领域",example:"例如：移动应用开发",alertTitle:"高级功能",alertBody:"专家 Ferson 仅适用于高级会员。"},
  ja:{title:"専門家Ferson",body:"専門分野について、より深い実用知識を持っています。",field:"専門分野",example:"例：モバイルアプリ開発",alertTitle:"プレミアム機能",alertBody:"専門家Fersonはプレミアムで利用できます。"},
  ko:{title:"전문가 Ferson",body:"전문 분야에 대한 더 깊은 실용 지식을 제공합니다.",field:"전문 분야",example:"예: 모바일 앱 개발",alertTitle:"프리미엄 기능",alertBody:"전문가 Ferson은 프리미엄에서 이용할 수 있습니다."},
  vi:{title:"Ferson chuyên gia",body:"Kiến thức thực tiễn chuyên sâu hơn trong một lĩnh vực chuyên môn.",field:"Lĩnh vực chuyên môn",example:"VD: phát triển ứng dụng di động",alertTitle:"Tính năng Premium",alertBody:"Ferson chuyên gia có trong gói Premium."},
  id:{title:"Ferson spesialis",body:"Pengetahuan praktis yang lebih mendalam dalam bidang profesional.",field:"Bidang spesialis",example:"mis. pengembangan aplikasi seluler",alertTitle:"Fitur Premium",alertBody:"Ferson spesialis tersedia dengan Premium."},
  ar:{title:"Ferson متخصص",body:"معرفة عملية أعمق في مجال مهني محدد.",field:"مجال التخصص",example:"مثال: تطوير تطبيقات الهاتف",alertTitle:"ميزة مميزة",alertBody:"شخصيات Ferson المتخصصة متاحة ضمن الاشتراك المميز."},
  fr:{title:"Ferson spécialiste",body:"Des connaissances pratiques plus approfondies dans un domaine professionnel.",field:"Domaine de spécialité",example:"ex. développement d’applications mobiles",alertTitle:"Fonction Premium",alertBody:"Les Fersons spécialistes sont disponibles avec Premium."},
  tr:{title:"Uzman Ferson",body:"Profesyonel bir alanda daha derin pratik bilgi.",field:"Uzmanlık alanı",example:"örn. mobil uygulama geliştirme",alertTitle:"Premium özellik",alertBody:"Uzman Fersonlar Premium ile kullanılabilir."},
};
