import Link from "next/link";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { createDemand, moveDemand } from "../../actions/data";

const STAGES = [
  { id: "ideias", label: "Ideias" },
  { id: "producao", label: "Em produção" },
  { id: "aprovacao", label: "Aprovação cliente" },
  { id: "agendado", label: "Agendado" },
  { id: "publicado", label: "Publicado" },
];
const FORMAT_COLOR: Record<string, string> = { post: "#E9D79A", carrossel: "#EE9CC4", reels: "#F4A18C", stories: "#AECBE6", video: "#A6DCC3" };
const FORMAT_LABEL: Record<string, string> = { post: "Post", carrossel: "Carrossel", reels: "Reels", stories: "Stories", video: "Vídeo" };
const APPROVAL: Record<string, [string, string]> = { aguardando: ["Aguardando", "#E9D79A"], aprovado: ["Aprovado", "#A6DCC3"], ajuste: ["Pediu ajuste", "#F4A18C"] };

export default async function Demandas() {
  const s = await requireSession();
  const [clients, demands] = await Promise.all([
    sql`select id, name from clients where tenant_id = ${s.tenantId} order by name`,
    sql`select d.*, c.name as cliente, u.name as resp from demands d
        left join clients c on c.id = d.client_id left join users u on u.id = d.assignee_id
        where d.tenant_id = ${s.tenantId} order by d.due_date nulls last, d.created_at`,
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="head"><h1>Demandas</h1><span className="muted">{demands.length} no quadro</span></div>
      <form action={createDemand} className="card inline-form">
        <label className="field" htmlFor="d-title">Título<input id="d-title" name="title" required placeholder="Carrossel cardápio de verão" /></label>
        <label className="field" htmlFor="d-client">Cliente<select id="d-client" name="client_id"><option value="">Sem cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field" htmlFor="d-format">Formato<select id="d-format" name="format">{Object.entries(FORMAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field" htmlFor="d-due">Prazo<input id="d-due" name="due_date" type="date" /></label>
        <button className="btn btn-blue">Nova demanda</button>
      </form>
      <div className="kanban">
        {STAGES.map((st, si) => {
          const items = demands.filter((d) => d.stage === st.id);
          return (
            <section key={st.id} className="col">
              <h3>{st.label} <span>{items.length}</span></h3>
              {items.map((d) => {
                const late = d.due_date && d.due_date.toISOString?.().slice(0, 10) < today && !["agendado", "publicado"].includes(d.stage);
                const ap = d.approval_status ? APPROVAL[d.approval_status] : null;
                return (
                  <article key={d.id} className="dcard">
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span className="pill" style={{ background: FORMAT_COLOR[d.format] }}>{FORMAT_LABEL[d.format]}</span>
                      {late && <span className="pill" style={{ background: "#F4A18C" }}>Atrasado</span>}
                      {ap && <span className="pill" style={{ background: ap[1] }}>{ap[0]}</span>}
                    </div>
                    <b>{d.title}</b>
                    <div className="prog"><i style={{ width: `${d.progress}%` }} /></div>
                    <div className="meta"><span>{d.cliente ?? "Sem cliente"}</span>
                      <span>{d.due_date ? new Date(d.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" }) : ""}</span></div>
                    {d.stage === "aprovacao" && (
                      <Link href={`/aprovar/${d.approval_token}`} target="_blank" style={{ fontSize: 12, color: "var(--blue)" }}>Link de aprovação do cliente ↗</Link>
                    )}
                    <div className="moves">
                      {si > 0 && <form action={moveDemand.bind(null, d.id, STAGES[si - 1].id)}><button>← {STAGES[si - 1].label}</button></form>}
                      {si < STAGES.length - 1 && <form action={moveDemand.bind(null, d.id, STAGES[si + 1].id)}><button>{STAGES[si + 1].label} →</button></form>}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
