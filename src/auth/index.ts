import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });
        await transporter.sendMail({
          from: `"Juntaditas" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: "Tu link de acceso a Juntaditas",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Hola!</h2>
              <p>Hace click en el botón para entrar a Juntaditas:</p>
              <a href="${url}" style="
                display: inline-block;
                background: #000;
                color: #fff;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                margin: 16px 0;
              ">Entrar a Juntaditas</a>
              <p style="color: #666; font-size: 14px;">
                El link expira en 10 minutos. Si no pediste esto, ignora este email.
              </p>
            </div>
          `,
        });
      },
      expiresIn: 600, // 10 minutes
    }),
  ],
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      role: { type: "string", required: false, defaultValue: "member" },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"] & { role: "admin" | "member"; phone?: string | null };
