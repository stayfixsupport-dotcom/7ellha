export const SITE_NAME = "حلّها 7ellha";
export const SITE_DESCRIPTION =
  "حلّها 7ellha منصة تعليمية جزائرية تجمع الأساتذة والتلاميذ لنشر ومشاركة سوجيات جميع المواد من شهادة التعليم المتوسط BEM إلى البكالوريا BAC، ومراجعتها وحلها تفاعلياً.";
export const HOME_TITLE = "حلّها 7ellha | منصة السوجيات والمواضيع من BEM إلى BAC";
export const HOME_DESCRIPTION =
  "حلّها 7ellha منصة جزائرية لنشر ومشاركة سوجيات جميع المواد من BEM إلى BAC. يرفع الأساتذة مواضيعهم، ويحلّ التلاميذ التمارين تفاعلياً.";
export const HOME_OG_DESCRIPTION =
  "منصة جزائرية للأساتذة والتلاميذ: شارك مواضيعك وسوجياتك، وتدرّب على حلّ المواضيع المنشورة من شهادة التعليم المتوسط BEM إلى البكالوريا BAC.";

export function configuredSiteUrl() {
  return import.meta.env["VITE_PUBLIC_SITE_URL"]?.trim().replace(/\/+$/, "");
}

export function requestSiteUrl(requestUrl: string) {
  return new URL(requestUrl).origin;
}
