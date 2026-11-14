import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { createClient } from "../../actions/data";

const COLORS = ["#AECBE6", "#A6DCC3", "#EE9CC4", "#F4A18C", "#E9D79A"];

export default async function Clientes() {
  const s = await requireSession();
  const rows = await sql`
    select c.*, (select count(*) from demands d where d.client_id = c.id and d.stage not in ('agendado','publicado'))::int as abertas
    from clients c where c.tenant_id = ${s.tenantId} order by c.name`;
  const brl = (c: number) => (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <>
      <div className="head"><h1>Clientes</h1><span className="muted">{rows.length} cadastrados</span></div>
      <form action={createClient} className="card inline-form">
        <label className="field" htmlFor="c-name">Nome do cliente<input id="c-name" name="name" required placeholder="Padaria Aurora" /></label>
        <label className="field" htmlFor="c-ig">Instagram<input id="c-ig" name="instagram" placeholder="@padariaaurora" /></label>
        <label className="field" htmlFor="c-fee">Mensalidade (R$)<input id="c-fee" name="fee" inputMode="decimal" placeholder="2.400,00" /></label>
        <label className="field" htmlFor="c-color">Cor<select id="c-color" name="color">{COLORS.map((c, i) => <option key={c} value={c}>{["Azul", "Menta", "Rosa", "Salmão", "Amarelo"][i]}</option>)}</select></label>
        <button className="btn btn-blue">Adicionar</button>
      </form>
      <div className="card scroll">
        {rows.length === 0 ? <p className="muted">Nenhum cliente ainda. Adicione o primeiro no formulário acima.</p> : (
          <table className="table">
            <thead><tr><th>Cliente</th><th>Instagram</th><th>Demandas abertas</th><th style={{ textAlign: "right" }}>Mensalidade</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td><span className="dot" style={{ background: c.color }} /><b className="display" style={{ fontWeight: 600 }}>{c.name}</b></td>
                <td className="muted">{c.instagram ?? "—"}</td>
                <td>{c.abertas}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{brl(c.monthly_fee_cents)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
