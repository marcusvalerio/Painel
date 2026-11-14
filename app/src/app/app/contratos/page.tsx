import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { brl, dataBR } from "@/lib/format";
import { createContract } from "../../actions/data";

export default async function Contratos() {
  const s = await requireSession();
  const [clients, rows] = await Promise.all([
    sql`select id, name from clients where tenant_id = ${s.tenantId} order by name`,
    sql`select k.*, c.name as cliente, (k.ends_on - current_date) as dias from contracts k left join clients c on c.id = k.client_id
        where k.tenant_id = ${s.tenantId} order by k.ends_on nulls last`,
  ]);
  return (
    <>
      <div className="head"><h1>Contratos</h1><span className="muted">{rows.length} contratos</span></div>
      <form action={createContract} className="card inline-form" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}>
        <label className="field" htmlFor="k-title">Contrato<input id="k-title" name="title" required placeholder="Gestão de redes 2026" /></label>
        <label className="field" htmlFor="k-client">Cliente<select id="k-client" name="client_id"><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field" htmlFor="k-value">Valor mensal<input id="k-value" name="value" inputMode="decimal" placeholder="2.400,00" /></label>
        <label className="field" htmlFor="k-start">Início<input id="k-start" name="starts_on" type="date" /></label>
        <label className="field" htmlFor="k-end">Fim<input id="k-end" name="ends_on" type="date" /></label>
        <button className="btn btn-blue">Adicionar</button>
      </form>
      <div className="card scroll">
        {rows.length === 0 ? <p className="muted">Nenhum contrato cadastrado.</p> : (
          <table className="table">
            <thead><tr><th>Contrato</th><th>Cliente</th><th>Vigência</th><th>Situação</th><th style={{ textAlign: "right" }}>Mensal</th></tr></thead>
            <tbody>{rows.map((k) => {
              const d = k.dias == null ? null : Number(k.dias);
              const st = d == null ? ["Sem prazo", "#AECBE6"] : d < 0 ? ["Vencido", "#F4A18C"] : d <= 30 ? [`Vence em ${d} dias`, "#E9D79A"] : ["Vigente", "#A6DCC3"];
              return (
                <tr key={k.id}><td><b className="display" style={{ fontWeight: 600 }}>{k.title}</b></td><td className="muted">{k.cliente ?? "—"}</td>
                  <td>{dataBR(k.starts_on)} → {dataBR(k.ends_on)}</td><td><span className="pill" style={{ background: st[1] }}>{st[0]}</span></td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{brl(k.value_cents)}</td></tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
