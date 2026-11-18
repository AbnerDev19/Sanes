import { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  X,
  Plus,
  Check,
  ChevronDown,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Package,
  Truck,
} from "lucide-react";
import ClickSpark from "./components/ClickSpark";
import TechText from "./components/TechText";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import MarketingSections from "./components/MarketingSections";
import ProductCard from "./components/ProductCard";
import ProductModal from "./components/ProductModal";
import CartDrawer from "./components/CartDrawer";
import ProductPage from "./components/ProductPage";
import AuthPanel from "./components/AuthPanel";
import AccountPanel from "./components/AccountPanel";
import useStore from "./lib/useStore";
import { CATEGORIES, filterCatalog, productIdFromHash } from "./lib/catalog";
import { supabase } from "./lib/supabase";
import { cartTotals, combineCartItems } from "./lib/commerce";
import useScrollReveal from "./components/useScrollReveal";
import useReducedMotion from "./lib/useReducedMotion";
import { validateQuantity, makeMessage } from "./order";
import { WHATSAPP as WA } from "./config";
import { contactError, formatBrazilianPhone } from "./lib/checkout";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./style.css";
import "./responsive.css";
import "./commerce.css";
const groups = ["Todos os produtos", ...CATEGORIES];

function App() {
  const reducedMotion = useReducedMotion();
  const [productId, setProductId] = useState(() =>
    productIdFromHash(location.hash),
  );
  const [maxMinimum, setMaxMinimum] = useState("");
  useEffect(() => {
    const update = () => {
      setProductId(productIdFromHash(location.hash));
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (productId) window.scrollTo(0, 0);
  }, [productId]);
  const {
    products,
    session,
    authReady,
    recovery,
    setRecovery,
    cart,
    setCart,
    profile,
    staff,
    syncError,
    catalogError,
    retry,
    canOrder,
  } = useStore();
  const [guestContact, setGuestContact] = useState("");
  const [accountView, setAccountView] = useState(null),
    [submitting, setSubmitting] = useState(false),
    [checkoutError, setCheckoutError] = useState(""),
    [placedOrder, setPlacedOrder] = useState(null);
  const minimumFor = (id) => products.find((p) => p.id === id)?.min || 1;
  useEffect(() => {
    if (recovery) {
      setModal(null);
      setCartOpen(false);
      setAccountView("auth");
    }
  }, [recovery]);
  useEffect(() => {
    setPlacedOrder(null);
    setGuestContact("");
    setCheckoutError("");
    setCustomer({
      name: "",
      company: "",
      email: "",
      phone: "",
      city: "",
      date: "",
      notes: "",
    });
  }, [session?.user.id]);
  useEffect(() => {
    if (session)
      setCustomer((c) => ({
        ...c,
        name: c.name || profile.name || session.user.user_metadata?.name || "",
        company: c.company || profile.company || "",
        email: session.user.email || "",
        phone: c.phone || formatBrazilianPhone(profile.phone || ""),
        city: c.city || profile.city || "",
      }));
  }, [session?.user.id, profile]);

  const [category, setCategory] = useState(groups[0]),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(9),
    [sort, setSort] = useState("featured"),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState(null),
    [cartOpen, setCartOpen] = useState(false),
    [step, setStep] = useState(1),
    [toast, setToast] = useState(""),
    [customer, setCustomer] = useState({
      name: "",
      company: "",
      email: "",
      phone: "",
      city: "",
      date: "",
      notes: "",
    });
  const [qty, setQty] = useState(30),
    [color, setColor] = useState("A definir"),
    [method, setMethod] = useState("A definir com a equipe"),
    [text, setText] = useState(""),
    [art, setArt] = useState(null),
    [error, setError] = useState("");
  const dialog = useRef(null),
    trigger = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") setMobile(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reset = () => setMobile(false);
    document.addEventListener("keydown", close);
    desktop.addEventListener("change", reset);
    return () => {
      document.removeEventListener("keydown", close);
      desktop.removeEventListener("change", reset);
    };
  }, []);
  useScrollReveal([category, query, limit, sort, maxMinimum, productId]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!modal && !cartOpen && !accountView) return;
    trigger.current = document.activeElement;
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      const root = dialog.current;
      const field = root?.querySelector(
        'input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled])',
      );
      (
        field || root?.querySelector('button:not([disabled]),[tabindex="0"]')
      )?.focus();
    }, 10);
    const key = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setCartOpen(false);
        setAccountView(null);
      }
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
        );
        if (!nodes?.length) return;
        const visible = Array.from(nodes).filter(
          (node) =>
            node.getClientRects().length &&
            !node.closest('[aria-hidden="true"]'),
        );
        const first = visible[0],
          last = visible[visible.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      trigger.current?.focus();
    };
  }, [!!modal, cartOpen, accountView]);
  const choose = (c) => {
    setCategory(c);
    setLimit(9);
    setMobile(false);
    document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
  };
  const open = (p) => {
    setModal(p);
    setQty(p.min);
    setColor("A definir");
    setMethod("A definir com a equipe");
    setText("");
    setArt(null);
    setError("");
  };
  const add = () => {
    if (!validateQuantity(qty, modal.min)) {
      setError(
        `Informe uma quantidade inteira a partir de ${modal.min} unidades.`,
      );
      return;
    }
    const item = {
      id: modal.id,
      name: modal.nome,
      qty: Number(qty),
      color,
      method,
      text: text.trim(),
      art: art?.name || "",
    };
    try {
      setCart(
        combineCartItems([...cart, { ...item, key: crypto.randomUUID() }]),
      );
    } catch (e) {
      setError(e.message);
      return;
    }
    setModal(null);
    setPlacedOrder(null);
    setGuestContact("");
    setToast("Produto adicionado ao carrinho");
  };
  const updateQty = (key, val) =>
    setCart((c) =>
      c.map((i) =>
        i.key === key
          ? {
              ...i,
              qty: Math.min(
                100000,
                Math.max(minimumFor(i.id), Math.floor(Number(val) || 0)),
              ),
            }
          : i,
      ),
    );
  const filtered = useMemo(
    () => filterCatalog(products, { category, query, maxMinimum, sort }),
    [products, category, query, maxMinimum, sort],
  );
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const totals = cartTotals(cart, products);
  const showAccount = () => {
    setModal(null);
    setCartOpen(false);
    setAccountView(session ? "account" : "auth");
  };
  const send = async (e) => {
    e.preventDefault();
    setCheckoutError("");
    const invalid = contactError(customer);
    if (invalid) {
      setCheckoutError(invalid);
      return;
    }
    if (!session) {
      const link = `https://wa.me/${WA}?text=${encodeURIComponent(makeMessage(cart, customer))}`;
      setGuestContact(link);
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    if (!canOrder) {
      setCheckoutError(
        "Não foi possível preparar seu pedido. Atualize sua conta e o catálogo antes de continuar.",
      );
      return;
    }
    if (submitting) return;
    if (!customer.name.trim()) {
      setCheckoutError("Informe seu nome.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        name: customer.name.trim(),
        company: customer.company,
        phone: customer.phone,
        city: customer.city,
        updated_at: new Date().toISOString(),
      });
      if (profileError)
        throw new Error(
          "Não foi possível salvar seus dados de contato. Tente novamente.",
        );
      const storageKey = `sanes-pending-order-${session.user.id}`;
      const fingerprint = JSON.stringify(cart);
      let pending;
      try {
        pending = JSON.parse(localStorage.getItem(storageKey) || "null");
      } catch {}
      if (!pending || pending.fingerprint !== fingerprint)
        pending = { fingerprint, key: crypto.randomUUID() };
      try {
        localStorage.setItem(storageKey, JSON.stringify(pending));
      } catch {}
      const { data, error } = await supabase.rpc("place_order", {
        p_request_key: pending.key,
        p_items: cart.map(({ id, qty, color, method, text, art }) => ({
          id,
          qty,
          color,
          method,
          text,
          art,
        })),
        p_customer: {
          name: customer.name,
          company: customer.company,
          phone: customer.phone,
          city: customer.city,
          date: customer.date,
          notes: customer.notes,
        },
      });
      if (error)
        throw new Error(
          "Não foi possível registrar o pedido. Confira as quantidades e a disponibilidade dos itens e tente novamente. Seu carrinho foi preservado.",
        );
      setPlacedOrder(data);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    } catch (error) {
      setCheckoutError(
        error.message ||
          "Não foi possível registrar seu pedido. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <ClickSpark
      disabled={reducedMotion}
      sparkColor="#c69c35"
      sparkCount={9}
      sparkSize={12}
      sparkRadius={32}
      duration={550}
    >
      <Header
        {...{
          session,
          showAccount,
          cart,
          mobile,
          setMobile,
          setAccountView,
          setCartOpen,
          setStep,
        }}
      />
      <main>
        {(catalogError || syncError) && (
          <div className="store-notice wrap" role="status">
            {catalogError || syncError}
            <button className="text-link" onClick={retry}>
              Tentar novamente
            </button>
          </div>
        )}
        {productId ? (
          <ProductPage
            product={products.find((p) => p.id === productId)}
            onCustomize={open}
          />
        ) : (
          <>
            <Hero reducedMotion={reducedMotion} />
            <section className="benefits">
              <div className="wrap">
                <span>
                  <ShieldCheck />
                  Cuidado em cada acabamento
                </span>
                <span>
                  <Sparkles />
                  Personalização sob medida
                </span>
                <span>
                  <Package />
                  Pedidos para sua empresa
                </span>
                <span>
                  <Truck />
                  Entrega em todo o Brasil
                </span>
              </div>
            </section>
            <section className="catalog wrap" id="catalogo">
              <div className="section-heading" data-reveal>
                <div>
                  <div className="eyebrow">O PRÓXIMO PRESENTE DA SUA MARCA</div>
                  <h2
                    className="tech-heading"
                    aria-label="Escolhas que marcam."
                  >
                    <TechText
                      key={String(reducedMotion)}
                      text="Escolhas que marcam."
                      fontFamily="Manrope Variable, sans-serif"
                      fontSize={36}
                      fontWeight={650}
                      letterSpacing={-0.045}
                      align="left"
                      color="#252629"
                      accentColor="#b58c31"
                      intro={reducedMotion ? "none" : "assemble"}
                      introDuration={1.5}
                      specks={10}
                      labels={false}
                      draggable={false}
                      clickKick={!reducedMotion}
                      sweep={!reducedMotion}
                      reveal={reducedMotion ? "off" : "letter"}
                      guides={false}
                    />
                  </h2>
                </div>
                <p>
                  Para o dia a dia, para grandes momentos.
                  <br />
                  Encontre o brinde que conta a sua história.
                </p>
              </div>
              <div className="category-tabs" aria-label="Categorias">
                {groups.map((g, i) => (
                  <button
                    key={g}
                    className={category === g ? "active" : ""}
                    onClick={() => choose(g)}
                  >
                    {g}
                    {i === 0 && <span>{products.length}</span>}
                  </button>
                ))}
              </div>
              <div className="catalog-tools">
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Buscar produtos"
                    placeholder="O que você está procurando?"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(9);
                    }}
                  />
                  {query && (
                    <button
                      className="icon"
                      aria-label="Limpar busca"
                      onClick={() => setQuery("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
                <label className="minimum-filter">
                  Pedido mínimo
                  <select
                    aria-label="Pedido mínimo máximo"
                    value={maxMinimum}
                    onChange={(e) => {
                      setMaxMinimum(e.target.value);
                      setLimit(9);
                    }}
                  >
                    <option value="">Qualquer quantidade</option>
                    {[15, 30, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        Até {n} unidades
                      </option>
                    ))}
                  </select>
                </label>
                <span className="result-count">
                  {filtered.length} produtos encontrados
                </span>
                <label className="sort">
                  <SlidersHorizontal size={15} />
                  <select
                    aria-label="Ordenar produtos"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="featured">Destaques</option>
                    <option value="name">Nome: A a Z</option>
                    <option value="minimum">Menor pedido mínimo</option>
                    <option value="category">Categoria</option>
                  </select>
                  <ChevronDown size={13} />
                </label>
              </div>
              <div className="product-grid">
                {filtered.slice(0, limit).map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    index={i}
                    onCustomize={open}
                  />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="empty">
                  <Search size={35} />
                  <h3>Nenhum brinde por aqui.</h3>
                  <p>Tente outra busca ou explore todas as categorias.</p>
                  <button
                    className="btn primary"
                    onClick={() => {
                      setQuery("");
                      setCategory(groups[0]);
                    }}
                  >
                    Ver todos os produtos
                  </button>
                </div>
              )}
              {filtered.length > limit && (
                <div className="load-more">
                  <button
                    className="btn outline"
                    onClick={() => setLimit((l) => l + 9)}
                  >
                    Explorar mais produtos <Plus size={16} />
                  </button>
                  <small>
                    Mostrando {Math.min(limit, filtered.length)} de{" "}
                    {filtered.length} produtos
                  </small>
                </div>
              )}
            </section>
            <MarketingSections />
          </>
        )}
      </main>
      <Footer />
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            onClick={() => {
              setCartOpen(true);
              setStep(1);
              setToast("");
            }}
          >
            Ver carrinho →
          </button>
        </div>
      )}
      {(modal || cartOpen || accountView) && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModal(null);
              setCartOpen(false);
              setAccountView(null);
            }
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={modal ? "product-modal" : "cart-drawer"}
          >
            <button
              className="close icon"
              aria-label="Fechar"
              onClick={() => {
                setModal(null);
                setCartOpen(false);
                setAccountView(null);
              }}
            >
              <X />
            </button>
            {accountView ? (
              session && accountView === "account" ? (
                <AccountPanel
                  key={session.user.id}
                  session={session}
                  staff={staff}
                  wa={WA}
                  onLogout={() => {
                    setAccountView(null);
                    setPlacedOrder(null);
                    setCustomer({
                      name: "",
                      company: "",
                      email: "",
                      phone: "",
                      city: "",
                      date: "",
                      notes: "",
                    });
                  }}
                />
              ) : (
                <AuthPanel
                  key={recovery ? "recovery" : "login"}
                  recovery={recovery}
                  onRecovered={() => setRecovery(false)}
                  onClose={() => setAccountView(null)}
                />
              )
            ) : modal ? (
              <ProductModal
                product={modal}
                form={{
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
                }}
                onAdd={add}
              />
            ) : (
              <CartDrawer
                {...{
                  cart,
                  step,
                  setStep,
                  choose,
                  minimumFor,
                  updateQty,
                  setCart,
                  setCartOpen,
                  totals,
                  total,
                }}
                checkoutState={{
                  guestContact,
                  placedOrder,
                  customer,
                  session,
                  submitting,
                  authReady,
                  checkoutError,
                }}
                checkoutActions={{
                  setGuestContact,
                  setCartOpen,
                  setAccountView,
                  setCart,
                  setPlacedOrder,
                  send,
                  setCustomer,
                  showAccount,
                  setStep,
                }}
              />
            )}
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
createRoot(document.getElementById("root")).render(<App />);
