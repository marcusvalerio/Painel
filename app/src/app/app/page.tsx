import Link from "next/link";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { brl } from "@/lib/format";

const STAGES = [
  { id: "ideias", label: "Ideias", color: "#E9D79A" },
  { id: "producao", label: "Em produção", color: "#EE9CC4" },
  { id: "aprovacao", label: "Aprovação", color: "#F4A18C" },
  { id: "agendado", label: "Agendado", color: "#AECBE6" },
  { id: "publicado", label: "Publicado", color: "#A6DCC3" },
];
const LEADS = [
  { id: "novo", label: "Novos" }, { id: "briefing", label: "Briefing" }, { id: "proposta", label: "Proposta" }, { id: "fechado", label: "Fechados" },
];
const FORMAT_COLOR: Record<string, string> = { post: "#E9D79A", carrossel: "#EE9CC4", reels: "#F4A18C", stories: "#AECBE6", video: "#A6DCC3" };
const FORMAT_LABEL: Record<string, string> = { post: "Post", carrossel: "Carrossel", reels: "Reels", stories: "Stories", video: "Vídeo" };
const TZ = "America/Sao_Paulo";
const short = (c: number) => (c >= 100000_00 ? `${(c / 100000_00).toFixed(1).replace(".", ",")} mi` : c >= 1000_00 ? `${Math.round(c / 1000_00)} mil` : String(Math.round(c / 100)));

