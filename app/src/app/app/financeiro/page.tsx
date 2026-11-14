import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { brl, dataBR } from "@/lib/format";
import { createTransaction, markPaid } from "../../actions/data";

export default async function Financeiro() {
  const s = await requireSession();
  const [clients, rows, [k]] = await Promise.all([
    sql`select id, name from clients where tenant_id = ${s.tenantId} order by name`,
    sql`select t.*, c.name as cliente from transactions t left join clients c on c.id = t.client_id
        where t.tenant_id = ${s.tenantId} order by coalesce(t.paid_on, t.due_on) desc nulls last limit 100`,
    sql`select
      coalesce(sum(amount_cents) filter (where kind='entrada' and paid_on >= date_trunc('month', current_date)),0)::bigint as recebido,
      coalesce(sum(amount_cents) filter (where kind='saida' and paid_on >= date_trunc('month', current_date)),0)::bigint as gasto,
      coalesce(sum(amount_cents) filter (where kind='entrada' and paid_on is null),0)::bigint as receber,
      coalesce(sum(amount_cents) filter (where kind='entrada' and paid_on is null and due_on < current_date),0)::bigint as atrasado
      from transactions where tenant_id = ${s.tenantId}`,
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="head"><h1>Financeiro</h1></div>
      <div className="kpis">
        <div className="card kpi"><span className="eyebrow">Recebido no mês</span><b>{brl(k.recebido)}</b></div>
        <div className="card kpi"><span className="eyebrow">Gasto no mês</span><b>{brl(k.gasto)}</b></div>
        <div className="card kpi"><span className="eyebrow">Saldo do mês</span><b>{brl(Number(k.recebido) - Number(k.gasto))}</b></div>
        <div className="card kpi"><span className="eyebrow">A receber</span><b>{brl(k.receber)}</b></div>
        <div className="card kpi"><span className="eyebrow">Em atraso</span><b style={{ color: Number(k.atrasado) ? "#C2410C" : undefined }}>{brl(k.atrasado)}</b></div>
      </div>
      <form action={createTransaction} className="card inline-form" style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr auto" }}>
        <label className="field" htmlFor="t-kind">Tipo<select id="t-kind" name="kind"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label>
        <label className="field" htmlFor="t-desc">Descrição<input id="t-desc" name="description" required placeholder="Mensalidade novembro" /></label>
        <label className="field" htmlFor="t-client">Cliente<select id="t-client" name="client_id"><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field" htmlFor="t-amount">Valor (R$)<input id="t-amount" name="amount" inputMode="decimal" required placeholder="2.400,00" /></label>
        <label className="field" htmlFor="t-due">Vencimento<input id="t-due" name="due_on" type="date" /></label>
        <button className="btn btn-blue">Lançar</button>
      </form>
      <div className="card scroll">
        {rows.length === 0 ? <p className="muted">Nenhum lançamento ainda.</p> : (
          <table className="table">
            <thead><tr><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>Status</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
            <tbody>{rows.map((t) => {
              const due = t.due_on ? new Date(t.due_on).toISOString().slice(0, 10) : null;
              const st = t.paid_on ? ["Pago", "#A6DCC3"] : due && due < today ? ["Atrasado", "#F4A18C"] : ["Em aberto", "#E9D79A"];
              return (
                <tr key={t.id}>
                  <td>{t.description}</td><td className="muted">{t.cliente ?? "—"}</td><td>{dataBR(t.due_on)}</td>
                  <td><span className="pill" style={{ background: st[1] }}>{st[0]}</span>
                    {!t.paid_on && <form action={markPaid.bind(null, t.id)} style={{ display: "inline", marginLeft: 8 }}><button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 12 }}>Marcar pago</button></form>}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: t.kind === "saida" ? "#C2410C" : undefined }}>{t.kind === "saida" ? "− " : ""}{brl(t.amount_cents)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
