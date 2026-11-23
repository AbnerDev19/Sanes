import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import ClickSpark from "./components/ClickSpark";
import Header from "./components/Header";
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
import { CATEGORIES } from "./lib/catalog";
import { cartTotals } from "./lib/commerce";
import { SITE_TITLE, SITE_DESCRIPTION } from "./lib/seo";
import useHashRoute from "./hooks/useHashRoute";
import useDialogFocus from "./hooks/useDialogFocus";
import useCatalogFilters from "./hooks/useCatalogFilters";
import useProductForm from "./hooks/useProductForm";
import useCheckout from "./hooks/useCheckout";

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
  const { products, catalogError, retryCatalog } = useCatalog();
  const {
    session,
    authReady,
    recovery,
    setRecovery,
    cart,
    setCart,
    profile,
    staff,
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
    session,
    profile,
    canOrder: cartReady && !catalogError,
    whatsapp,
  });
  const productForm = useProductForm({
    cart,
    setCart,
    onAdded: () => {
      checkout.reset();
      setToast("Produto adicionado ao carrinho");
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
    if (!recovery) return;
    productForm.close();
    setCartOpen(false);
    setAccountView("auth");
  }, [recovery]);
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
    productForm.close();
    setCartOpen(false);
    setAccountView(session ? "account" : "auth");
  };
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const totals = cartTotals(cart, products);
  const notice = catalogError || syncError;

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
        {route.name === "product" ? (
          <ProductPage
            product={products.find((p) => p.id === route.productId)}
            onCustomize={productForm.open}
          />
        ) : (
          <HomePage
            reducedMotion={reducedMotion}
            catalog={{
              products,
              categories: CATEGORIES,
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
              />
            ) : view === "cart" ? (
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
                checkoutState={{ ...checkout.state, authReady }}
                checkoutActions={{
                  ...checkout.actions,
                  setCartOpen,
                  setAccountView,
                  setCart,
                  showAccount,
                  setStep,
                }}
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
