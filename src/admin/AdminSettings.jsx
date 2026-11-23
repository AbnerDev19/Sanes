import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { fetchSettings, saveWhatsapp } from "./api";
import { formatWhatsapp, normalizeWhatsapp, whatsappLink } from "../config";
import { formatBrazilianPhone } from "../lib/checkout";

export default function AdminSettings() {
  const [current, setCurrent] = useState(""),
    [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setCurrent(s?.whatsapp || "");
        setValue(formatBrazilianPhone(s?.whatsapp || ""));
      })
      .catch((err) => setError(err.message));
  }, []);
  const normalized = normalizeWhatsapp(value);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!normalized) {
      setError("Informe um celular com DDD, por exemplo (61) 98133-3737.");
      return;
    }
    setBusy(true);
    try {
      await saveWhatsapp(normalized);
      setCurrent(normalized);
      setMessage(
        "Número salvo. Os próximos pedidos já vão para este WhatsApp.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="admin-heading">
        <div>
          <h1>Configurações</h1>
          <p>Ajustes gerais da loja.</p>
        </div>
      </div>
      <form className="admin-card settings-card" onSubmit={submit} noValidate>
        <h2>WhatsApp que recebe os pedidos</h2>
        <p className="field-help">
          Todos os pedidos e botões de contato do site abrem conversa com este
          número. Número atual:{" "}
          <strong>{current ? formatWhatsapp(current) : "carregando…"}</strong>
        </p>
        <label>
          Novo número
          <input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="(61) 98133-3737"
            value={value}
            maxLength={16}
            onChange={(e) => setValue(formatBrazilianPhone(e.target.value))}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="admin-success" role="status">
            {message}
          </p>
        )}
        <div className="editor-actions">
          <button className="btn primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar número"}
          </button>
          {normalized && (
            <a
              className="btn outline"
              href={whatsappLink(normalized, "Teste do painel Sanes Brindes")}
              target="_blank"
              rel="noreferrer"
            >
              Testar conversa <MessageCircle size={16} />
            </a>
          )}
        </div>
      </form>
    </section>
  );
}
