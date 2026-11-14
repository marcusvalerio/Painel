"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions/auth";

export default function Entrar() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="logo"><i />pauta</span>
        <h1>Sua agência inteira numa pauta só.</h1>
        <span style={{ opacity: .8 }}>Demandas · Aprovação · Agendamento · Financeiro</span>
      </aside>
      <main className="auth-main">
        <form action={action} className="auth-form">
          <h2 style={{ fontSize: 28 }}>Entrar</h2>
          {state?.error && <div className="error">{state.error}</div>}
          <label className="field" htmlFor="email">E-mail<input id="email" name="email" type="email" required autoComplete="email" /></label>
          <label className="field" htmlFor="password">Senha<input id="password" name="password" type="password" required autoComplete="current-password" /></label>
          <button className="btn btn-blue" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
          <p className="muted" style={{ fontSize: 14 }}>Ainda não é assinante? <Link href="/assinar">Escolha um plano</Link></p>
        </form>
      </main>
    </div>
  );
}
