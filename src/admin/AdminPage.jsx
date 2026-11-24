import { useAuthCaptcha } from "../components/CheckoutCaptcha";
import { appPath } from "../lib/routes";
import { useState } from "react";
import {
  ClipboardList,
  Package,
  Tags,
  Settings,
  LogOut,
  Store,
} from "lucide-react";
import Brand from "../components/Brand";
import AuthPanel from "../components/AuthPanel";
import { supabase } from "../lib/supabase";
import AdminOrders, { AdminOrderDetail } from "./AdminOrders";
import AdminProducts from "./AdminProducts";
import ProductEditor from "./ProductEditor";
import AdminCategories from "./AdminCategories";
import AdminMfa, { verifiedStaffSession } from "./AdminMfa";
import { useStoreSettings } from "../lib/storeSettings";
import AdminSettings from "./AdminSettings";
import "./admin.css";

const TABS = [
  ["/pedidos", "Pedidos", ClipboardList],
  ["/produtos", "Produtos", Package],
  ["/categorias", "Categorias", Tags],
  ["/configuracoes", "Configurações", Settings],
];

function AdminLogin() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const captcha = useAuthCaptcha(true);
  const canProceed = () => {
    setError("");
    setMessage("");
    if (!captcha.required || captcha.token) return true;
    setError("Complete a verificação de segurança antes de continuar.");
    return false;
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!canProceed()) return;
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: { captchaToken: captcha.token || undefined },
      });
      if (failure) throw failure;
    } catch {
      setError(
        "Não foi possível entrar. Confira o e-mail, a senha e a verificação de segurança.",
      );
    } finally {
      if (captcha.required) captcha.reset();
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!canProceed()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Digite seu e-mail acima para receber o link.");
      return;
    }
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: new URL(appPath(), location.origin).href,
          captchaToken: captcha.token || undefined,
        },
      );
      if (failure) throw failure;
      setMessage(
        "Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha.",
      );
    } catch {
      setError("Não foi possível solicitar o e-mail agora.");
    } finally {
      if (captcha.required) captcha.reset();
      setBusy(false);
    }
  };
  return (
    <form className="admin-card admin-login" onSubmit={submit}>
      <h1>Painel Sanes</h1>
      <p>Entre com a conta autorizada da loja.</p>
      <label>
        E-mail
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {captcha.widget}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button className="btn primary full" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <button
        type="button"
        className="text-link full center"
        disabled={busy}
        onClick={reset}
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

function Gate({ children }) {
  return (
    <main className="admin-gate">
      <Brand />
      {children}
      <a className="text-link" href={appPath("#inicio")}>
        Voltar para a loja
      </a>
    </main>
  );
}

export default function AdminPage({
  route,
  session,
  authReady,
  staff,
  owner,
  staffChecked,
  recovery,
  onRecovered,
  onCatalogChange,
}) {
  const { mfaRequired, loading: settingsLoading } = useStoreSettings();
  if (!supabase)
    return (
      <Gate>
        <div className="admin-card">
          <h1>Painel indisponível</h1>
          <p>
            O painel precisa do Supabase configurado. Siga o guia em
            supabase/GUIA-ABNER.md.
          </p>
        </div>
      </Gate>
    );
  if (recovery)
    return (
      <Gate>
        <div className="admin-card">
          <AuthPanel recovery onRecovered={onRecovered} onClose={onRecovered} />
        </div>
      </Gate>
    );
  if (!authReady || (session && !staffChecked))
    return (
      <Gate>
        <p role="status">Carregando…</p>
      </Gate>
    );
  if (!session)
    return (
      <Gate>
        <AdminLogin />
      </Gate>
    );
  const signOut = () => supabase.auth.signOut();
  if (!staff)
    return (
      <Gate>
        <div className="admin-card">
          <h1>Acesso restrito</h1>
          <p>
            A conta {session.user.email} não tem acesso ao painel. Peça ao
            responsável técnico para liberar seu acesso.
          </p>
          <button className="btn outline full" onClick={signOut}>
            Sair
          </button>
        </div>
      </Gate>
    );

  if (settingsLoading)
    return (
      <Gate>
        <p role="status">Carregando configurações…</p>
      </Gate>
    );
  if (mfaRequired && !verifiedStaffSession(session))
    return (
      <Gate>
        <AdminMfa onSignOut={signOut} />
      </Gate>
    );

  const path = route.path === "/" ? "/pedidos" : route.path;
  const [, section, id] = path.split("/");
  let content;
  if (section === "pedidos")
    content = id ? <AdminOrderDetail id={id} /> : <AdminOrders />;
  else if (section === "produtos")
    content = id ? (
      <ProductEditor
        key={id}
        id={decodeURIComponent(id)}
        onSaved={onCatalogChange}
        owner={owner}
      />
    ) : (
      <AdminProducts onChange={onCatalogChange} />
    );
  else if (section === "categorias")
    content = <AdminCategories onChange={onCatalogChange} owner={owner} />;
  else if (section === "configuracoes")
    content = owner ? (
      <AdminSettings />
    ) : (
      <p role="alert">Somente o proprietário pode alterar as configurações.</p>
    );
  else
    content = (
      <div className="admin-card">
        <h1>Página não encontrada</h1>
        <a href={appPath("admin")}>Ir para os pedidos</a>
      </div>
    );

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header-top">
          <Brand />
          <span className="admin-tag">Painel</span>
          <div className="admin-header-actions">
            <a className="text-link" href={appPath("#inicio")}>
              <Store size={16} /> <span>Ver loja</span>
            </a>
            <button className="text-link" onClick={signOut}>
              <LogOut size={16} /> <span>Sair</span>
            </button>
          </div>
        </div>
        <nav className="admin-tabs" aria-label="Seções do painel">
          {TABS.filter(([href]) => owner || href !== "/configuracoes").map(
            ([href, label, Icon]) => (
              <a
                key={href}
                href={appPath(`admin${href}`)}
                aria-current={`/${section}` === href ? "page" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </a>
            ),
          )}
        </nav>
      </header>
      <main className="admin-main">{content}</main>
    </div>
  );
}
