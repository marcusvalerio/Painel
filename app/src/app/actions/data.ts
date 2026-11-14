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

function cents(v: FormDataEntryValue | null) {
  return Math.round(Number(String(v ?? "0").replace(/\./g, "").replace(",", ".")) * 100) || 0;
}

async function ownClient(tenantId: string, id: FormDataEntryValue | null) {
  if (!id) return null;
  const ok = await sql`select 1 from clients where id = ${id} and tenant_id = ${tenantId}`;
  return ok.length ? String(id) : null;
}

export async function createTransaction(fd: FormData) {
  const s = await requireSession();
  const description = String(fd.get("description") ?? "").trim();
  const kind = fd.get("kind") === "saida" ? "saida" : "entrada";
  if (!description) return;
  await sql`insert into transactions (tenant_id, client_id, kind, description, amount_cents, due_on, paid_on)
    values (${s.tenantId}, ${await ownClient(s.tenantId, fd.get("client_id"))}, ${kind}, ${description}, ${cents(fd.get("amount"))},
            ${fd.get("due_on") || null}, ${fd.get("paid") ? new Date().toISOString().slice(0, 10) : null})`;
  revalidatePath("/app/financeiro");
}

export async function markPaid(id: string) {
  const s = await requireSession();
  await sql`update transactions set paid_on = current_date where id = ${id} and tenant_id = ${s.tenantId}`;
  revalidatePath("/app/financeiro");
}

export async function createContract(fd: FormData) {
  const s = await requireSession();
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return;
  await sql`insert into contracts (tenant_id, client_id, title, value_cents, starts_on, ends_on)
    values (${s.tenantId}, ${await ownClient(s.tenantId, fd.get("client_id"))}, ${title}, ${cents(fd.get("value"))},
            ${fd.get("starts_on") || null}, ${fd.get("ends_on") || null})`;
  revalidatePath("/app/contratos");
}

const LEAD_STAGES = ["novo", "briefing", "proposta", "fechado", "perdido"];

export async function createLead(fd: FormData) {
  const s = await requireSession();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  await sql`insert into leads (tenant_id, name, contact, source, value_cents)
    values (${s.tenantId}, ${name}, ${fd.get("contact") || null}, ${fd.get("source") || null}, ${cents(fd.get("value"))})`;
  revalidatePath("/app/comercial");
}

export async function moveLead(id: string, stage: string) {
  const s = await requireSession();
  if (!LEAD_STAGES.includes(stage)) return;
  await sql`update leads set stage = ${stage} where id = ${id} and tenant_id = ${s.tenantId}`;
  revalidatePath("/app/comercial");
}

export async function scheduleDemand(fd: FormData) {
  const s = await requireSession();
  const id = String(fd.get("id") ?? "");
  const when = String(fd.get("scheduled_at") ?? "");
  if (!id || !when) return;
  await sql`update demands set scheduled_at = ${new Date(when + ":00-03:00")}, caption = coalesce(nullif(${String(fd.get("caption") ?? "")}, ''), caption),
    stage = case when stage in ('ideias','producao','aprovacao') and approval_status = 'aprovado' then 'agendado' else stage end
    where id = ${id} and tenant_id = ${s.tenantId}`;
  revalidatePath("/app/agendamento");
}
