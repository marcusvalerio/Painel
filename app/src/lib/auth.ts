import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { sql } from "./db";

const COOKIE = "pauta_session";
const DAYS = 30;

export type Session = {
  userId: string;
  userName: string;
  email: string;
  tenantId: string;
  tenantName: string;
  role: string;
  planId: string | null;
  subscriptionStatus: string;
  mustChangePassword: boolean;
  isSuperadmin: boolean;
};

export async function createSession(userId: string, tenantId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DAYS * 864e5);
  await sql`insert into sessions (token, user_id, tenant_id, expires_at) values (${token}, ${userId}, ${tenantId}, ${expires})`;
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`delete from sessions where token = ${token}`;
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await sql`
    select u.id as user_id, u.name as user_name, u.email, t.id as tenant_id, t.name as tenant_name,
           m.role, t.plan_id, t.subscription_status, u.must_change_password, u.is_superadmin
    from sessions s
    join users u on u.id = s.user_id
    join tenants t on t.id = s.tenant_id
    join memberships m on m.user_id = u.id and m.tenant_id = t.id
    where s.token = ${token} and s.expires_at > now()`;
  const r = rows[0];
  if (!r) return null;
  return {
    userId: r.user_id, userName: r.user_name, email: r.email,
    tenantId: r.tenant_id, tenantName: r.tenant_name, role: r.role,
    planId: r.plan_id, subscriptionStatus: r.subscription_status,
    mustChangePassword: r.must_change_password, isSuperadmin: r.is_superadmin,
  };
}

/** Exige login. Todo acesso a dados deve usar session.tenantId para isolar a empresa. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  return s;
}
