const arabicLetters = /[\u0621-\u064a\u066e-\u06d3\u06fa-\u06fc\u0750-\u077f\u08a0-\u08c9]/;

export function answerDirection(text: string): "rtl" | "ltr" {
  return arabicLetters.test(text) ? "rtl" : "ltr";
}