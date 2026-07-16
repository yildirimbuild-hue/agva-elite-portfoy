const isVercel = process.env.VERCEL === "1";

if (!isVercel) {
  console.log("Dağıtım ortamı kontrolü: yerel geliştirme, Vercel zorunlulukları atlandı.");
  process.exit(0);
}

const password = process.env.ADMIN_PASSWORD ?? "";
const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? "";
const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const phone = (process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "").replace(/\D/g, "");

const checks = [
  ["ADMIN_PASSWORD", password.length >= 12 && password !== "change-this-password", "en az 12 karakterli güçlü parola"],
  ["ADMIN_SESSION_SECRET", sessionSecret.length >= 32 && sessionSecret !== "generate-a-long-random-secret", "en az 32 karakterli rastgele değer"],
  ["DEEPSEEK_API_KEY", Boolean(process.env.DEEPSEEK_API_KEY), "DeepSeek sunucu anahtarı"],
  ["GITHUB_TOKEN", Boolean(process.env.GITHUB_TOKEN), "portföy veri deposuna yazabilen ince kapsamlı token"],
  ["GITHUB_DATA_REPOSITORY", /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_DATA_REPOSITORY ?? ""), "owner/repository biçimi"],
  ["BLOB_READ_WRITE_TOKEN", Boolean(process.env.BLOB_READ_WRITE_TOKEN), "Vercel Blob mağaza bağlantısı"],
  ["NEXT_PUBLIC_WHATSAPP_NUMBER", whatsapp.length >= 10 && whatsapp.length <= 15, "ülke koduyla 10-15 rakam"],
  ["NEXT_PUBLIC_PHONE_NUMBER", phone.length >= 10 && phone.length <= 15, "ülke koduyla 10-15 rakam"],
];

const failed = checks.filter(([, valid]) => !valid);
if (failed.length) {
  console.error("Vercel dağıtımı durduruldu. Eksik veya geçersiz ortam değişkenleri:");
  for (const [name, , expectation] of failed) console.error(`- ${name}: ${expectation}`);
  process.exit(1);
}

console.log(`Vercel dağıtım ortamı doğrulandı: ${checks.length} kontrol geçti.`);
