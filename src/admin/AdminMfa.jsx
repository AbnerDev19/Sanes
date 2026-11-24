import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function verifiedStaffSession(session) {
  try {
    const payload = session.access_token.split(".")[1];
    return (
      JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).aal ===
      "aal2"
    );
  } catch {
    return false;
  }
}

export default function AdminMfa({ onSignOut }) {
  const [factor, setFactor] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data, error: failure }) => {
      if (!active) return;
      if (failure)
        setError(
          "Não foi possível consultar a autenticação em duas etapas. Recarregue a página.",
        );
      else setFactor(data.totp[0]?.id || null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const enroll = async () => {
    setBusy(true);
    setError("");
    try {
      const { data, error: failure } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (failure) throw failure;
      setEnrollment(data.totp);
      setFactor(data.id);
    } catch {
      setError(
        "Não foi possível cadastrar o autenticador. Confirme a configuração de MFA com o responsável pela loja.",
      );
    } finally {
      setBusy(false);
    }
  };
  const verify = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor,
        code,
      });
      if (failure) throw failure;
    } catch {
      setError(
        "Código inválido ou expirado. Tente um código atual do aplicativo.",
      );
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-card">
      <h1>Autenticação em duas etapas</h1>
      {loading ? (
        <p role="status">Consultando seu autenticador…</p>
      ) : factor ? (
        <form onSubmit={verify}>
          {enrollment && (
            <>
              <p>
                Escaneie o QR code com seu aplicativo autenticador ou digite a
                chave de configuração.
              </p>
              <img
                width="200"
                height="200"
                src={enrollment.qr_code}
                alt="QR code para cadastrar o autenticador"
              />
              <p>
                <code>{enrollment.secret}</code>
              </p>
            </>
          )}
          <label>
            Código de seis dígitos
            <input
              value={code}
              required
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              inputMode="numeric"
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <button className="btn primary full" disabled={busy}>
            Verificar código
          </button>
        </form>
      ) : (
        <button
          className="btn primary full"
          disabled={busy || Boolean(error)}
          onClick={enroll}
        >
          Cadastrar aplicativo autenticador
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="text-link" type="button" onClick={onSignOut}>
        Sair
      </button>
    </section>
  );
}
