"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; soon?: boolean };
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ href: "/app", label: "Início" }, { href: "/app/meu-dia", label: "Meu Dia", soon: true }, { href: "/app/agenda", label: "Agenda", soon: true }] },
  { title: "Produção", items: [{ href: "/app/demandas", label: "Demandas" }, { href: "/app/aprovacao", label: "Aprovação", soon: true }, { href: "/app/agendamento", label: "Agendamento", soon: true }, { href: "/app/automacoes", label: "Automação de DMs", soon: true }, { href: "/app/metricas", label: "Métricas", soon: true }] },
  { title: "Negócio", items: [{ href: "/app/clientes", label: "Clientes" }, { href: "/app/comercial", label: "Comercial", soon: true }, { href: "/app/contratos", label: "Contratos", soon: true }, { href: "/app/financeiro", label: "Financeiro", soon: true }] },
];

export function Nav() {
  const path = usePathname();
  return (
    <>
      {GROUPS.map((g, i) => (
        <div key={i} style={{ display: "grid", gap: 2 }}>
          {g.title && <div className="grp">{g.title}</div>}
          {g.items.map((it) => (
            <Link key={it.href} href={it.soon ? "#" : it.href} aria-disabled={it.soon}
              className={`nav${path === it.href ? " on" : ""}`} style={it.soon ? { opacity: .45, cursor: "default" } : undefined}>
              {it.label}{it.soon && <small>em breve</small>}
            </Link>
          ))}
        </div>
      ))}
    </>
  );
}
