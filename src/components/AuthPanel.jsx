import { useState } from "react";
import { supabase, siteUrl } from "../lib/supabase";
export default function AuthPanel({ onClose, recovery = false, onRecovered }) {
  const [mode, setMode] = useState(recovery ? "recover" : "login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const titles = {
    login: "Entre na sua conta",
    signup: "Crie sua conta",
    reset: "Recuperar acesso",
    recover: "Escolha uma nova senha",
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!supabase) {
      setError(
        "A área do cliente ainda não está disponível. Você pode continuar explorando o catálogo.",
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error)
          throw new Error(
            "Não foi possível entrar. Verifique seu e-mail, senha e a confirmação da conta.",
          );
        onClose?.();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: siteUrl() },
        });
        if (error)
          throw new Error(
            "Não foi possível criar a conta. Verifique os dados ou tente recuperar seu acesso.",
          );
        if (data.session) onClose?.();
        else {
          setMessage(
            "Confira seu e-mail e confirme o cadastro para entrar. Se já tiver uma conta, use Entrar ou recupere o acesso.",
          );
          setPassword("");
        }
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: siteUrl() },
        );
        if (error)
          throw new Error(
            "Não foi possível solicitar a recuperação. Tente novamente mais tarde.",
          );
        setMessage(
          "Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.",
        );
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error)
          throw new Error(
            "Não foi possível atualizar a senha. Abra um novo link de recuperação e tente novamente.",
          );
        onRecovered?.();
        onClose?.();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-panel" aria-label="Acesso à conta">
      <div className="eyebrow">SUA CONTA SANES</div>
      <h2 id="dialog-title">{titles[mode]}</h2>
      <p>Salve seus pedidos e continue o atendimento com a loja.</p>
      {!supabase ? (
        <div className="notice">
          A área do cliente ainda não está disponível. O catálogo continua
          aberto para consulta.
        </div>
      ) : (
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Seu nome
              <input
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          {mode !== "recover" && (
            <label>
              E-mail da conta
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={150}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Senha
              <input
                id="account-password"
                aria-describedby={
                  mode !== "login" ? "password-hint" : undefined
                }
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? 1 : 8}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {mode !== "reset" && mode !== "login" && (
            <small id="password-hint" className="field-help">
              Use pelo menos 8 caracteres.
            </small>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          <button className="btn primary full" disabled={busy} type="submit">
            {busy
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : mode === "signup"
                  ? "Criar conta"
                  : mode === "reset"
                    ? "Enviar instruções"
                    : "Salvar nova senha"}
          </button>
        </form>
      )}
      {mode !== "recover" && (
        <div className="auth-switch">
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
              setMessage("");
            }}
          >
            {mode === "signup" ? "Já tenho conta" : "Criar uma conta"}
          </button>
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => {
              setMode(mode === "reset" ? "login" : "reset");
              setError("");
              setMessage("");
            }}
          >
            {mode === "reset" ? "Voltar para entrar" : "Esqueci a senha"}
          </button>
        </div>
      )}
    </section>
  );
}
