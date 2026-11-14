"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export type PwState = { error?: string; ok?: string } | undefined;

export async function changePassword(_: PwState, fd: FormData): Promise<PwState> {
  const s = await requireSession();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const [u] = await sql`select password_hash from users where id = ${s.userId}`;
  if (!u || !(await bcrypt.compare(current, u.password_hash))) return { error: "A senha atual está incorreta." };
  if (next.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  if (next !== confirm) return { error: "A confirmação não bate com a nova senha." };
  if (next === current) return { error: "A nova senha precisa ser diferente da atual." };
  await sql`update users set password_hash = ${await bcrypt.hash(next, 10)}, must_change_password = false where id = ${s.userId}`;
  revalidatePath("/app", "layout");
  return { ok: "Senha alterada." };
}

export async function updateProfile(fd: FormData) {
  const s = await requireSession();
  const name = String(fd.get("name") ?? "").trim();
  const agency = String(fd.get("agency") ?? "").trim();
  if (name) await sql`update users set name = ${name} where id = ${s.userId}`;
  if (agency && ["dono", "admin"].includes(s.role)) await sql`update tenants set name = ${agency} where id = ${s.tenantId}`;
  revalidatePath("/app", "layout");
}
