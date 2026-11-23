import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { contactErrors, formatBrazilianPhone } from "../lib/checkout";
import { whatsappLink } from "../config";
import { submitOrder, manualMessage, SubmitError } from "../lib/orderSubmit";
import { deleteAttachments } from "../lib/attachments";

export const EMPTY_CUSTOMER = {
  name: "",
  company: "",
  phone: "",
  city: "",
  state: "",
  email: "",
  extra: "",
};
const SAVED = "sanes-customer-v1",
  NOTES = "sanes-cart-notes-v1";

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// Identificação do cliente, observações gerais e finalização do pedido.
export default function useCheckout({
  cart,
  setCart,
  session,
  rawSession,
  profile,
  canOrder,
  whatsapp,
}) {
  const [customer, setCustomerState] = useState(() => ({
      ...EMPTY_CUSTOMER,
      ...readJson(SAVED, {}),
      extra: "",
    })),
    [notes, setNotesState] = useState(() => String(readJson(NOTES, ""))),
    [fieldErrors, setFieldErrors] = useState({}),
    [submitting, setSubmitting] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState(null),
    [result, setResult] = useState(null);

  const setCustomer = (next) => {
    setCustomerState(next);
    const { extra, email, ...keep } = next;
    if (!session) writeJson(SAVED, keep);
  };
  const setNotes = (value) => {
    setNotesState(value);
    writeJson(NOTES, value);
  };

  // Conta conectada: preenche com o perfil salvo.
  useEffect(() => {
    setResult(null);
    setError(null);
    setFieldErrors({});
    if (!session) {
      setCustomerState((c) => ({ ...c, email: "" }));
      return;
    }
    setCustomerState((c) => ({
      ...c,
      name: profile.name || session.user.user_metadata?.name || c.name,
      company: profile.company || c.company,
      phone: formatBrazilianPhone(profile.phone || c.phone || ""),
      city: profile.city || c.city,
      email: session.user.email || "",
    }));
  }, [session?.user.id, profile]);

  const combinedNotes = [notes.trim(), customer.extra.trim()]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 1500);
  const fileCount = cart.reduce((s, i) => s + (i.files?.length || 0), 0);

  const openManual = () => {
    const link = whatsappLink(
      whatsapp,
      manualMessage({ cart, customer, notes: combinedNotes }),
    );
    setError(null);
    setResult({ link, saved: false, manualFiles: fileCount });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const send = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    setError(null);
    const errors = contactErrors(customer);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError({
        message: "Confira os campos destacados.",
        canFallback: false,
      });
      requestAnimationFrame(() =>
        document.querySelector("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    if (!supabaseConfigured) {
      openManual();
      return;
    }
    if (session && !canOrder) {
      setError({
        message:
          "Sua conta ainda está sincronizando. Aguarde um instante e tente novamente.",
        canFallback: true,
      });
      return;
    }
    setSubmitting(true);
    try {
      if (session)
        supabase
          .from("profiles")
          .upsert({
            id: session.user.id,
            name: customer.name.trim(),
            company: customer.company.trim(),
            phone: customer.phone,
            city: customer.city.trim(),
            updated_at: new Date().toISOString(),
          })
          .then(() => {});
      const { order, message } = await submitOrder({
        cart,
        customer,
        notes: combinedNotes,
        rawSession: session || rawSession,
        onProgress: setProgress,
      });
      setResult({
        link: whatsappLink(whatsapp, message),
        saved: true,
        number: order.number,
        manualFiles: 0,
      });
    } catch (err) {
      setError({
        message: `${err.message || "Não foi possível enviar o pedido."} Seu carrinho foi preservado.`,
        canFallback: err instanceof SubmitError ? err.canFallback : true,
      });
    } finally {
      setSubmitting(false);
      setProgress("");
    }
  };

  const startOver = () => {
    const ids = cart.flatMap((i) => (i.files || []).map((f) => f.id));
    if (ids.length) deleteAttachments(ids);
    setCart([]);
    setNotes("");
    setCustomerState((c) => ({ ...c, extra: "" }));
    setResult(null);
    setError(null);
  };

  return {
    customer,
    setCustomer,
    notes,
    setNotes,
    fieldErrors,
    submitting,
    progress,
    error,
    result,
    fileCount,
    send,
    openManual,
    startOver,
    reset: () => {
      setResult(null);
      setError(null);
    },
    clearCustomer: () => {
      setResult(null);
      setCustomerState({ ...EMPTY_CUSTOMER, ...readJson(SAVED, {}) });
    },
  };
}
