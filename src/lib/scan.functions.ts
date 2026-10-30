import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ScanInput = {
  idToken: string;
  creatorRole: "teacher" | "student";
  fileName: string;
  mime:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "image/jpeg"
    | "image/png"
    | "image/webp";
  dataUrl: string | null; // images & PDFs
  text: string | null; // extracted DOCX text
  hintLevels: string[];
  hintSubjects: string[];
  pages?: string[] | undefined;
};
export type ScanResult = {
  title: string;
  level: "bem" | "1as" | "2as" | "bac";
  subject: string;
  duration: string;
  year: number;
  confidence: number;
  exercises: { title: string; context: string; questions: { text: string; points: number }[] }[];
};

const SUBJECT_IDS = [
  "math",
  "physics",
  "science",
  "arabic",
  "french",
  "english",
  "history",
  "islamic",
  "philo",
  "tech",
];

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "level", "subject", "duration", "year", "confidence", "exercises"],
  properties: {
    title: { type: "string" },
    level: { type: "string", enum: ["bem", "1as", "2as", "bac"] },
    subject: { type: "string", enum: SUBJECT_IDS },
    duration: { type: "string" },
    year: { type: "integer" },
    confidence: { type: "integer" },
    exercises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "context", "questions"],
        properties: {
          title: { type: "string" },
          context: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "points"],
              properties: { text: { type: "string" }, points: { type: "number" } },
            },
          },
        },
      },
    },
  },
};

const PROMPT = `أنت مساعد خبير في المنظومة التربوية الجزائرية. حلّل موضوع الامتحان المرفق بدقة وحوله إلى JSON.
- level: bem (شهادة التعليم المتوسط), 1as (السنة الأولى ثانوي), 2as (السنة الثانية ثانوي), bac (البكالوريا).
- subject: math, physics, science (علوم الطبيعة والحياة), arabic, french, english, history (تاريخ وجغرافيا), islamic, philo, tech.
- title: عنوان قصير للموضوع بلغة الموضوع.
- duration: المدة المكتوبة في الموضوع أو تقدير معقول (مثل "ساعتان").
- year: سنة الموضوع إن وُجدت وإلا 2026.
- confidence: نسبة ثقتك في التصنيف من 0 إلى 100.
- exercises: كل تمرين/جزء على حدة.
  * title: اسم التمرين فقط (مثل "التمرين 1") — لا تكتب "الجزء الأول" أو "الوضعية الأولى".
  * context: انسخ كل المعطيات حرفيًا، بما فيها نصوص الجداول والرسوم والرموز. إذا وجد رسم أو شكل هندسي، صِفْه بالتفصيل بين معقوفتين [ ] وضع الوصف في موضعه. لا تتجاوز أي عنصر مرئي.
  * questions: استخرج كل سؤال وكل فرع مرقّم أو معلّم بحرف في ترتيبه الظاهر؛ لا تدمج سؤالين ولا تحذف فرعًا. انسخ نص كل سؤال حرفيًا.
  * points: العلامة الرقمية الخاصة بهذا السؤال كما تظهر في الملف، كرقم فقط (مثال: 1 أو 0.5). لا تكتب وحدة العلامة. إذا كانت العلامة غير ظاهرة بوضوح فاستخدم 0 ولا تخمّن.
- قبل الإجابة، راجع كل صفحة وكل تمرين وسؤال وفرع وعلامة مرة ثانية للتأكد من عدم سقوط أي جزء.
- كل تعبير رياضي يجب أن يكون LaTeX صالحًا بين \\(...\\) أو \\[...\\].
- لا تحل الأسئلة ولا تضف مقدمات. أخرج JSON فقط.`;

const resultSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    level: z.enum(["bem", "1as", "2as", "bac"]),
    subject: z.enum(SUBJECT_IDS as [string, ...string[]]),
    duration: z.string().max(100),
    year: z.number().int().min(1950).max(2100),
    confidence: z.number().int().min(0).max(100),
    exercises: z
      .array(
        z
          .object({
            title: z.string().max(300),
            context: z.string().max(20000),
            questions: z
              .array(
                z.object({
                  text: z.string().max(4000),
                  points: z.number().min(0).max(100).default(0),
                  score: z.number().min(0).max(100).optional(),
                }),
              )
              .min(1)
              .max(100),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

function promptFor(data: ScanInput) {
  return `${PROMPT}\nاسم الملف: ${data.fileName}\nمستويات مقترحة: ${data.hintLevels.join(", ") || "-"}\nمواد مقترحة: ${data.hintSubjects.join(", ") || "-"}${data.text ? `\nنص الموضوع:\n${data.text.slice(0, 60000)}` : ""}`;
}

function openAiContent(data: ScanInput, prompt: string, ollamaFormat = false) {
  const images = imageInputs(data);
  if (!images.length) return prompt;
  return [
    { type: "text", text: prompt },
    ...images.map((url) => ({
      type: "image_url",
      image_url: ollamaFormat ? url : { url },
    })),
  ];
}

async function verifiedUid(idToken: string) {
  const apiKey = process.env["FIREBASE_WEB_API_KEY"];
  if (!apiKey) throw new Error("firebase_config_missing");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { users?: { localId?: string }[] };
  return payload.users?.[0]?.localId ?? null;
}

function imageInputs(data: ScanInput) {
  if (data.pages?.length) return data.pages;
  return data.dataUrl && data.mime.startsWith("image/") ? [data.dataUrl] : [];
}

let googleModelNamesPromise: Promise<string[]> | undefined;

function googleModelNames(key: string) {
  if (!googleModelNamesPromise) {
    googleModelNamesPromise = fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(15000),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`google_models_${response.status}`);
        const catalog = (await response.json()) as {
          models?: { name?: string; supportedGenerationMethods?: string[] }[];
        };
        return (catalog.models ?? [])
          .filter(
            (model) => model.name && model.supportedGenerationMethods?.includes("generateContent"),
          )
          .map((model) => model.name!.replace(/^models\//, ""));
      })
      .catch((error: unknown) => {
        googleModelNamesPromise = undefined;
        throw error;
      });
  }
  return googleModelNamesPromise;
}

async function callOpenAiCompatible(
  data: ScanInput,
  prompt: string,
  url: string,
  key: string,
  model: string,
  provider: string,
  ollamaFormat = false,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: openAiContent(data, prompt, ollamaFormat) }],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`${provider}_${response.status}`);
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | { text?: string }[] } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  return typeof content === "string"
    ? content
    : (content?.map((part) => part.text ?? "").join("") ?? "");
}

async function callGoogle(data: ScanInput, prompt: string, key: string) {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  const images = imageInputs(data);
  if (images.length) {
    for (const image of images) {
      const [header, encoded] = image.split(",", 2);
      const mimeType = header?.match(/^data:(image\/(?:jpeg|png|webp));base64$/)?.[1];
      if (!encoded || !mimeType) throw new Error("invalid_file_data");
      parts.push({ inlineData: { mimeType, data: encoded } });
    }
  } else if (data.dataUrl) {
    const encoded = data.dataUrl.split(",", 2)[1];
    if (!encoded) throw new Error("invalid_file_data");
    parts.push({ inlineData: { mimeType: data.mime, data: encoded } });
  }
  const body = JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  const availableModels = await googleModelNames(key);
  const models = [
    ...availableModels.filter(
      (model) => /flash/i.test(model) && !/preview|image|tts|audio|live/i.test(model),
    ),
    ...availableModels.filter((model) => /flash/i.test(model) && /preview/i.test(model)),
  ].slice(0, 4);
  if (!models.length) throw new Error("google_no_supported_flash_model");

  let lastStatus: number | undefined;
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body,
          signal: AbortSignal.timeout(60000),
        },
      );
      if (response.ok) {
        const payload = (await response.json()) as {
          candidates?: {
            content?: { parts?: { text?: string }[] };
            finishReason?: string;
          }[];
        };
        const text =
          payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
        if (!text) {
          const reason = payload.candidates?.[0]?.finishReason || "empty";
          throw new Error(`google_${reason.toLowerCase()}`);
        }
        return text;
      }
      if (![400, 404, 429, 503].includes(response.status)) {
        throw new Error(`google_${response.status}`);
      }
      lastStatus = response.status;
      console.warn(`Google model ${model} returned ${response.status}, trying fallback model...`);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith("google_") &&
        !err.message.includes("503") &&
        !err.message.includes("429") &&
        !err.message.includes("404") &&
        !err.message.includes("400")
      ) {
        throw err;
      }
    }
  }
  throw new Error(lastStatus ? `google_${lastStatus}` : "google_unavailable");
}

