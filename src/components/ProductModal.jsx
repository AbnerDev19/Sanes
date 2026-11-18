import { Upload, Plus } from "lucide-react";
import IMG from "./ProductImage";
export default function ProductModal({ product: modal, form, onAdd: add }) {
  const {
    qty,
    setQty,
    color,
    setColor,
    method,
    setMethod,
    text,
    setText,
    art,
    setArt,
    error,
    setError,
  } = form;
  return (
    <>
      <div className="modal-visual">
        <IMG p={modal} />
        <span>
          {modal.imagem ? "Imagem do catálogo Sanes." : "Foto em breve."}{" "}
          Modelo, cores e técnicas sujeitos à confirmação.
        </span>
      </div>
      <div className="modal-content">
        <div className="eyebrow">
          {modal.codigo} · {modal.categoria}
        </div>
        <h2 id="dialog-title">{modal.nome}</h2>
        <p>{modal.desc}</p>
        <span className="spec">
          {modal.capacidade}
          {modal.dim && ` · ${modal.dim}`}
        </span>
        <h3>Deixe com a sua cara</h3>
        <label>
          Quantidade{" "}
          <small>
            {modal.min_confirmed === false
              ? "Pedido mínimo a confirmar"
              : `Mínimo de ${modal.min} unidades`}
          </small>
          <input
            type="number"
            min={modal.min}
            max="100000"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Cor desejada
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              {[
                "A definir",
                "Preto",
                "Branco",
                "Azul",
                "Vermelho",
                "Natural",
                "Outra — informar nos detalhes",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Personalização
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {[
                "A definir com a equipe",
                "Laser",
                "Impressão UV",
                "Silk-screen",
                "Sublimação",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <small className="field-help">
          Preferências sujeitas à disponibilidade e compatibilidade do produto.
        </small>
        <label>
          O que você imagina?
          <textarea
            placeholder="Logo da empresa, frase, posição da gravação…"
            maxLength={1200}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <label className="upload">
          <Upload size={18} />
          {art ? art.name : "Selecionar referência da sua arte"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f && f.size > 10 * 1024 * 1024) {
                setError("Selecione um arquivo de até 10 MB.");
                return;
              }
              setArt(f || null);
              setError("");
            }}
          />
        </label>
        <p className="art-notice">
          A arte não é enviada pelo site. Anexe o arquivo na conversa do
          WhatsApp.
        </p>
        <small className="field-help">
          PNG, JPG, WebP ou PDF, até 10 MB. Aqui fica apenas o nome da
          referência.
        </small>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary full" onClick={add}>
          Adicionar ao carrinho <Plus size={18} />
        </button>
        <small className="field-help">
          Sem pagamento agora. A equipe confirma arte, preço e prazo.
        </small>
      </div>
    </>
  );
}
