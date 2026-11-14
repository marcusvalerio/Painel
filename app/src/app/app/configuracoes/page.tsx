import { requireSession } from "@/lib/auth";
import { updateProfile } from "../../actions/account";
import { PasswordForm } from "./password-form";

export default async function Configuracoes() {
  const s = await requireSession();
  return (
    <>
      <div className="head"><h1>Configurações</h1></div>
      {s.mustChangePassword && <div className="banner" style={{ background: "var(--salmon)" }}>Você está usando uma senha provisória. Crie uma senha nova para continuar.</div>}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ fontSize: 20 }}>Trocar senha</h2>
          <PasswordForm />
        </section>
        <form action={updateProfile} className="card" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ fontSize: 20 }}>Perfil e agência</h2>
          <label className="field" htmlFor="p-name">Seu nome<input id="p-name" name="name" defaultValue={s.userName} /></label>
          <label className="field" htmlFor="p-email">E-mail<input id="p-email" value={s.email} disabled /></label>
          <label className="field" htmlFor="p-agency">Nome da agência<input id="p-agency" name="agency" defaultValue={s.tenantName} disabled={!["dono", "admin"].includes(s.role)} /></label>
          <button className="btn btn-soft">Salvar</button>
        </form>
      </div>
    </>
  );
}
