import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, Star, Trash2, X, Plus } from "lucide-react";
import {
  fetchProducts,
  fetchCategories,
  saveProduct,
  deleteProduct,
  uploadProductImage,
  removeProductImage,
} from "./api";

const BLANK = {
  id: "",
  name: "",
  category: "",
  capacity: "",
  description: "",
  dimensions: "",
  min_qty: 30,
  min_confirmed: true,
  unit_price: "",
  image_url: "",
  gallery: [],
  colors: [],
  variants: [],
  active: true,
  featured: false,
};

function nextCode(products) {
  const max = products.reduce((m, p) => {
    const n = /^SB-(\d+)$/.exec(p.id)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `SB-${String(max + 1).padStart(3, "0")}`;
}

// Lista de valores curtos (cores, modelos): digite e tecle Enter.
function TagInput({ label, help, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft
      .split(",")
      .map((v) => v.trim().slice(0, 60))
      .filter((v) => v && !values.includes(v));
    if (parts.length) onChange([...values, ...parts].slice(0, 40));
    setDraft("");
  };
  return (
    <fieldset className="tag-input">
      <legend>{label}</legend>
      {values.length > 0 && (
        <ul>
          {values.map((v, i) => (
            <li key={v}>
              {v}
              <button
                type="button"
                aria-label={`Remover ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X size={13} />
              </button>
              {i > 0 && (
                <button
                  type="button"
                  aria-label={`Mover ${v} para a esquerda`}
                  className="tag-move"
                  onClick={() => {
                    const next = [...values];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    onChange(next);
                  }}
                >
                  ‹
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="tag-add">
        <input
          aria-label={`Adicionar em ${label}`}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn outline small" onClick={add}>
          <Plus size={15} /> Adicionar
        </button>
      </div>
      {help && <small className="field-help">{help}</small>}
    </fieldset>
  );
}

export default function ProductEditor({ id, onSaved, owner }) {
  const [created, setCreated] = useState(false);
  const isNew = id === "novo" && !created;
  const [form, setForm] = useState(BLANK),
    [categories, setCategories] = useState([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    let active = true;
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([products, cats]) => {
        if (!active) return;
        setCategories(cats.map((c) => c.name));
        if (isNew)
          setForm({
            ...BLANK,
            id: nextCode(products),
            category: cats[0]?.name || "",
            sort_order:
              products.reduce((m, p) => Math.max(m, p.sort_order || 0), 0) + 1,
          });
        else {
          const found = products.find((p) => p.id === id);
          if (!found) setError("Produto não encontrado.");
          else
            setForm({
              ...BLANK,
              ...found,
              dimensions: found.dimensions || "",
              unit_price:
                found.unit_price === null || found.unit_price === undefined
                  ? ""
                  : Number(found.unit_price).toFixed(2).replace(".", ","),
              image_url: found.image_url || "",
            });
        }
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const pictures = [form.image_url, ...form.gallery].filter(Boolean);
  const setPictures = (list) =>
    set({ image_url: list[0] || "", gallery: list.slice(1, 13) });

  const upload = async (files) => {
    setError("");
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(form.id)) {
      setError("Defina um código válido antes de enviar fotos.");
      return;
    }
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files).slice(0, 13 - pictures.length))
        urls.push(await uploadProductImage(form.id, file));
      setPictures([...pictures, ...urls]);
      setMessage("Foto enviada. Clique em Salvar para publicar.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const price = String(form.unit_price).replace(",", ".").trim();
    const min = Number(form.min_qty);
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(form.id))
      return setError("Código: use letras, números, hífen (ex.: SB-120).");
    if (!form.name.trim()) return setError("Informe o nome do produto.");
    if (!form.category) return setError("Escolha a categoria.");
    if (!Number.isSafeInteger(min) || min < 1 || min > 100000)
      return setError(
        "Pedido mínimo deve ser um número inteiro a partir de 1.",
      );
    if (price && !(Number(price) >= 0))
      return setError("Preço inválido. Deixe em branco para “Sob consulta”.");
    setSaving(true);
    try {
      const row = {
        id: form.id.trim(),
        name: form.name.trim(),
        category: form.category,
        capacity: form.capacity.trim(),
        description: form.description.trim(),
        dimensions: form.dimensions.trim() || null,
        min_qty: min,
        min_confirmed: form.min_confirmed,
        unit_price: price ? Number(Number(price).toFixed(2)) : null,
        image_url: form.image_url || null,
        gallery: form.gallery,
        colors: form.colors,
        variants: form.variants,
        active: form.active,
        featured: form.featured,
      };
      if (isNew) row.sort_order = form.sort_order;
      await saveProduct(row, isNew);
      onSaved();
      if (isNew) {
        // Atualiza o endereço sem recarregar a tela (mantém a confirmação).
        history.replaceState(
          null,
          "",
          `#/admin/produtos/${encodeURIComponent(row.id)}`,
        );
        setCreated(true);
      }
      setMessage("Produto salvo. O catálogo já foi atualizado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      await deleteProduct(form.id);
      await Promise.all(pictures.map(removeProductImage)).catch(() => {});
      onSaved();
      location.hash = "#/admin/produtos";
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  const back = (
    <a className="text-link" href="#/admin/produtos">
      <ArrowLeft size={16} /> Todos os produtos
    </a>
  );
  if (loading)
    return (
      <section>
        {back}
        <p role="status">Carregando…</p>
      </section>
    );

  return (
    <section className="product-editor">
      {back}
      <div className="admin-heading">
        <h1>{isNew ? "Novo produto" : form.name || "Editar produto"}</h1>
      </div>
      <form onSubmit={submit} noValidate className="editor-grid">
        <div className="admin-card">
          <h2>Informações</h2>
          <div className="form-row">
            <label>
              Código *
              <input
                value={form.id}
                disabled={!isNew}
                maxLength={80}
                onChange={(e) => set({ id: e.target.value.toUpperCase() })}
              />
            </label>
            <label>
              Categoria *
              <select
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
              >
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Nome *
            <input
              value={form.name}
              maxLength={120}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label>
            Descrição
            <textarea
              rows={4}
              maxLength={1500}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>
          <div className="form-row">
            <label>
              Capacidade / especificação
              <input
                value={form.capacity}
                maxLength={120}
                placeholder="Ex.: 750 ml"
                onChange={(e) => set({ capacity: e.target.value })}
              />
            </label>
            <label>
              Medidas
              <input
                value={form.dimensions}
                maxLength={120}
                placeholder="Ex.: 7 x 25 cm"
                onChange={(e) => set({ dimensions: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Pedido mínimo *
              <input
                type="number"
                min="1"
                step="1"
                value={form.min_qty}
                onChange={(e) => set({ min_qty: e.target.value })}
              />
            </label>
            <label>
              Preço unitário (R$)
              <input
                inputMode="decimal"
                placeholder="Sob consulta"
                value={form.unit_price}
                onChange={(e) => set({ unit_price: e.target.value })}
              />
            </label>
          </div>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={!form.min_confirmed}
              onChange={(e) => set({ min_confirmed: !e.target.checked })}
            />
            Pedido mínimo ainda a confirmar
          </label>
        </div>

        <div className="admin-card">
          <h2>Fotos</h2>
          <p className="field-help">
            A primeira foto é a capa do catálogo. Fotos grandes são reduzidas
            automaticamente.
          </p>
          <ul className="photo-grid">
            {pictures.map((src, i) => (
              <li key={src}>
                <img src={src} alt={`Foto ${i + 1} de ${form.name}`} />
                {i === 0 && <span className="cover-tag">Capa</span>}
                <div className="photo-actions">
                  {i > 0 && (
                    <button
                      type="button"
                      className="icon"
                      aria-label={`Usar foto ${i + 1} como capa`}
                      title="Usar como capa"
                      onClick={() =>
                        setPictures([src, ...pictures.filter((p) => p !== src)])
                      }
                    >
                      <Star size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon"
                    aria-label={`Remover foto ${i + 1}`}
                    title="Remover"
                    onClick={() =>
                      setPictures(pictures.filter((p) => p !== src))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
            {pictures.length < 13 && (
              <li className="photo-add">
                <label>
                  <ImagePlus size={22} aria-hidden="true" />
                  {uploading ? "Enviando…" : "Adicionar fotos"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploading}
                    aria-label="Adicionar fotos do produto"
                    onChange={(e) => {
                      upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </li>
            )}
          </ul>
        </div>

        <div className="admin-card">
          <h2>Opções para o cliente</h2>
          <TagInput
            label="Cores disponíveis"
            values={form.colors}
            onChange={(colors) => set({ colors })}
            placeholder="Ex.: Preto, Azul royal"
            help="Sem cores cadastradas, o cliente escreve a cor desejada."
          />
          <TagInput
            label="Modelos / variações"
            values={form.variants}
            onChange={(variants) => set({ variants })}
            placeholder="Ex.: 500 ml, 750 ml"
            help="Com modelos cadastrados, o cliente precisa escolher um."
          />
        </div>

        <div className="admin-card">
          <h2>Exibição</h2>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            Produto ativo (aparece no catálogo)
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => set({ featured: e.target.checked })}
            />
            Destacar no topo do catálogo
          </label>
        </div>

        <div className="editor-actions">
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
          <button className="btn primary" disabled={saving || uploading}>
            {saving ? "Salvando…" : "Salvar produto"}
          </button>
          {owner &&
            !isNew &&
            (confirmDelete ? (
              <span className="confirm-delete">
                Excluir definitivamente?
                <button
                  type="button"
                  className="btn danger small"
                  onClick={remove}
                  disabled={saving}
                >
                  Sim, excluir
                </button>
                <button
                  type="button"
                  className="btn outline small"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="text-link danger-link"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} /> Excluir produto
              </button>
            ))}
        </div>
      </form>
    </section>
  );
}
