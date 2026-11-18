import { useEffect, useRef, useState } from "react";
import fallback from "../products";
import { supabase, loadProducts } from "./supabase";
import { cleanCart, mergeCarts, combineCartItems } from "./commerce";
const safeCart = (key, products) => {
  const items = cleanCart(read(key), products);
  try {
    return combineCartItems(items);
  } catch {
    return items;
  }
};
const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};
export default function useStore() {
  const [products, setProducts] = useState(fallback),
    [catalogError, setCatalogError] = useState(""),
    [revision, setRevision] = useState(0);
  const [session, setSession] = useState(null),
    [authReady, setAuthReady] = useState(!supabase),
    [recovery, setRecovery] = useState(false);
  const [cart, setCart] = useState(() => safeCart("sanes-cart-v1", fallback));
  const [profile, setProfile] = useState({
      name: "",
      company: "",
      phone: "",
      city: "",
    }),
    [syncError, setSyncError] = useState(""),
    [cartOwner, setCartOwner] = useState(null),
    [staff, setStaff] = useState(false);
  const guestAtLogin = useRef([]),
    uid = session?.user.id;
  useEffect(() => {
    let active = true;
    if (supabase)
      loadProducts()
        .then((data) => {
          if (active) {
            setProducts(data);
            setCatalogError("");
          }
        })
        .catch(() => {
          if (active)
            setCatalogError(
              "Não foi possível atualizar o catálogo. Tente novamente antes de enviar seu pedido.",
            );
        });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          if (!error) setSession(data.session);
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (active) setAuthReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (active) {
        setSession(next);
        setAuthReady(true);
        if (event === "PASSWORD_RECOVERY") setRecovery(true);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    setCartOwner(null);
    setSyncError("");
    setStaff(false);
    if (!uid) {
      const guest = safeCart("sanes-cart-v1", products);
      guestAtLogin.current = guest;
      setCart(guest);
      setProfile({ name: "", company: "", phone: "", city: "" });
      return;
    }
    const local = cleanCart(read(`sanes-cart-user-${uid}`), products);
    Promise.all([
      supabase.from("carts").select("items").eq("user_id", uid).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("store_members")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle(),
    ])
      .then(([saved, p, member]) => {
        if (!active) return;
        if (saved.error || p.error || member.error)
          throw saved.error || p.error || member.error;
        const merged = mergeCarts(
          saved.data?.items || [],
          [...local, ...guestAtLogin.current],
          products,
        );
        setCart(merged);
        setProfile(
          p.data || {
            name: session.user.user_metadata?.name || "",
            company: "",
            phone: "",
            city: "",
          },
        );
        setStaff(Boolean(member.data));
        setCartOwner(uid);
        // Consume guest cart only after successful hydration. An account switch cannot
        // expose the previous account's cart to the new account.
        guestAtLogin.current = [];
        try {
          localStorage.removeItem("sanes-cart-v1");
        } catch {}
      })
      .catch(() => {
        if (active) {
          setCart(local);
          setSyncError(
            "Não foi possível sincronizar sua conta. Seu carrinho local foi preservado. Tente novamente.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [uid, authReady, revision]);
  useEffect(() => {
    if (!authReady) return;
    const key = uid ? `sanes-cart-user-${uid}` : "sanes-cart-v1";
    if (uid && cartOwner !== uid) return;
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {
      setSyncError("O navegador não permitiu salvar o carrinho localmente.");
    }
    if (!uid) {
      guestAtLogin.current = cart;
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      supabase
        .from("carts")
        .upsert({
          user_id: uid,
          items: cart,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (active && error)
            setSyncError(
              "Seu carrinho está salvo neste navegador, mas ainda não foi sincronizado com sua conta. Tente novamente.",
            );
        });
    }, 700);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cart, uid, cartOwner, authReady]);
  const visibleCart =
    (!uid && cartOwner === null) || (uid && cartOwner === uid) ? cart : [];
  return {
    products,
    session,
    authReady,
    recovery,
    setRecovery,
    cart: visibleCart,
    setCart,
    profile,
    staff,
    syncError,
    catalogError,
    retry: () => setRevision((n) => n + 1),
    canOrder: Boolean(
      supabase && session && cartOwner === uid && !catalogError,
    ),
  };
}
