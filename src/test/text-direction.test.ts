import { describe, expect, it } from "vitest";
import { answerDirection } from "@/lib/text-direction";

describe("answer direction", () => {
  it.each(["test answer", "Réponse française", "12 / 3 = 4", "١٢ + ٣ = ١٥", "x(t) = 2t + 1"])(
    "uses left-to-right layout for %s",
    (answer) => expect(answerDirection(answer)).toBe("ltr"),
  );

  it.each(["الإجابة هي 12", "نحسب x = 2 ثم نعوض", "النتيجة ٣٫٥ متر"])(
    "keeps Arabic and mixed answers right-to-left: %s",
    (answer) => expect(answerDirection(answer)).toBe("rtl"),
  );
});