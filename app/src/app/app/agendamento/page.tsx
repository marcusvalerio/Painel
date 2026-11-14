import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { scheduleDemand } from "../../actions/data";

const FORMAT_COLOR: Record<string, string> = { post: "#E9D79A", carrossel: "#EE9CC4", reels: "#F4A18C", stories: "#AECBE6", video: "#A6DCC3" };

export default async function Agendamento({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const s = await requireSession();
  const { m } = await searchParams;
  const base = m && /^\d{4}-\d{2}$/.test(m) ? new Date(`${m}-01T12:00:00Z`) : new Date();
  const y = base.getUTCFullYear(), mo = base.getUTCMonth();
  const first = new Date(Date.UTC(y, mo, 1)), next = new Date(Date.UTC(y, mo + 1, 1));
  const [posts, pending] = await Promise.all([
    sql`select d.id, d.title, d.format, d.scheduled_at, c.name as cliente, c.color from demands d left join clients c on c.id = d.client_id
        where d.tenant_id = ${s.tenantId} and d.scheduled_at >= ${first} and d.scheduled_at < ${next} order by d.scheduled_at`,
    sql`select d.id, d.title, c.name as cliente from demands d left join clients c on c.id = d.client_id
        where d.tenant_id = ${s.tenantId} and d.scheduled_at is null and d.stage <> 'publicado' order by d.created_at desc limit 50`,
  ]);
  const days = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // semana começa na segunda
  const fmt = (d: Date) => d.toISOString().slice(0, 7);
  const label = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const byDay: Record<number, typeof posts> = {};
  for (const p of posts) {
    const day = Number(new Date(p.scheduled_at).toLocaleDateString("pt-BR", { day: "numeric", timeZone: "America/Sao_Paulo" }));
    (byDay[day] ??= []).push(p);
  }
  return (
    <>
      <div className="head">
        <h1 style={{ textTransform: "capitalize" }}>{label}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn btn-ghost" href={`?m=${fmt(new Date(Date.UTC(y, mo - 1, 1)))}`}>← Anterior</a>
          <a className="btn btn-ghost" href={`?m=${fmt(next)}`}>Próximo →</a>
        </div>
      </div>
      <div className="banner" style={{ background: "var(--sky)" }}>A publicação automática no Instagram e Facebook será ativada quando a integração com a Meta for aprovada. Por enquanto o calendário serve para planejar.</div>
      <form action={scheduleDemand} className="card inline-form" style={{ gridTemplateColumns: "2fr 1fr 2fr auto" }}>
        <label className="field" htmlFor="s-id">Demanda<select id="s-id" name="id" required>{pending.map((d) => <option key={d.id} value={d.id}>{d.title}{d.cliente ? ` · ${d.cliente}` : ""}</option>)}</select></label>
        <label className="field" htmlFor="s-when">Data e hora<input id="s-when" name="scheduled_at" type="datetime-local" required /></label>
        <label className="field" htmlFor="s-cap">Legenda<input id="s-cap" name="caption" placeholder="Opcional" /></label>
        <button className="btn btn-blue">Agendar</button>
      </form>
      <div className="scroll"><div className="calendar">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="cal-h">{d}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }).map((_, i) => (
          <div key={i} className="cal-d">
            <span className="cal-n">{i + 1}</span>
            {(byDay[i + 1] ?? []).map((p) => (
              <div key={p.id} className="cal-p" style={{ background: FORMAT_COLOR[p.format] }} title={p.cliente ?? ""}>
                {new Date(p.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })} {p.title}
              </div>
            ))}
          </div>
        ))}
      </div></div>
    </>
  );
}
