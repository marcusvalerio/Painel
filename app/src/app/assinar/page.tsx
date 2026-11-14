"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions/auth";

const PLANS = [
  { id: "solo", name: "Solo", price: "R$ 97" },
  { id: "agencia", name: "Agência", price: "R$ 197" },
  { id: "estudio", name: "Estúdio", price: "R$ 397" },
];

export default function Assinar() {
  const [state, action, pending] = useActionState(signup, undefined);
  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="logo"><i />pauta</span>
        <h1>Assine e comece hoje.</h1>
        <span style={{ opacity: .8 }}>Planos em fase de teste. Quem assina agora mantém o preço.</span>
      </aside>
      <main className="auth-main">
        <form action={action} className="auth-form">
          <h2 style={{ fontSize: 28 }}>Criar minha agência</h2>
          {state?.error && <div className="error">{state.error}</div>}
          <div className="plans-pick">
            {PLANS.map((p) => (
              <label key={p.id}>
                <input type="radio" name="plan" value={p.id} defaultChecked={p.id === "agencia"} />
                <b>{p.name}</b><span className="muted">{p.price}/mês</span><span className="pill" style={{ background: "var(--butter)", justifySelf: "start" }}>Em teste</span>
              </label>
            ))}
          </div>
          <label className="field" htmlFor="name">Seu nome<input id="name" name="name" required autoComplete="name" /></label>
          <label className="field" htmlFor="agency">Nome da agência<input id="agency" name="agency" required /></label>
          <label className="field" htmlFor="email">E-mail<input id="email" name="email" type="email" required autoComplete="email" /></label>
          <label className="field" htmlFor="password">Senha (mín. 8 caracteres)<input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
          <button className="btn btn-blue" disabled={pending}>{pending ? "Criando…" : "Assinar e criar agência"}</button>
          <p className="muted" style={{ fontSize: 14 }}>Já tem conta? <Link href="/entrar">Entrar</Link></p>
        </form>
      </main>
    </div>
  );
}
