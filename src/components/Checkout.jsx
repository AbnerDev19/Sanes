import { Check, ArrowLeft, MessageCircle } from "lucide-react";
import { whatsappLink } from "../config";
import { useStoreSettings } from "../lib/storeSettings";
import { orderContactMessage } from "../lib/commerce";
import { todayBrazil, formatBrazilianPhone } from "../lib/checkout";
export default function Checkout({ state, actions }) {
  const { whatsapp } = useStoreSettings();
  const {
    guestContact,
    placedOrder,
    customer,
    session,
    submitting,
    authReady,
    checkoutError,
  } = state;
  const {
    setGuestContact,
    setCartOpen,
    setAccountView,
    setCart,
    setPlacedOrder,
    send,
    setCustomer,
    showAccount,
    setStep,
  } = actions;
  return guestContact ? (
    <section className="order-success">
      <h3>Orçamento preparado</h3>
      <p>
        O WhatsApp abrirá com os itens e seus dados. Envie a mensagem para
        solicitar atendimento. Como visitante, este orçamento não fica salvo no
        histórico.
      </p>
      <a
        className="btn primary full"
        href={guestContact}
        target="_blank"
        rel="noreferrer"
      >
        Abrir orçamento no WhatsApp
      </a>
      <button
        className="text-link full center"
        onClick={() => setGuestContact("")}
      >
        Voltar aos dados
      </button>
    </section>
  ) : placedOrder ? (
    <section className="order-success">
      <span className="success-check">
        <Check size={28} />
      </span>
      <h3>Pedido #{placedOrder.number} registrado!</h3>
      <p>
        Ele já está salvo na sua conta. Agora continue a conversa com a loja
        para confirmar valores, arte, prazo e pagamento.
      </p>
      <a
        className="btn primary full"
        href={whatsappLink(whatsapp, orderContactMessage(placedOrder))}
        target="_blank"
        rel="noreferrer"
      >
        Continuar atendimento no WhatsApp <MessageCircle size={18} />
      </a>
      <button
        className="text-link full center"
        onClick={() => {
          setCartOpen(false);
          setAccountView("account");
        }}
      >
        Ver meus pedidos
      </button>
      <button
        className="text-link full center"
        onClick={() => {
          setCart([]);
          setPlacedOrder(null);
          setCartOpen(false);
        }}
      >
        Iniciar novo carrinho
      </button>
      <small className="field-help">
        Pedido registrado não significa pagamento ou confirmação da compra.
        Anexe suas artes na conversa do WhatsApp.
      </small>
    </section>
  ) : (
    <form onSubmit={send}>
      <button className="text-link" type="button" onClick={() => setStep(1)}>
        <ArrowLeft size={15} /> Voltar aos brindes
      </button>
      <h3>Vamos nos conhecer?</h3>
      <p className="field-help">
        {session
          ? `Conectado como ${session.user.email}. O pedido ficará registrado na sua conta.`
          : "Envie o orçamento como visitante ou entre para registrar o pedido no seu histórico."}
      </p>
      <label>
        Seu nome *
        <input
          required
          maxLength={100}
          value={customer.name}
          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
        />
      </label>
      <label>
        Empresa
        <input
          maxLength={120}
          value={customer.company}
          onChange={(e) =>
            setCustomer({
              ...customer,
              company: e.target.value,
            })
          }
        />
      </label>
      <label>
        E-mail *
        <input
          type="email"
          autoComplete="email"
          required
          maxLength={150}
          readOnly={Boolean(session)}
          value={customer.email}
          onChange={(e) =>
            setCustomer({
              ...customer,
              email: e.target.value,
            })
          }
        />
      </label>
      <label>
        Telefone / WhatsApp *
        <input
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          maxLength={19}
          value={customer.phone}
          onChange={(e) =>
            setCustomer({
              ...customer,
              phone: formatBrazilianPhone(e.target.value),
            })
          }
        />
      </label>
      <label>
        Cidade de entrega
        <input
          autoComplete="address-level2"
          maxLength={120}
          value={customer.city}
          onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
        />
      </label>
      <label>
        Quando você precisa receber?
        <input
          type="date"
          min={todayBrazil()}
          value={customer.date}
          onChange={(e) => setCustomer({ ...customer, date: e.target.value })}
        />
      </label>
      <label>
        Algum detalhe especial?
        <textarea
          placeholder="Cidade de entrega, ocasião, prazo…"
          maxLength={1200}
          value={customer.notes}
          onChange={(e) =>
            setCustomer({
              ...customer,
              notes: e.target.value,
            })
          }
        />
      </label>
      {checkoutError && (
        <p className="error" role="alert">
          {checkoutError}
        </p>
      )}
      <button
        className="btn primary full"
        type="submit"
        disabled={submitting || !authReady}
      >
        {submitting
          ? "Registrando pedido…"
          : session
            ? "Registrar pedido"
            : "Solicitar orçamento pelo WhatsApp"}{" "}
        <MessageCircle size={18} />
      </button>
      <p className="field-help">
        {session
          ? "O pedido será salvo na sua conta antes do atendimento."
          : "Login opcional: entre para salvar o histórico dos pedidos."}{" "}
        Valores, prazo e compra são confirmados com a loja.
      </p>
      {!session && (
        <button
          className="text-link full center"
          type="button"
          onClick={showAccount}
        >
          Entrar ou criar conta para salvar histórico
        </button>
      )}
    </form>
  );
}
