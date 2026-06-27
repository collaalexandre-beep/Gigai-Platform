import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "./auth";

export async function seedAdmin() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  if (Number(count) > 0) return;

  console.log("[Auth] Criando usuário admin padrão...");
  const hashed = await hashPassword("280228Ac@");
  await db.insert(users).values({
    username: "admin",
    password: hashed,
    nome: "Administrador",
    role: "admin",
    ativo: true,
  });
  console.log("[Auth] Admin criado com sucesso. Login: admin");
}
