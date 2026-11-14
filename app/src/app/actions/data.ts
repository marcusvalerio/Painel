"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const STAGES = ["ideias", "producao", "aprovacao", "agendado", "publicado"];
const FORMATS = ["post", "carrossel", "reels", "stories", "video"];

export async function createClient(fd: FormData) {
  const s = await requireSession();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  const fee = Math.round(Number(String(fd.get("fee") ?? "0").replace(/\./g, "").replace(",", ".")) * 100) || 0;
  const [plan] = await sql`select max_clients from plans where id = ${s.planId}`;
  if (plan?.max_clients != null) {
    const [{ n }] = await sql`select count(*)::int as n from clients where tenant_id = ${s.tenantId}`;
    if (n >= plan.max_clients) return;
  }
  await sql`insert into clients (tenant_id, name, contact_name, email, phone, instagram, monthly_fee_cents, color)
    values (${s.tenantId}, ${name}, ${fd.get("contact") || null}, ${fd.get("email") || null}, ${fd.get("phone") || null},
            ${fd.get("instagram") || null}, ${fee}, ${fd.get("color") || "#AECBE6"})`;
  revalidatePath("/app/clientes");
}

export async function createDemand(fd: FormData) {
  const s = await requireSession();
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return;
  const format = FORMATS.includes(String(fd.get("format"))) ? String(fd.get("format")) : "post";
  const clientId = fd.get("client_id") || null;
  // garante que o cliente pertence à empresa
  if (clientId) {
    const ok = await sql`select 1 from clients where id = ${clientId} and tenant_id = ${s.tenantId}`;
    if (!ok.length) return;
  }
  await sql`insert into demands (tenant_id, client_id, assignee_id, title, format, due_date, stage)
    values (${s.tenantId}, ${clientId}, ${s.userId}, ${title}, ${format}, ${fd.get("due_date") || null}, 'ideias')`;
  revalidatePath("/app/demandas");
}

export async function moveDemand(id: string, stage: string) {
  const s = await requireSession();
  if (!STAGES.includes(stage)) return;
  const progress = { ideias: 10, producao: 50, aprovacao: 85, agendado: 100, publicado: 100 }[stage] ?? 0;
  await sql`update demands set stage = ${stage}, progress = ${progress},
    approval_status = case when ${stage} = 'aprovacao' and approval_status is null then 'aguardando' else approval_status end
    where id = ${id} and tenant_id = ${s.tenantId}`;
  revalidatePath("/app/demandas");
}

export async function deleteDemand(id: string) {
  const s = await requireSession();
  await sql`delete from demands where id = ${id} and tenant_id = ${s.tenantId}`;
  revalidatePath("/app/demandas");
}

/** Ação pública do link de aprovação: o token identifica a demanda e a empresa. */
export async function clientReview(token: string, fd: FormData) {
  const decision = String(fd.get("decision"));
  const comment = String(fd.get("comment") ?? "").trim();
  const author = String(fd.get("author") ?? "").trim() || "Cliente";
  const [d] = await sql`select id, tenant_id from demands where approval_token = ${token}`;
  if (!d) return;
  if (comment) {
    await sql`insert into demand_comments (tenant_id, demand_id, author_name, is_client, body)
      values (${d.tenant_id}, ${d.id}, ${author}, true, ${comment})`;
  }
  if (decision === "aprovar") {
    await sql`update demands set approval_status = 'aprovado', stage = 'agendado', progress = 100 where id = ${d.id}`;
  } else if (decision === "ajuste") {
    await sql`update demands set approval_status = 'ajuste', stage = 'producao', progress = 50 where id = ${d.id}`;
  }
  revalidatePath(`/aprovar/${token}`);
}
