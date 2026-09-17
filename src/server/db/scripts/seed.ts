import "dotenv/config";

import { ensureAdmin } from "@/server/db/scripts/ensure-admin";

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  await ensureAdmin({
    email: ADMIN_EMAIL ?? "",
    password: ADMIN_PASSWORD ?? "",
  });

  console.log(`Admin user ensured: ${ADMIN_EMAIL}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
