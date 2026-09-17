import nodemailer from "nodemailer";

const from = process.env.SMTP_FROM;
if (!from) {
  throw new Error(
    "[ERROR] The environment variable 'SMTP_FROM' is not defined.",
  );
}

const user = process.env.SMTP_USER;
if (!user) {
  throw new Error(
    "[ERROR] The environment variable 'SMTP_USER' is not defined.",
  );
}

const pass = process.env.SMTP_PASS;
if (!pass) {
  throw new Error(
    "[ERROR] The environment variable 'SMTP_PASS' is not defined.",
  );
}

export async function sendResetPasswordEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Redefinição de Senha",
    text: `Olá!
    
    Você solicitou a redefinição da sua senha.
    
    Clique no link abaixo para redefinir sua senha:
    ${url}
    
    Se você não solicitou esta redefinição, ignore este e-mail.
    
    Este link expira em 15 minutos.`,
  });
}
