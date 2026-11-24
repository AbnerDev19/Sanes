import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  fetchCategories,
  fetchProducts,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "./api";

function CategoryRow({ category, count, first, last, busy, owner, onAction }) {
  const [name, setName] = useState(category.name);
  const changed = name.trim() && name.trim() !== category.name;
  return (
    <li className={category.active ? "" : "inactive"}>
      <div className="admin-row category-row">
        <form
          className="rename"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed) onAction("rename", name.trim());
          }}
        >
          <input
            aria-label={`Nome da categoria ${category.name}`}
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          {changed && (
            <button className="btn outline small" disabled={busy}>
              Salvar
            </button>
          )}
        </form>
        <small className="row-count">
          {count} produto{count === 1 ? "" : "s"}
        </small>
        <label className="switch">
          <input
            type="checkbox"
            checked={category.active}
            disabled={busy}
            onChange={() => onAction("active", !category.active)}
          />
          <span>{category.active ? "Visível" : "Oculta"}</span>
        </label>
        <span className="row-order">
          <button
            type="button"
            className="icon"
            aria-label={`Mover ${category.name} para cima`}
            disabled={first || busy}
            onClick={() => onAction("move", -1)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            className="icon"
            aria-label={`Mover ${category.name} para baixo`}
            disabled={last || busy}
            onClick={() => onAction("move", 1)}
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            className="icon"
            aria-label={`Excluir ${category.name}`}
            title={count ? "Mova os produtos antes de excluir" : "Excluir"}
            disabled={!owner || busy || count > 0}
            onClick={() => onAction("delete")}
          >
            <Trash2 size={16} />
          </button>
        </span>
      </div>
    </li>
  );
}

export default function AdminCategories({ onChange, owner }) {
  const [categories, setCategories] = useState([]),
    [counts, setCounts] = useState({}),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = async () => {
    setError("");
    try {
      const [cats, products] = await Promise.all([
        fetchCategories(),
        fetchProducts(),
      ]);
      setCategories(cats);
      const next = {};
      for (const p of products) next[p.category] = (next[p.category] || 0) + 1;
      setCounts(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const run = async (task) => {
    setBusy(true);
    setError("");
    try {
      await task();
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const action = (category, index) => (kind, value) =>
    run(async () => {
      if (kind === "rename")
        await updateCategory(category.name, { name: value });
      if (kind === "active")
        await updateCategory(category.name, { active: value });
      if (kind === "delete") await deleteCategory(category.name);
      if (kind === "move") {
        const names = categories.map((c) => c.name);
        const target = index + value;
        [names[index], names[target]] = [names[target], names[index]];
        await reorderCategories(names);
      }
    });
  return (
    <section>
      <div className="admin-heading">
        <div>
          <h1>Categorias</h1>
          <p>
            A ordem abaixo é a ordem das abas do catálogo. Renomear atualiza
            todos os produtos da categoria.
          </p>
        </div>
      </div>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const name = draft.trim();
          if (!name) return;
          run(async () => {
            await addCategory(name, categories.length + 1);
            setDraft("");
          });
        }}
      >
        <input
          aria-label="Nova categoria"
          placeholder="Nova categoria"
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn primary" disabled={busy || !draft.trim()}>
          <Plus size={16} /> Adicionar
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Carregando…</p>}
      <ul className="admin-list">
        {categories.map((c, i) => (
          <CategoryRow
            key={c.name}
            category={c}
            count={counts[c.name] || 0}
            first={i === 0}
            last={i === categories.length - 1}
            busy={busy}
            owner={owner}
            onAction={action(c, i)}
          />
        ))}
      </ul>
    </section>
  );
}
