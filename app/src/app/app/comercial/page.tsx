import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { brl } from "@/lib/format";
import { createLead, moveLead } from "../../actions/data";

const STAGES = [
  { id: "novo", label: "Novo lead" }, { id: "briefing", label: "Briefing" }, { id: "proposta", label: "Proposta enviada" },
  { id: "fechado", label: "Fechado" }, { id: "perdido", label: "Perdido" },
];

export default async function Comercial() {
  const s = await requireSession();
  const leads = await sql`select * from leads where tenant_id = ${s.tenantId} order by created_at desc`;
  const aberto = leads.filter((l) => !["fechado", "perdido"].includes(l.stage)).reduce((a, l) => a + Number(l.value_cents), 0);
  return (
    <>
      <div className="head"><h1>Comercial</h1><span className="muted">{brl(aberto)} em negociação</span></div>
      <form action={createLead} className="card inline-form">
        <label className="field" htmlFor="l-name">Lead / empresa<input id="l-name" name="name" required placeholder="Clínica Bem Estar" /></label>
        <label className="field" htmlFor="l-contact">Contato<input id="l-contact" name="contact" placeholder="WhatsApp ou e-mail" /></label>
        <label className="field" htmlFor="l-source">Origem<select id="l-source" name="source"><option>Instagram</option><option>Indicação</option><option>Site</option><option>Outro</option></select></label>
        <label className="field" htmlFor="l-value">Valor estimado<input id="l-value" name="value" inputMode="decimal" placeholder="1.800,00" /></label>
        <button className="btn btn-blue">Adicionar</button>
      </form>
      <div className="kanban">
        {STAGES.map((st, si) => {
          const items = leads.filter((l) => l.stage === st.id);
          return (
            <section key={st.id} className="col">
              <h3>{st.label} <span>{items.length}</span></h3>
              {items.map((l) => (
                <article key={l.id} className="dcard">
                  <b>{l.name}</b>
                  <div className="meta"><span>{l.source ?? ""}</span><span>{brl(l.value_cents)}</span></div>
                  {l.contact && <span className="muted" style={{ fontSize: 12 }}>{l.contact}</span>}
                  <div className="moves">
                    {si > 0 && <form action={moveLead.bind(null, l.id, STAGES[si - 1].id)}><button>← {STAGES[si - 1].label}</button></form>}
                    {si < STAGES.length - 1 && <form action={moveLead.bind(null, l.id, STAGES[si + 1].id)}><button>{STAGES[si + 1].label} →</button></form>}
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