export default async function Inicio() {
  const s = await requireSession();
  const t = s.tenantId;
  const [[k], stages, formats, money, leads, aprov, proximos, atrasadas, topClients, contratos, semana] = await Promise.all([
    sql`select
      (select count(*) from clients where tenant_id=${t} and status='ativo')::int as clientes,
      (select coalesce(sum(monthly_fee_cents),0) from clients where tenant_id=${t} and status='ativo')::bigint as mrr,
      (select count(*) from demands where tenant_id=${t} and stage not in ('agendado','publicado'))::int as abertas,
      (select count(*) from demands where tenant_id=${t} and stage='aprovacao')::int as aprovacao,
      (select count(*) from demands where tenant_id=${t} and due_date < current_date and stage not in ('agendado','publicado'))::int as atrasadas,
      (select count(*) from demands where tenant_id=${t} and scheduled_at >= now() and scheduled_at < now() + interval '7 days')::int as semana,
      (select count(*) from demands where tenant_id=${t} and approval_status='aprovado' and created_at >= date_trunc('month', now()))::int as aprovadas_mes,
      (select count(*) from demands where tenant_id=${t} and approval_status='ajuste')::int as ajustes,
      (select coalesce(sum(amount_cents),0) from transactions where tenant_id=${t} and kind='entrada' and paid_on >= date_trunc('month', current_date))::bigint as recebido,
      (select coalesce(sum(amount_cents),0) from transactions where tenant_id=${t} and kind='entrada' and paid_on is null)::bigint as receber,
      (select coalesce(sum(amount_cents),0) from transactions where tenant_id=${t} and kind='entrada' and paid_on is null and due_on < current_date)::bigint as inadimplente,
      (select coalesce(sum(value_cents),0) from leads where tenant_id=${t} and stage not in ('fechado','perdido'))::bigint as pipeline`,
    sql`select stage, count(*)::int as n from demands where tenant_id=${t} group by stage`,
    sql`select format, count(*)::int as n from demands where tenant_id=${t} and created_at >= now() - interval '90 days' group by format order by n desc`,
    sql`select to_char(m, 'YYYY-MM') as mes,
          coalesce(sum(x.amount_cents) filter (where x.kind='entrada'),0)::bigint as entrada,
          coalesce(sum(x.amount_cents) filter (where x.kind='saida'),0)::bigint as saida
        from generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') m
        left join transactions x on x.tenant_id=${t} and x.paid_on >= m and x.paid_on < m + interval '1 month'
        group by m order by m`,
    sql`select stage, count(*)::int as n, coalesce(sum(value_cents),0)::bigint as v from leads where tenant_id=${t} group by stage`,
    sql`select d.id, d.title, d.format, d.approval_token, c.name as cliente, c.color from demands d left join clients c on c.id=d.client_id
        where d.tenant_id=${t} and d.stage='aprovacao' order by d.due_date nulls last limit 5`,
    sql`select d.id, d.title, d.format, d.scheduled_at, c.name as cliente from demands d left join clients c on c.id=d.client_id
        where d.tenant_id=${t} and d.scheduled_at >= now() order by d.scheduled_at limit 5`,
    sql`select d.id, d.title, d.due_date, c.name as cliente, (current_date - d.due_date)::int as dias from demands d left join clients c on c.id=d.client_id
        where d.tenant_id=${t} and d.due_date <= current_date + 3 and d.stage not in ('agendado','publicado') order by d.due_date limit 6`,
    sql`select c.id, c.name, c.color, c.monthly_fee_cents,
          (select count(*) from demands d where d.client_id=c.id and d.stage not in ('agendado','publicado'))::int as abertas,
          (select count(*) from demands d where d.client_id=c.id and d.created_at >= date_trunc('month', now()))::int as mes
        from clients c where c.tenant_id=${t} and c.status='ativo' order by c.monthly_fee_cents desc limit 6`,
    sql`select k.title, c.name as cliente, (k.ends_on - current_date)::int as dias from contracts k left join clients c on c.id=k.client_id
        where k.tenant_id=${t} and k.ends_on is not null and k.ends_on <= current_date + 45 order by k.ends_on limit 4`,
    sql`select (d::date) as dia, count(x.id)::int as n
        from generate_series(current_date, current_date + 6, interval '1 day') d
        left join demands x on x.tenant_id=${t} and (x.scheduled_at at time zone ${TZ})::date = d::date
        group by d order by d`,
  ]);

  const stageN = (id: string) => stages.find((x) => x.stage === id)?.n ?? 0;
  const totalStages = STAGES.reduce((a, st) => a + stageN(st.id), 0);
  const maxMoney = Math.max(1, ...money.map((m) => Math.max(Number(m.entrada), Number(m.saida))));
  const leadN = (id: string) => leads.find((x) => x.stage === id)?.n ?? 0;
  const maxLead = Math.max(1, ...LEADS.map((l) => leadN(l.id)));
  const totalFormats = formats.reduce((a, f) => a + f.n, 0);
  const maxWeek = Math.max(1, ...semana.map((d) => d.n));
  const maxFee = Math.max(1, ...topClients.map((c) => Number(c.monthly_fee_cents)));
  const now = new Date();
  const hour = Number(now.toLocaleString("pt-BR", { hour: "numeric", hour12: false, timeZone: TZ }));
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const mesLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
  const saude = k.mrr > 0 ? Math.round((Number(k.recebido) / Number(k.mrr)) * 100) : 0;

  // gráfico financeiro (SVG em escala)
  const W = 560, H = 180, P = { l: 44, r: 8, t: 10, b: 26 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b, gw = iw / money.length, bw = Math.min(18, gw / 3);
  const y = (v: number) => P.t + ih - (v / maxMoney) * ih;
  const ticks = [0, 0.5, 1].map((f) => f * maxMoney);

  return (
    <div className="dash">
      <header className="dash-hero">
        <div>
          <span className="eyebrow" style={{ color: "rgba(255,255,255,.7)" }}>{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}</span>
          <h1>{greet}, {s.userName.split(" ")[0]}.</h1>
          <p>{k.atrasadas > 0 ? `${k.atrasadas} ${k.atrasadas === 1 ? "demanda atrasada" : "demandas atrasadas"} e ${k.aprovacao} aguardando o cliente.` : k.aprovacao > 0 ? `${k.aprovacao} ${k.aprovacao === 1 ? "peça aguardando" : "peças aguardando"} aprovação do cliente.` : "Nada atrasado. Bom ritmo."}</p>
        </div>
        <div className="quick">
          <Link href="/app/demandas" className="btn btn-paper">+ Demanda</Link>
          <Link href="/app/clientes" className="btn btn-glass">+ Cliente</Link>
          <Link href="/app/agendamento" className="btn btn-glass">Agendar post</Link>
          <Link href="/app/financeiro" className="btn btn-glass">Lançar</Link>
        </div>
      </header>

      <section className="kpi-row">
        <Kpi label="Receita recorrente" value={brl(k.mrr)} hint={`${k.clientes} ${k.clientes === 1 ? "cliente ativo" : "clientes ativos"}`} />
        <Kpi label="Recebido no mês" value={brl(k.recebido)} hint={k.mrr > 0 ? `${saude}% da recorrente` : "sem mensalidades"} bar={Math.min(100, saude)} />
        <Kpi label="A receber" value={brl(k.receber)} hint={Number(k.inadimplente) > 0 ? `${brl(k.inadimplente)} em atraso` : "nada em atraso"} tone={Number(k.inadimplente) > 0 ? "bad" : undefined} />
        <Kpi label="Demandas abertas" value={String(k.abertas)} hint={`${k.atrasadas} atrasadas`} tone={k.atrasadas > 0 ? "bad" : undefined} />
        <Kpi label="Aguardando cliente" value={String(k.aprovacao)} hint={`${k.ajustes} pediram ajuste`} />
        <Kpi label="Posts em 7 dias" value={String(k.semana)} hint={`${k.aprovadas_mes} aprovados no mês`} />
      </section>

      <section className="grid-2">
        <div className="card panel">
          <PanelHead title="Produção" link="/app/demandas" linkLabel="Abrir quadro" />
          <div className="stack" aria-label="Demandas por etapa">
            {totalStages === 0 ? <div className="stack-empty" /> : STAGES.map((st) => stageN(st.id) > 0 && (
              <i key={st.id} style={{ flex: stageN(st.id), background: st.color }} title={`${st.label}: ${stageN(st.id)}`} />
            ))}
          </div>
          <div className="legend">
            {STAGES.map((st) => (
              <div key={st.id}><span className="dot" style={{ background: st.color }} />{st.label}<b>{stageN(st.id)}</b></div>
            ))}
          </div>
          <div className="sub-head">Formatos nos últimos 90 dias</div>
          {totalFormats === 0 ? <p className="muted small">Sem demandas ainda.</p> : (
            <div className="hbars">{formats.map((f) => (
              <div key={f.format} className="hbar"><span>{FORMAT_LABEL[f.format] ?? f.format}</span>
                <div><i style={{ width: `${(f.n / totalFormats) * 100}%`, background: FORMAT_COLOR[f.format] }} /></div><b>{f.n}</b></div>
            ))}</div>
          )}
        </div>

        <div className="card panel">
          <PanelHead title="Próximos 7 dias" link="/app/agendamento" linkLabel="Calendário" />
          <div className="week">
            {semana.map((d) => {
              const dt = new Date(d.dia);
              return (
                <div key={String(d.dia)} className="wday">
                  <div className="wbar"><i style={{ height: `${(d.n / maxWeek) * 100}%` }} /></div>
                  <b>{d.n}</b>
                  <span>{dt.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "")}</span>
                </div>
              );
            })}
          </div>
          <div className="sub-head">Próximos posts</div>
          {proximos.length === 0 ? <p className="muted small">Nenhum post agendado. <Link href="/app/agendamento">Agendar agora</Link></p> : (
            <ul className="items">{proximos.map((p) => (
              <li key={p.id}><span className="pill" style={{ background: FORMAT_COLOR[p.format] }}>{FORMAT_LABEL[p.format]}</span>
                <div><b>{p.title}</b><small>{p.cliente ?? "Sem cliente"}</small></div>
                <time>{new Date(p.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ })}</time></li>
            ))}</ul>
          )}
        </div>
      </section>

      <section className="grid-3">
        <div className="card panel">
          <PanelHead title="Aguardando aprovação" link="/app/demandas" linkLabel="Ver todas" />
          {aprov.length === 0 ? <p className="muted small">Nenhuma peça com o cliente agora.</p> : (
            <ul className="items">{aprov.map((d) => (
              <li key={d.id}><span className="dot" style={{ background: d.color ?? "#AECBE6" }} />
                <div><b>{d.title}</b><small>{d.cliente ?? "Sem cliente"} · {FORMAT_LABEL[d.format]}</small></div>
                <Link href={`/aprovar/${d.approval_token}`} target="_blank" className="mini">Link ↗</Link></li>
            ))}</ul>
          )}
        </div>
        <div className="card panel">
          <PanelHead title="Prazos" link="/app/demandas" linkLabel="Quadro" />
          {atrasadas.length === 0 ? <p className="muted small">Nenhum prazo nos próximos 3 dias.</p> : (
            <ul className="items">{atrasadas.map((d) => (
              <li key={d.id}><span className="pill" style={{ background: d.dias > 0 ? "#F4A18C" : d.dias === 0 ? "#E9D79A" : "#AECBE6" }}>{d.dias > 0 ? `${d.dias}d atraso` : d.dias === 0 ? "Hoje" : `em ${-d.dias}d`}</span>
                <div><b>{d.title}</b><small>{d.cliente ?? "Sem cliente"}</small></div></li>
            ))}</ul>
          )}
        </div>
        <div className="card panel">
          <PanelHead title="Comercial" link="/app/comercial" linkLabel="Funil" />
          <div className="big-num">{brl(k.pipeline)}<small>em negociação</small></div>
          <div className="funnel">{LEADS.map((l) => (
            <div key={l.id}><span>{l.label}</span><div><i style={{ width: `${(leadN(l.id) / maxLead) * 100}%` }} /></div><b>{leadN(l.id)}</b></div>
          ))}</div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card panel">
          <PanelHead title="Fluxo de caixa · 6 meses" link="/app/financeiro" linkLabel="Financeiro" />
          <div className="legend inline"><div><span className="dot" style={{ background: "var(--blue)" }} />Entradas</div><div><span className="dot" style={{ background: "var(--salmon)" }} />Saídas</div></div>
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Entradas e saídas dos últimos 6 meses">
            {ticks.map((v, i) => (
              <g key={i}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity=".1" />
                <text x={P.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity=".55">{short(v)}</text></g>
            ))}
            {money.map((m, i) => {
              const cx = P.l + gw * i + gw / 2;
              return (
                <g key={m.mes}>
                  <rect x={cx - bw - 1} y={y(Number(m.entrada))} width={bw} height={P.t + ih - y(Number(m.entrada))} rx="3" fill="var(--blue)" />
                  <rect x={cx + 1} y={y(Number(m.saida))} width={bw} height={P.t + ih - y(Number(m.saida))} rx="3" fill="var(--salmon)" />
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity=".6">{mesLabel(m.mes)}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="card panel">
          <PanelHead title="Clientes" link="/app/clientes" linkLabel="Todos" />
          {topClients.length === 0 ? <p className="muted small">Cadastre seus clientes para ver a carteira aqui. <Link href="/app/clientes">Adicionar cliente</Link></p> : (
            <ul className="clients">{topClients.map((c) => (
              <li key={c.id}>
                <span className="avatar" style={{ background: c.color }}>{c.name.slice(0, 1)}</span>
                <div className="cmain"><b>{c.name}</b>
                  <div className="cbar"><i style={{ width: `${(Number(c.monthly_fee_cents) / maxFee) * 100}%` }} /></div></div>
                <div className="cnum"><b>{brl(c.monthly_fee_cents)}</b><small>{c.abertas} abertas · {c.mes} no mês</small></div>
              </li>
            ))}</ul>
          )}
          {contratos.length > 0 && (
            <>
              <div className="sub-head">Contratos vencendo</div>
              <ul className="items">{contratos.map((c, i) => (
                <li key={i}><span className="pill" style={{ background: c.dias < 0 ? "#F4A18C" : "#E9D79A" }}>{c.dias < 0 ? "Vencido" : `${c.dias} dias`}</span>
                  <div><b>{c.title}</b><small>{c.cliente ?? ""}</small></div></li>
              ))}</ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint, tone, bar }: { label: string; value: string; hint: string; tone?: "bad"; bar?: number }) {
  return (
    <div className="card kpi2">
      <span className="eyebrow">{label}</span>
      <b>{value}</b>
      {bar != null && <div className="prog"><i style={{ width: `${bar}%` }} /></div>}
      <small className={tone === "bad" ? "bad" : undefined}>{hint}</small>
    </div>
  );
}

function PanelHead({ title, link, linkLabel }: { title: string; link: string; linkLabel: string }) {
  return (
    <div className="panel-head"><h2>{title}</h2><Link href={link}>{linkLabel} →</Link></div>
  );
}