async function callCohere(data: ScanInput, prompt: string, key: string) {
  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "command-r7b-12-2024",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`cohere_${response.status}`);
  const payload = (await response.json()) as {
    message?: { content?: { type?: string; text?: string }[] };
  };
  return payload.message?.content?.find((c) => c.type === "text")?.text ?? "";
}

async function callCloudflare(data: ScanInput, prompt: string, account: string, key: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ messages: [{ role: "user", content: `${prompt}\nأخرج JSON فقط.` }] }),
      signal: AbortSignal.timeout(18000),
    },
  );
  if (!response.ok) throw new Error(`cloudflare_${response.status}`);
  const payload = (await response.json()) as { result?: { response?: unknown } };
  const raw = payload.result?.response;
  return typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sanitizeExercises(exercises: unknown[]) {
  return exercises.map((value, i) => {
    const ex = recordOf(value) ?? {};
    const rawQuestions = Array.isArray(ex["questions"]) ? ex["questions"] : [];
    // Accept both "points" and "score" (models use either)
    const questions = rawQuestions.map((value, qi) => {
      const q = recordOf(value) ?? {};
      return {
        text: typeof q["text"] === "string" && q["text"].trim() ? q["text"] : `سؤال ${qi + 1}`,
        points: readPoints(q["points"]) ?? readPoints(q["score"]) ?? 0,
      };
    });
    // Strip section prefixes like "الجزء الأول:" → keep clean exercise titles
    let title =
      typeof ex["title"] === "string" && ex["title"].trim() ? ex["title"] : `التمرين ${i + 1}`;
    title = title.replace(/^(الجزء|الوِضْعِيَّة)\s*[:\s]+\s*/u, "").trim();
    return { title, context: typeof ex["context"] === "string" ? ex["context"] : "", questions };
  });
}

function readPoints(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٫٬]/g, ".")
    .replace(/,/g, ".")
    .match(/\d+(?:\.\d+)?/u)?.[0];
  if (!normalized) return undefined;
  const points = Number(normalized);
  return Number.isFinite(points) ? points : undefined;
}

function parseResult(output: string, providerName: string) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) {
    console.warn(`[${providerName}] returned a non-JSON response`);
    throw new Error("invalid_model_json");
  }
  const jsonStr = output.slice(start, end + 1);
  try {
    const raw = JSON.parse(jsonStr);
    raw.exercises = sanitizeExercises(Array.isArray(raw.exercises) ? raw.exercises : []);
    if (raw.confidence === null || typeof raw.confidence !== "number") raw.confidence = 50;
    if (typeof raw.year !== "number" || !Number.isInteger(raw.year)) raw.year = 2026;
    if (typeof raw.title !== "string" || !raw.title.trim()) raw.title = "موضوع الامتحان";
    if (typeof raw.duration !== "string") raw.duration = "غير محدد";
    return resultSchema.parse(raw);
  } catch (err) {
    console.warn(
      `[${providerName}] returned invalid scan data`,
      err instanceof z.ZodError ? err.issues : "invalid JSON",
    );
    throw err;
  }
}

async function runScanProvider(
  data: ScanInput,
  prompt: string,
  providerName: string,
  run: (data: ScanInput, prompt: string) => Promise<string>,
): Promise<ScanResult> {
  const pages = imageInputs(data);
  if (pages.length <= 3) return parseResult(await run(data, prompt), providerName);

  const pageResults: ScanResult[] = [];
  for (let offset = 0; offset < pages.length; offset += 3) {
    const chunk = pages.slice(offset, offset + 3);
    const chunkData: ScanInput = { ...data, dataUrl: null, pages: chunk };
    const chunkPrompt = `${prompt}\nحلّل الصفحات ${offset + 1} إلى ${offset + chunk.length} من أصل ${pages.length}. استخرج الأسئلة الظاهرة في هذه الصفحات فقط، ولا تخترع محتوى غير ظاهر.`;
    pageResults.push(parseResult(await run(chunkData, chunkPrompt), providerName));
  }

  const first = pageResults[0];
  if (!first) throw new Error("empty_scan_result");
  return resultSchema.parse({
    ...first,
    exercises: pageResults.flatMap((result) => result.exercises),
  });
}

