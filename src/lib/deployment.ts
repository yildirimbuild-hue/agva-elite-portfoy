export type DeploymentCheck = {
  key: string;
  label: string;
  configured: boolean;
  required: boolean;
};

export function getDeploymentChecks(): DeploymentCheck[] {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? "";
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const phone = (process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "").replace(/\D/g, "");

  return [
    { key: "admin_password", label: "Admin parolası", configured: password.length >= 12 && password !== "change-this-password", required: true },
    { key: "session_secret", label: "Admin oturum anahtarı", configured: sessionSecret.length >= 32 && sessionSecret !== "generate-a-long-random-secret", required: true },
    { key: "deepseek", label: "DeepSeek API", configured: Boolean(process.env.DEEPSEEK_API_KEY), required: false },
    { key: "elevenlabs", label: "ElevenLabs doğal ses", configured: Boolean(process.env.ELEVENLABS_API_KEY), required: false },
    { key: "portfolio_storage", label: "GitHub portföy ve ayar deposu", configured: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_DATA_REPOSITORY), required: true },
    { key: "media_storage", label: "Vercel Blob görsel deposu", configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN), required: true },
    { key: "whatsapp", label: "WhatsApp numarası", configured: whatsapp.length >= 10 && whatsapp.length <= 15, required: false },
    { key: "phone", label: "Telefon numarası", configured: phone.length >= 10 && phone.length <= 15, required: false },
  ];
}
