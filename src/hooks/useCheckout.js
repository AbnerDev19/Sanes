import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { contactError, formatBrazilianPhone } from "../lib/checkout";
import { makeMessage } from "../order";
import { whatsappLink } from "../config";

export const EMPTY_CUSTOMER = {
  name: "",
  company: "",
  email: "",
  phone: "",
  city: "",
  date: "",
  notes: "",
};

// Dados do cliente e envio do pedido (visitante pelo WhatsApp ou conta).
export default function useCheckout({
  cart,
  session,
  profile,
  canOrder,
  whatsapp,
}) {
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER),
    [guestContact, setGuestContact] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [checkoutError, setCheckoutError] = useState(""),
    [placedOrder, setPlacedOrder] = useState(null);
  useEffect(() => {
    setPlacedOrder(null);
    setGuestContact("");
    setCheckoutError("");
    setCustomer(EMPTY_CUSTOMER);
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

  const reset = () => {
    setPlacedOrder(null);
    setGuestContact("");
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
      const link = whatsappLink(whatsapp, makeMessage(cart, customer));
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

  return {
    state: {
      guestContact,
      placedOrder,
      customer,
      session,
      submitting,
      checkoutError,
    },
    actions: {
      setGuestContact,
      setPlacedOrder,
      setCustomer,
      send,
    },
    reset,
    clearCustomer: () => {
      setPlacedOrder(null);
      setCustomer(EMPTY_CUSTOMER);
    },
  };
}