export const scanSujet = createServerFn({ method: "POST" })
  .validator((d: ScanInput) => d)
  .handler(
    async ({ data }): Promise<{ ok: true; result: ScanResult } | { ok: false; error: string }> => {
      const input = z
        .object({
          idToken: z.string().min(100).max(10000),
          creatorRole: z.enum(["teacher", "student"]),
          fileName: z.string().min(1).max(200),
          mime: z.enum([
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png",
            "image/webp",
          ]),
          dataUrl: z.string().max(22000000).nullable(),
          text: z.string().max(60000).nullable(),
          hintLevels: z.array(z.string().max(20)).max(10),
          hintSubjects: z.array(z.string().max(30)).max(20),
          pages: z.array(z.string().max(850000)).max(3).optional(),
        })
        .safeParse(data);
      if (!input.success)
        return { ok: false, error: "بيانات الملف غير صالحة أو حجمه أكبر من الحد المسموح" };
      const clean = input.data;
      const pageBytes = clean.pages?.reduce((total, page) => total + page.length, 0) ?? 0;
      const validPageData =
        clean.pages?.every((page) =>
          /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(page),
        ) ?? true;
      const validDataUrl =
        clean.dataUrl === null ||
        new RegExp(`^data:${clean.mime.replace("/", "\\/")};base64,[A-Za-z0-9+/]+=*$`).test(
          clean.dataUrl,
        );
      if (
        (!clean.dataUrl && !clean.text && !clean.pages?.length) ||
        !validPageData ||
        !validDataUrl ||
        pageBytes > 2550000
      ) {
        return { ok: false, error: "الملف فارغ أو غير صالح" };
      }

      try {
        const uid = await verifiedUid(clean.idToken);
        if (!uid)
          return { ok: false, error: "انتهت جلسة الدخول. سجّل الدخول مجدداً ثم أعد المحاولة." };
      } catch (error) {
        console.error("Scan account verification failed", error);
        return { ok: false, error: "تعذّر التحقق من الحساب حالياٌ" };
      }

      const prompt = promptFor(clean);
      const providers: {
        name: string;
        run: (data: ScanInput, prompt: string) => Promise<string>;
        textOnly?: boolean;
      }[] = [];
      const hasImages = imageInputs(clean).length > 0;
      const hasText = Boolean(clean.text?.trim());
      const canUseTextProvider = hasText;
      const googleKey = process.env["GOOGLE_AI_STUDIO_API_KEY"];
      if (googleKey)
        providers.push({
          name: "google-ai-studio",
          run: (data, text) => callGoogle(data, text, googleKey),
        });

      const groqKey = process.env["GROQ_API_KEY"];
      if (groqKey && (canUseTextProvider || (hasImages && imageInputs(clean).length <= 5))) {
        const model = hasImages ? "qwen/qwen3.8-27b" : "openai/gpt-oss-120b";
        providers.push({
          name: "groq",
          run: (data, text) =>
            callOpenAiCompatible(
              data,
              text,
              "https://api.groq.com/openai/v1/chat/completions",
              groqKey,
              model,
              "groq",
            ),
        });
      }

      const openRouterKey = process.env["OPENROUTER_API_KEY"];
      if (openRouterKey && (hasImages || canUseTextProvider)) {
        const model = hasImages ? "google/gemini-2.5-flash" : "openai/gpt-oss-120b";
        providers.push({
          name: "openrouter",
          run: (data, text) =>
            callOpenAiCompatible(
              data,
              text,
              "https://openrouter.ai/api/v1/chat/completions",
              openRouterKey,
              model,
              "openrouter",
            ),
        });
      }

      const cloudflareAccount = process.env["CLOUDFLARE_ACCOUNT_ID"];
      const cloudflareKey = process.env["CLOUDFLARE_API_TOKEN"];
      if (cloudflareAccount && cloudflareKey && canUseTextProvider)
        providers.push({
          name: "cloudflare-workers-ai",
          textOnly: true,
          run: (_data, text) => callCloudflare(clean, text, cloudflareAccount, cloudflareKey),
        });

      const ollamaKey = process.env["OLLAMA_CLOUD_API_KEY"];
      if (ollamaKey && (hasImages || canUseTextProvider)) {
        const model = "gemma4:31b";
        providers.push({
          name: "ollama-cloud",
          run: (data, text) =>
            callOpenAiCompatible(
              data,
              text,
              "https://ollama.com/v1/chat/completions",
              ollamaKey,
              model,
              "ollama",
              true,
            ),
        });
      }

      const requestyKey = process.env["REQUESTY_API_KEY"];
      if (requestyKey && (hasImages || canUseTextProvider)) {
        const model = hasImages ? "google/gemini-2.5-flash" : "meta-llama/llama-3.3-70b-instruct";
        providers.push({
          name: "requesty",
          run: (data, text) =>
            callOpenAiCompatible(
              data,
              text,
              "https://router.requesty.ai/v1/chat/completions",
              requestyKey,
              model,
              "requesty",
            ),
        });
      }

      const cohereKey = process.env["COHERE_API_KEY"];
      if (cohereKey && canUseTextProvider)
        providers.push({
          name: "cohere",
          textOnly: true,
          run: (_data, text) => callCohere(clean, text, cohereKey),
        });

      const xaiKey = process.env["XAI_API_KEY"] || process.env["XKIRO_API_KEY"];
      if (xaiKey && (hasImages || canUseTextProvider)) {
        const model = "grok-4.7";
        providers.push({
          name: "xai",
          run: (data, text) =>
            callOpenAiCompatible(
              data,
              text,
              "https://api.x.ai/v1/chat/completions",
              xaiKey,
              model,
              "xai",
            ),
        });
      }

      if (!providers.length) {
        const error =
          hasImages || clean.mime === "application/pdf"
            ? "لم تتم إضافة مزوّد يدعم معالجة الصور وPDF بعد"
            : "لم تتم إضافة أي مفتاح ذكاء اصطناعي إلى إعدادات الخادم بعد";
        return { ok: false, error };
      }

      const failures: string[] = [];
      for (const provider of providers) {
        try {
          const providerData =
            provider.textOnly && hasImages ? { ...clean, dataUrl: null, pages: undefined } : clean;
          const result = await runScanProvider(providerData, prompt, provider.name, provider.run);
          if (result.exercises.length) return { ok: true, result };
        } catch (error) {
          const reason = error instanceof Error ? error.message : "unknown_error";
          console.warn(`AI provider ${provider.name} failed: ${reason.slice(0, 80)}`);
          const status = reason.match(/_(\d{3})$/)?.[1];
          const label =
            provider.name === "google-ai-studio"
              ? "Google"
              : provider.name === "openrouter"
                ? "OpenRouter"
                : provider.name;
          failures.push(`${label}: ${providerFailureReason(status, reason)}`);
        }
      }
      const details = failures.length ? ` (${failures.join("، ")})` : "";
      const billingFailure = failures.some((failure) => failure.includes("رصيد/فوترة"));
      const error = billingFailure
        ? "بعض مزوّدي الذكاء الاصطناعي رفضوا الطلب بسبب الرصيد أو إعدادات الفوترة. راجع رصيد الحساب في لوحة المزوّد؛ إضافة المفتاح وحدها لا تكفي."
        : "تعذّر التحليل عبر مزوّدي الذكاء الاصطناعي. راجع نوع المفتاح والطراز المفعّل، ثم جرّب مجدداً.";
      return { ok: false, error: `${error}${details}` };
    },
  );

function providerFailureReason(status: string | undefined, reason: string) {
  if (status === "402") return "رصيد/فوترة (402)";
  if (status === "401") return "مفتاح غير صالح (401)";
  if (status === "403") return "صلاحية أو وصول غير مفعّل (403)";
  if (status === "404") return "الطراز أو المسار غير متاح (404)";
  if (status === "429") return "تجاوز حد الاستخدام (429)";
  if (status === "400") return "الطلب أو صيغة الملف غير مدعومة (400)";
  if (status && Number(status) >= 500) return `عطل مؤقت لدى المزوّد (${status})`;
  if (reason.toLowerCase().includes("timeout")) return "انتهت مهلة الاتصال";
  return "استجابة غير صالحة";
}
