"use client";
import { useActionState } from "react";
import { changePassword } from "../../actions/account";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      {state?.error && <div className="error">{state.error}</div>}
      {state?.ok && <div className="banner" style={{ background: "var(--mint)" }}>{state.ok}</div>}
      <label className="field" htmlFor="pw-cur">Senha atual<input id="pw-cur" name="current" type="password" required autoComplete="current-password" /></label>
      <label className="field" htmlFor="pw-new">Nova senha (mín. 8 caracteres)<input id="pw-new" name="next" type="password" minLength={8} required autoComplete="new-password" /></label>
      <label className="field" htmlFor="pw-conf">Confirmar nova senha<input id="pw-conf" name="confirm" type="password" minLength={8} required autoComplete="new-password" /></label>
      <button className="btn btn-blue" disabled={pending}>{pending ? "Salvando…" : "Salvar nova senha"}</button>
    </form>
  );
}
