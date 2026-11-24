import { lazy, Suspense, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import ClickSpark from "./components/ClickSpark";
import Header from "./components/Header";
import LegalPage from "./pages/LegalPage";
import Footer from "./components/Footer";
import ProductModal from "./components/ProductModal";
import CartDrawer from "./components/CartDrawer";
import ProductPage from "./components/ProductPage";
import AuthPanel from "./components/AuthPanel";
import AccountPanel from "./components/AccountPanel";
import useScrollReveal from "./components/useScrollReveal";
import HomePage from "./pages/HomePage";
import useStore from "./lib/useStore";
import useCatalog from "./lib/useCatalog";
import useReducedMotion from "./lib/useReducedMotion";
import { useStoreSettings } from "./lib/storeSettings";
import { deleteAttachments, pruneAttachments } from "./lib/attachments";
import { cartTotals } from "./lib/commerce";
import { SITE_TITLE, SITE_DESCRIPTION } from "./lib/seo";
import useHashRoute from "./hooks/useHashRoute";
import useDialogFocus from "./hooks/useDialogFocus";
import useCatalogFilters from "./hooks/useCatalogFilters";
import useProductForm from "./hooks/useProductForm";
import useCheckout from "./hooks/useCheckout";

const AdminPage = lazy(() => import("./admin/AdminPage"));

// Mantém só os arquivos ainda usados por algum carrinho salvo no navegador.
function pruneStoredAttachments() {
  const ids = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("sanes-cart")) continue;
      const items = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(items))
        for (const item of items)
          for (const f of item?.files || []) if (f?.id) ids.push(f.id);
    }
  } catch {
    return;
  }
  pruneAttachments(ids);
}

function useDocumentMeta(route, products) {
  useEffect(() => {
    const product =
      route.name === "product" &&
      products.find((p) => p.id === route.productId);
    document.title = product
      ? `${product.nome} | Sanes Brindes`
      : route.name === "product"
        ? "Produto não encontrado | Sanes Brindes"
        : SITE_TITLE;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", product?.desc || SITE_DESCRIPTION);
  }, [route, products]);
}

