import Link from "next/link";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export default async function Inicio() {
  const s = await requireSession();
  const [k] = await sql`
    select
      (select count(*) from clients where tenant_id = ${s.tenantId} and status = 'ativo')::int as clientes,
      (select count(*) from demands where tenant_id = ${s.tenantId} and stage not in ('agendado','publicado'))::int as abertas,
      (select count(*) from demands where tenant_id = ${s.tenantId} and stage = 'aprovacao')::int as aprovacao,
      (select count(*) from demands where tenant_id = ${s.tenantId} and due_date < current_date and stage not in ('agendado','publicado'))::int as atrasadas,
      (select coalesce(sum(monthly_fee_cents),0) from clients where tenant_id = ${s.tenantId} and status = 'ativo')::bigint as mrr`;
  const proximas = await sql`
    select d.id, d.title, d.due_date, d.stage, c.name as cliente from demands d left join clients c on c.id = d.client_id
    where d.tenant_id = ${s.tenantId} and d.stage not in ('agendado','publicado') and d.due_date is not null
    order by d.due_date limit 6`;
  const brl = (c: number) => (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <>
      <div className="head">
        <div><span className="eyebrow">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
          <h1>Olá, {s.userName.split(" ")[0]}</h1></div>
        <Link href="/app/demandas" className="btn btn-blue">Nova demanda</Link>
      </div>
      <div className="kpis">
        <div className="card kpi"><span className="eyebrow">Demandas abertas</span><b>{k.abertas}</b></div>
        <div className="card kpi"><span className="eyebrow">Aguardando aprovação</span><b>{k.aprovacao}</b></div>
        <div className="card kpi"><span className="eyebrow">Atrasadas</span><b style={{ color: k.atrasadas ? "#C2410C" : undefined }}>{k.atrasadas}</b></div>
        <div className="card kpi"><span className="eyebrow">Clientes ativos</span><b>{k.clientes}</b></div>
        <div className="card kpi"><span className="eyebrow">Receita mensal</span><b>{brl(k.mrr)}</b></div>
      </div>
      <section className="card">
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Próximos prazos</h2>
        {proximas.length === 0 ? <p className="muted">Nenhum prazo próximo. Crie demandas com data em <Link href="/app/demandas">Demandas</Link>.</p> : (
          <div className="scroll"><table className="table"><tbody>
            {proximas.map((d) => (
              <tr key={d.id}><td><b className="display" style={{ fontWeight: 600 }}>{d.title}</b></td><td className="muted">{d.cliente ?? "—"}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{new Date(d.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}
