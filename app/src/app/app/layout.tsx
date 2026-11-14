import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { logout } from "../actions/auth";
import { Nav } from "./nav";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/app" className="logo"><i />pauta</Link>
        <div className="tenant">{s.tenantName}</div>
        <Nav />
        <div className="foot">
          <span>{s.userName}</span>
          <form action={logout}><button style={{ width: "100%" }}>Sair</button></form>
        </div>
      </aside>
      <nav className="mobilebar">
        <Link href="/app">Início</Link><Link href="/app/demandas">Demandas</Link><Link href="/app/clientes">Clientes</Link>
      </nav>
      <main className="main">
        {s.subscriptionStatus !== "ativa" && (
          <div className="banner">Plano em fase de teste. A cobrança será ativada no lançamento oficial e você mantém o preço de hoje.</div>
        )}
        {children}
      </main>
    </div>
  );
}
