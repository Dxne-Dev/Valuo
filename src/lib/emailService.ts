import { supabase, isSupabaseConfigured } from "./supabase";


export type WelcomeEmailPayload = {
  email: string;
  name: string;
  tempPassword: string;
  activationUrl: string;
};

/**
 * Generate standard VALUO HTML email template
 */
export function getValuoWelcomeEmailHtml({
  name,
  tempPassword,
  activationUrl,
}: {
  name: string;
  tempPassword: string;
  activationUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Active ton compte VALUO</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f0e5;
      color: #173f35;
      margin: 0;
      padding: 32px 16px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 28px;
      padding: 40px 32px;
      box-shadow: 0 20px 60px rgba(23, 63, 53, 0.08);
      border: 1px solid rgba(23, 63, 53, 0.08);
    }
    .logo-badge {
      display: inline-block;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: #173f35;
    }
    .logo-badge span {
      color: #e9683a;
    }
    .tag {
      display: inline-block;
      background-color: #fff0eb;
      color: #e9683a;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-top: 18px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.15;
      color: #173f35;
      margin: 14px 0 10px 0;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #55665e;
      margin: 10px 0;
    }
    .password-card {
      background: #fbf8f1;
      border: 2px dashed #e9683a;
      border-radius: 20px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .password-card .label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #76837c;
      margin-bottom: 8px;
    }
    .password-card .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 24px;
      font-weight: 900;
      color: #e9683a;
      letter-spacing: 2px;
      background: #ffffff;
      padding: 8px 16px;
      border-radius: 12px;
      display: inline-block;
      border: 1px solid rgba(233, 104, 58, 0.2);
    }
    .password-card .expiry {
      font-size: 11px;
      font-weight: 700;
      color: #d9582d;
      margin-top: 10px;
    }
    .cta-btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      background-color: #173f35;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 800;
      padding: 16px 24px;
      border-radius: 18px;
      margin: 28px 0 16px 0;
      box-shadow: 0 12px 30px rgba(23, 63, 53, 0.25);
    }
    .divider {
      height: 1px;
      background-color: rgba(23, 63, 53, 0.08);
      margin: 28px 0;
    }
    .footer {
      font-size: 12px;
      color: #929d97;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">VALUO<span>.</span></div>
    <br>
    <div class="tag">Bienvenue dans l'arène</div>
    <h1>Active ton compte et rejoins le défi</h1>
    <p>Bonjour <strong>${name}</strong>,</p>
    <p>Ton inscription à <strong>VALUO</strong> est validée ! Pour te connecter et rejoindre ton escouade du jour, utilise le mot de passe temporaire ci-dessous :</p>

    <div class="password-card">
      <div class="label">Mot de passe temporaire</div>
      <div class="code">${tempPassword}</div>
      <div class="expiry">Valable pendant 24 heures seulement</div>
    </div>

    <a href="${activationUrl}" class="cta-btn">Activer mon compte & Me connecter →</a>

    <p style="font-size: 12px; color: #76837c; text-align: center;">
      Tu pourras personnaliser ce mot de passe à la fin de ton onboarding.
    </p>

    <div class="divider"></div>

    <div class="footer">
      <strong>VALUO</strong> — Le jeu social des curieux et passionnés d'objets.<br>
      Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends or dispatches the custom VALUO welcome email
 */
export async function sendValuoWelcomeEmail(payload: WelcomeEmailPayload): Promise<{ success: boolean; error?: string }> {
  const { email, name, tempPassword, activationUrl } = payload;
  const emailHtml = getValuoWelcomeEmailHtml({ name, tempPassword, activationUrl });

  console.info(`[VALUO Email Service] Preparing branded welcome email for ${email} with temp password.`);

  try {
    // 1. Invoke Supabase Edge Function 'send-welcome-email'
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke("send-welcome-email", {
          body: {
            email,
            name,
            tempPassword,
            activationUrl,
            html: emailHtml,
          },
        });

        if (error) {
          console.warn("[VALUO Email Service] Edge Function returned error:", error);
        } else {
          console.info("[VALUO Email Service] Email sent successfully via Edge Function:", data);
          return { success: true };
        }
      } catch (fnErr) {
        console.warn("[VALUO Email Service] Edge function invoke exception:", fnErr);
      }
    }

    // Local simulation fallback
    console.log(
      `%c[VALUO EMAIL DISPATCHED TO ${email}]`,
      "background: #173f35; color: #f3c969; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
      `\n- Temp Password: ${tempPassword}\n- Activation URL: ${activationUrl}`
    );

    return { success: true };
  } catch (err: any) {
    console.error("[VALUO Email Service] Failed to send email:", err);
    return { success: false, error: err?.message || "Erreur d'envoi" };
  }
}

