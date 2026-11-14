import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { clientReview } from "../../actions/data";

export default async function Aprovar({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [d] = await sql`
    select d.id, d.title, d.format, d.caption, d.description, d.approval_status, c.name as cliente, t.name as agencia
    from demands d join tenants t on t.id = d.tenant_id left join clients c on c.id = d.client_id
    where d.approval_token = ${token}`;
  if (!d) notFound();
  const comments = await sql`select author_name, body, is_client, created_at from demand_comments where demand_id = ${d.id} order by created_at`;
  const action = clientReview.bind(null, token);
  const status = d.approval_status === "aprovado" ? "Você aprovou esta peça." : d.approval_status === "ajuste" ? "Você pediu ajustes. A agência foi avisada." : null;
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 16px", display: "grid", gap: 18 }}>
      <span className="eyebrow">{d.agencia} · aprovação</span>
      <h1 style={{ fontSize: 36 }}>{d.title}</h1>
      <p className="muted">{d.cliente ?? ""}</p>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ aspectRatio: "4/5", maxWidth: "100%", borderRadius: 12, background: "linear-gradient(160deg,#AECBE6,#EE9CC4 60%,#E9D79A)" }} />
        {d.caption && <p>{d.caption}</p>}
        {d.description && <p className="muted">{d.description}</p>}
      </div>
      {comments.map((c, i) => (
        <div key={i} className="card" style={{ padding: 14 }}><b>{c.author_name}:</b> {c.body}</div>
      ))}
      {status ? <div className="banner">{status}</div> : (
        <form action={action} className="card" style={{ display: "grid", gap: 12 }}>
          <label className="field" htmlFor="author">Seu nome<input id="author" name="author" /></label>
          <label className="field" htmlFor="comment">Comentário (opcional)<textarea id="comment" name="comment" rows={3} /></label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" style={{ background: "#A6DCC3", color: "#0F1E36", flex: 1 }} name="decision" value="aprovar">Aprovar</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} name="decision" value="ajuste">Pedir ajuste</button>
          </div>
        </form>
      )}
    </main>
  );
}
