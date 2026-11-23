import { useState } from "react";
import { Plus, Check } from "lucide-react";
import IMG from "./ProductImage";
import AttachmentPicker from "./Attachments";
import { supabaseConfigured } from "../lib/supabase";

export const METHODS = [
  "Laser",
  "Impressão UV",
  "Silk-screen",
  "Sublimação",
  "Tampografia",
];

export function ProductGallery({ product }) {
  const pictures = [product.imagem, ...(product.gallery || [])].filter(Boolean);
  const [current, setCurrent] = useState(0);
  const shown = { ...product, imagem: pictures[current] || product.imagem };
  return (
    <>
      <IMG p={shown} />
      {pictures.length > 1 && (
        <div className="gallery-thumbs" aria-label="Outras fotos">
          {pictures.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === current ? "active" : ""}
              aria-label={`Ver foto ${i + 1} de ${pictures.length}`}
              aria-pressed={i === current}
              onClick={() => setCurrent(i)}
            >
              <IMG p={{ ...product, imagem: src }} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function ProductModal({ product: p, form, onAdd, editing }) {
  const { values, set, error, busy } = form;
  const qty = Number(values.qty) || 0;
  const split = values.split && values.colors.length > 1;
  const splitSum = values.colors.reduce(
    (s, c) => s + (Number(values.colorQty[c]) || 0),
    0,
  );
  const toggleColor = (name) =>
    set({
      colors: values.colors.includes(name)
        ? values.colors.filter((c) => c !== name)
        : [...values.colors, name],
    });
  return (
    <>
      <div className="modal-visual">
        <ProductGallery product={p} />
        <span>
          {p.imagem ? "Imagem do catálogo Sanes." : "Foto em breve."} Cores e
          acabamentos sujeitos à confirmação.
        </span>
      </div>
      <div className="modal-content">
        <div className="eyebrow">
          {p.codigo} · {p.categoria}
        </div>
        <h2 id="dialog-title">{p.nome}</h2>
        <p>{p.desc}</p>
        <span className="spec">
          {p.capacidade}
          {p.dim && ` · ${p.dim}`}
        </span>
        <h3>{editing ? "Editar item" : "Monte seu item"}</h3>
        <label>
          Quantidade{" "}
          <small>
            {p.min_confirmed === false
              ? "Pedido mínimo a confirmar"
              : `Mínimo de ${p.min} unidades`}
          </small>
          <input
            type="number"
            inputMode="numeric"
            min={p.min}
            max="100000"
            step="1"
            value={values.qty}
            onChange={(e) => set({ qty: e.target.value })}
          />
        </label>
        {p.colors?.length > 0 ? (
          <fieldset className="choice-group">
            <legend>
              Cores <small>escolha uma ou mais</small>
            </legend>
            <div className="chips">
              {p.colors.map((c) => {
                const on = values.colors.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    className={on ? "chip on" : "chip"}
                    aria-pressed={on}
                    onClick={() => toggleColor(c)}
                  >
                    {on && <Check size={14} aria-hidden="true" />}
                    {c}
                  </button>
                );
              })}
            </div>
            {values.colors.length > 1 && (
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={values.split}
                  onChange={(e) => set({ split: e.target.checked })}
                />
                Dividir a quantidade entre as cores
              </label>
            )}
            {split && (
              <div className="color-split">
                {values.colors.map((c) => (
                  <label key={c}>
                    {c}
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={values.colorQty[c] || ""}
                      onChange={(e) =>
                        set({
                          colorQty: {
                            ...values.colorQty,
                            [c]: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                ))}
                <small
                  className={splitSum === qty ? "split-ok" : "split-pending"}
                  aria-live="polite"
                >
                  {splitSum} de {qty} unidades distribuídas
                </small>
              </div>
            )}
            <label>
              Outra cor (opcional)
              <input
                maxLength={120}
                placeholder="Ex.: Pantone da sua marca"
                value={values.customColor}
                onChange={(e) => set({ customColor: e.target.value })}
              />
            </label>
          </fieldset>
        ) : (
          <label>
            Cor desejada <small>opcional</small>
            <input
              maxLength={120}
              placeholder="Ex.: preto, azul royal"
              value={values.customColor}
              onChange={(e) => set({ customColor: e.target.value })}
            />
          </label>
        )}
        <div className="form-row">
          {p.variants?.length > 0 && (
            <label>
              Modelo *
              <select
                value={values.variant}
                onChange={(e) => set({ variant: e.target.value })}
              >
                <option value="">Selecione</option>
                {p.variants.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Técnica de gravação
            <select
              value={values.method}
              onChange={(e) => set({ method: e.target.value })}
            >
              <option value="">A equipe recomenda</option>
              {METHODS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Observações
          <textarea
            placeholder="Posição da logo, frase, tamanho, referência…"
            maxLength={1200}
            value={values.text}
            onChange={(e) => set({ text: e.target.value })}
          />
        </label>
        <AttachmentPicker
          files={values.files}
          busy={busy}
          remoteUpload={supabaseConfigured}
          onAdd={form.addFiles}
          onReplace={form.replaceFile}
          onRemove={form.removeFile}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary full" onClick={onAdd} disabled={busy}>
          {editing ? (
            <>
              Salvar alterações <Check size={18} />
            </>
          ) : (
            <>
              Adicionar ao carrinho <Plus size={18} />
            </>
          )}
        </button>
        <small className="field-help">
          Sem pagamento agora. A equipe confirma arte, preço e prazo.
        </small>
      </div>
    </>
  );
}
