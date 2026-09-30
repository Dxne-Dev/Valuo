// @ts-nocheck
// Supabase Edge Function: send-welcome-email
// Supports Gmail SMTP (Nodemailer), Resend, and Brevo

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, name, tempPassword, activationUrl, html } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SMTP_USER = Deno.env.get("SMTP_USER") || "metierpro158@gmail.com";
    const rawPass = Deno.env.get("SMTP_PASSWORD") || Deno.env.get("GMAIL_APP_PASSWORD") || "layotlcgsawxymzd";
    const SMTP_PASSWORD = rawPass ? rawPass.replace(/\s+/g, "") : "";
    const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || 465);

    // 1. Send via SMTP (Gmail) if SMTP_PASSWORD is set
    if (SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for 465, false for 587
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASSWORD,
        },
      });

      const info = await transporter.sendMail({
        from: `VALUO <${SMTP_USER}>`,
        to: email,
        subject: "Bienvenue sur VALUO ! Active ton compte",
        html: html,
      });

      return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Send via Resend API if RESEND_API_KEY is set
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "VALUO <onboarding@resend.dev>",
          to: [email],
          subject: "Bienvenue sur VALUO ! Active ton compte",
          html: html,
        }),
      });

      const resData = await res.json();
      return new Response(JSON.stringify(resData), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if no secret is configured yet
    console.warn("[send-welcome-email] Aucun mot de passe SMTP configuré dans les secrets Supabase.");
    return new Response(
      JSON.stringify({
        success: true,
        message: "Email simulé (Configurez SMTP_PASSWORD dans Supabase Secrets pour l'envoi réel)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[send-welcome-email error]:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
