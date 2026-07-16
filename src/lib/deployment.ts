export type DeploymentCheck = {
  key: string;
  label: string;
  configured: boolean;
};

export function getDeploymentChecks(): DeploymentCheck[] {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? "";
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const phone = (process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "").replace(/\D/g, "");
  return [
    { key: "admin_password", label: "Admin parolası", configured: password.length >= 12 && password !== "change-this-password" },
    { key: "session_secret", label: "Admin oturum anahtarı", configured: sessionSecret.length >= 32 && sessionSecret !== "generate-a-long-random-secret" },
    { key: "deepseek", label: "DeepSeek API", configured: Boolean(process.env.DEEPSEEK_API_KEY) },
    { key: "portfolio_storage", label: "GitHub portföy deposu", configured: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_DATA_REPOSITORY) },
    { key: "media_storage", label: "Vercel Blob görsel deposu", configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN) },
    { key: "whatsapp", label: "WhatsApp numarası", configured: whatsapp.length >= 10 && whatsapp.length <= 15 },
    { key: "phone", label: "Telefon numarası", configured: phone.length >= 10 && phone.length <= 15 },
  ];
}
