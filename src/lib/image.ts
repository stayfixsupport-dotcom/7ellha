export async function profileImageData(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("اختر ملف صورة صالحاً");
  if (file.size > 10 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 10MB");

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const size = 320;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const edge = Math.min(image.width, image.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذّر معالجة الصورة");
    context.drawImage(image, (image.width - edge) / 2, (image.height - edge) / 2, edge, edge, 0, 0, size, size);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function offlineAnswerPageData(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("اختر صورة للصفحة المكتوبة");
  if (file.size > 15 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 15MB");

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("تعذّر تجهيز الصورة");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const quality = Math.max(0.46, 0.82 - attempt * 0.07);
      const result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= 850_000) return result;
      scale *= 0.84;
    }
    throw new Error("الصورة كبيرة جداً. التقط الصفحة من مسافة أبعد ثم حاول مجدداً.");
  } finally {
    URL.revokeObjectURL(url);
  }
}