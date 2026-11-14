"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const agency = String(fd.get("agency") ?? "").trim();
  const plan = String(fd.get("plan") ?? "agencia");
  if (!name || !email || !agency) return { error: "Preencha nome, e-mail e nome da agência." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const exists = await sql`select 1 from users where email = ${email}`;
  if (exists.length) return { error: "Já existe uma conta com esse e-mail. Entre com ela." };

  const hash = await bcrypt.hash(password, 10);
  const slug = `${slugify(agency) || "agencia"}-${Math.random().toString(36).slice(2, 6)}`;
  const [u] = await sql`insert into users (name, email, password_hash) values (${name}, ${email}, ${hash}) returning id`;
  const [t] = await sql`insert into tenants (name, slug, plan_id) values (${agency}, ${slug}, ${plan}) returning id`;
  await sql`insert into memberships (tenant_id, user_id, role) values (${t.id}, ${u.id}, 'dono')`;
  await createSession(u.id, t.id);
  redirect("/app");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const [u] = await sql`select id, password_hash from users where email = ${email}`;
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return { error: "E-mail ou senha incorretos." };
  const [m] = await sql`select tenant_id from memberships where user_id = ${u.id} limit 1`;
  if (!m) return { error: "Sua conta não está ligada a nenhuma agência." };
  await createSession(u.id, m.tenant_id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/entrar");
}
