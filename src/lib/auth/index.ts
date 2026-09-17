import { i18n } from "@better-auth/i18n";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { db } from "@/server/db";
import { schema } from "@/server/db/schemas";
import { MIN_PASSWORD_LENGTH, USER_ROLES } from "@/server/db/schemas/auth";

const baseURL = process.env.BETTER_AUTH_URL ?? {
  allowedHosts: [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    "localhost:3000",
  ].filter((host): host is string => Boolean(host)),
  fallback: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000",
};

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user: { email }, url }) => {
      const { sendResetPasswordEmail } = await import("@/server/email");
      return sendResetPasswordEmail({ email, url });
    },
    minPasswordLength: MIN_PASSWORD_LENGTH,
  },
  user: { deleteUser: { enabled: true } },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  plugins: [
    admin({
      defaultRole: USER_ROLES[0],
      adminRoles: USER_ROLES[2],
    }),
    i18n({
      defaultLocale: "pt",
      detection: ["header", "cookie"],
      translations: {
        pt: {
          USER_NOT_FOUND: "Usuário não encontrado",
          INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha inválidos",
          INVALID_PASSWORD: "Senha inválida",
          CREDENTIAL_ACCOUNT_NOT_FOUND: "Conta não encontrada",
          EMAIL_NOT_VERIFIED: "Email não verificado",
          SESSION_EXPIRED: "Sessão expirada",
          USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
            "Já existe uma conta com este e-mail, tente utilizar outro.",
        },
      },
    }),
  ],
});