function useToast() {
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return [toast, setToast];
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const route = useHashRoute(reducedMotion);
  const { whatsapp } = useStoreSettings();
  const { products, categories, catalogError, retryCatalog } = useCatalog();
  const {
    session,
    rawSession,
    authReady,
    recovery,
    setRecovery,
    cart,
    setCart,
    profile,
    staff,
    owner,
    staffChecked,
    syncError,
    retrySync,
    cartReady,
  } = useStore(products);
  useDocumentMeta(route, products);

  const [accountView, setAccountView] = useState(null),
    [cartOpen, setCartOpen] = useState(false),
    [step, setStep] = useState(1),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useToast();

  const filters = useCatalogFilters(products);
  const checkout = useCheckout({
    cart,
    setCart,
    session,
    rawSession,
    profile,
    canOrder: cartReady && !catalogError,
    whatsapp,
  });
  const productForm = useProductForm({
    cart,
    setCart,
    onAdded: (edited) => {
      checkout.reset();
      if (!edited) setToast("Produto adicionado ao carrinho");
    },
  });

  const closeAll = () => {
    productForm.close();
    setCartOpen(false);
    setAccountView(null);
  };
  const view = productForm.product
    ? "product"
    : cartOpen
      ? "cart"
      : accountView;
  const dialog = useDialogFocus(view, closeAll);

  useEffect(() => {
    const timer = setTimeout(pruneStoredAttachments, 4000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!recovery || route.name === "account") return;
    productForm.close();
    setCartOpen(false);
    setAccountView("auth");
  }, [recovery, route.name]);
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
  useScrollReveal([
    filters.category,
    filters.query,
    filters.limit,
    filters.sort,
    filters.maxMinimum,
    route,
  ]);

  const minimumFor = (id) => products.find((p) => p.id === id)?.min || 1;
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
  const choose = (c) => {
    filters.choose(c);
    setMobile(false);
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
  };
  const showAccount = () => {
    if (route.name === "account" && !cartOpen) {
      document.getElementById("buyer-account-title")?.focus();
      return;
    }
    productForm.close();
    setCartOpen(false);
    setAccountView(session ? "account" : "auth");
  };
  const editItem = (item) => {
    const product = products.find((p) => p.id === item.id);
    if (product) productForm.open(product, item);
  };
  const removeItem = (item) => {
    setCart((c) => c.filter((i) => i.key !== item.key));
    const ids = (item.files || []).map((f) => f.id);
    if (ids.length) deleteAttachments(ids);
    checkout.reset();
  };
  const totals = cartTotals(cart, products);
  const notice = catalogError || syncError;

  if (route.name === "admin")
    return (
      <Suspense
        fallback={
          <p className="admin-loading" role="status">
            Carregando painel…
          </p>
        }
      >
        <AdminPage
          route={route}
          session={session}
          authReady={authReady}
          staff={staff}
          owner={owner}
          staffChecked={staffChecked}
          recovery={recovery}
          onRecovered={() => setRecovery(false)}
          onCatalogChange={retryCatalog}
        />
      </Suspense>
    );

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
        {notice && (
          <div className="store-notice wrap" role="status">
            {notice}
            <button
              className="text-link"
              onClick={() => {
                retryCatalog();
                retrySync();
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {route.name === "privacy" || route.name === "terms" ? (
          <LegalPage privacy={route.name === "privacy"} />
        ) : route.name === "account" ? (
          <div className="wrap account-page">
            <h1 id="buyer-account-title" tabIndex={-1}>
              Área do comprador
            </h1>
            {!authReady ? (
              <p role="status">Carregando sua conta…</p>
            ) : session && !recovery ? (
              <AccountPanel
                key={session.user.id}
                session={session}
                staff={staff}
                wa={whatsapp}
                onLogout={checkout.clearCustomer}
              />
            ) : (
              <AuthPanel
                key={recovery ? "recovery" : "login"}
                recovery={recovery}
                onRecovered={() => setRecovery(false)}
              />
            )}
          </div>
        ) : route.name === "product" ? (
          <ProductPage
            product={products.find((p) => p.id === route.productId)}
            onCustomize={productForm.open}
          />
        ) : (
          <HomePage
            reducedMotion={reducedMotion}
            catalog={{
              products,
              categories,
              filters,
              onChoose: choose,
              onCustomize: productForm.open,
            }}
          />
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
      {view && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAll();
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={view === "product" ? "product-modal" : "cart-drawer"}
          >
            <button
              className="close icon"
              aria-label="Fechar"
              onClick={closeAll}
            >
              <X />
            </button>
            {view === "product" ? (
              <ProductModal
                product={productForm.product}
                form={productForm.form}
                onAdd={productForm.add}
                editing={productForm.editing}
              />
            ) : view === "cart" ? (
              <CartDrawer
                {...{
                  cart,
                  step,
                  setStep,
                  minimumFor,
                  updateQty,
                  totals,
                  checkout,
                  session,
                  showAccount,
                }}
                onExplore={() => {
                  setCartOpen(false);
                  choose("Todos os produtos");
                }}
                onClose={() => setCartOpen(false)}
                onEdit={editItem}
                onRemove={removeItem}
              />
            ) : session && accountView === "account" ? (
              <AccountPanel
                key={session.user.id}
                session={session}
                staff={staff}
                wa={whatsapp}
                onLogout={() => {
                  setAccountView(null);
                  checkout.clearCustomer();
                }}
              />
            ) : (
              <AuthPanel
                key={recovery ? "recovery" : "login"}
                recovery={recovery}
                onRecovered={() => setRecovery(false)}
                onClose={() => setAccountView(null)}
              />
            )}
          </div>
        </div>
      )}
    </ClickSpark>
  );
}
