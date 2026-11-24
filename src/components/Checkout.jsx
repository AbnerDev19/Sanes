import CheckoutCaptcha from "./CheckoutCaptcha";
import {
  Check,
  ArrowLeft,
  MessageCircle,
  Paperclip,
  ShieldCheck,
} from "lucide-react";
import { UFS, formatBrazilianPhone } from "../lib/checkout";
import { supabaseConfigured } from "../lib/supabase";

function Field({ id, label, error, hint, children }) {
  return (
    <label htmlFor={id} className={error ? "invalid" : ""}>
      {label}
      {hint && <small>{hint}</small>}
      {children}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

function Success({ checkout, onClose }) {
  const { result } = checkout;
  return (
    <section className="order-success" aria-live="polite">
      <span className="success-check">
        <Check size={28} />
      </span>
      <h3>
        {result.saved
          ? `Pedido #${result.number} pronto para envio`
          : "Pedido pronto para envio"}
      </h3>
      <p>
        Toque no botão abaixo: o WhatsApp da Sanes abre com um resumo do pedido
        já escrito. É só enviar a mensagem.
      </p>
      <a
        className="btn primary full"
        href={result.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        Enviar pedido pelo WhatsApp <MessageCircle size={18} />
      </a>
      {result.manualFiles > 0 ? (
        <p className="attach-reminder" role="note">
          <Paperclip size={16} aria-hidden="true" />
          <span>
            <strong>Não esqueça das logomarcas:</strong> o WhatsApp não anexa
            arquivos automaticamente. Depois de enviar a mensagem, anexe{" "}
            {result.manualFiles === 1
              ? "o arquivo"
              : `os ${result.manualFiles} arquivos`}{" "}
            na mesma conversa (ícone de clipe).
          </span>
        </p>
      ) : (
        result.saved && (
          <p className="field-help">
            A equipe acessa suas logomarcas pelo pedido no painel.
          </p>
        )
      )}
      <button
        className="text-link full center"
        onClick={() => {
          checkout.startOver();
          onClose();
        }}
      >
        Já enviei · iniciar novo pedido
      </button>
      <small className="field-help">
        Pedido enviado não significa compra confirmada: a Sanes retorna com
        valores, arte, prazo e pagamento.
      </small>
    </section>
  );
}

export default function Checkout({
  checkout,
  session,
  showAccount,
  onBack,
  onClose,
  missingFiles,
}) {
  const { customer, setCustomer, fieldErrors: errors, error } = checkout;
  if (checkout.result) return <Success checkout={checkout} onClose={onClose} />;
  const field = (name) => ({
    id: `customer-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `customer-${name}-error` : undefined,
    value: customer[name],
    onChange: (e) => setCustomer({ ...customer, [name]: e.target.value }),
  });
  return (
    <form onSubmit={checkout.send} noValidate>
      <button className="text-link" type="button" onClick={onBack}>
        <ArrowLeft size={15} /> Voltar aos brindes
      </button>
      <h3>Para quem é o pedido?</h3>
      <p className="field-help">
        {session
          ? `Conectado como ${session.user.email}. O pedido também fica no seu histórico.`
          : "Sem cadastro: só precisamos de um contato para o atendimento."}
      </p>
      <Field id="customer-name" label="Nome completo *" error={errors.name}>
        <input
          {...field("name")}
          autoComplete="name"
          required
          maxLength={100}
        />
      </Field>
      <Field id="customer-company" label="Empresa" hint="opcional">
        <input
          {...field("company")}
          autoComplete="organization"
          maxLength={120}
        />
      </Field>
      <Field
        id="customer-phone"
        label="Telefone / WhatsApp *"
        error={errors.phone}
      >
        <input
          {...field("phone")}
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          required
          maxLength={16}
          placeholder="(61) 98133-3737"
          onChange={(e) =>
            setCustomer({
              ...customer,
              phone: formatBrazilianPhone(e.target.value),
            })
          }
        />
      </Field>
      <div className="form-row city-row">
        <Field id="customer-city" label="Cidade *" error={errors.city}>
          <input
            {...field("city")}
            autoComplete="address-level2"
            required
            maxLength={120}
          />
        </Field>
        <Field id="customer-state" label="Estado *" error={errors.state}>
          <select {...field("state")} autoComplete="address-level1" required>
            <option value="">UF</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="customer-extra" label="Observações adicionais" hint="opcional">
        <textarea
          {...field("extra")}
          maxLength={700}
          placeholder="Melhor horário para contato, CNPJ para orçamento…"
        />
      </Field>
      {checkout.fileCount > 0 && (
        <p className="secure-note">
          {supabaseConfigured ? (
            <>
              <ShieldCheck size={16} aria-hidden="true" />
              {checkout.fileCount === 1
                ? "1 logomarca será enviada"
                : `${checkout.fileCount} logomarcas serão enviadas`}{" "}
              para o pedido no painel da Sanes.
            </>
          ) : (
            <>
              <Paperclip size={16} aria-hidden="true" />
              Depois de abrir o WhatsApp, anexe{" "}
              {checkout.fileCount === 1
                ? "a logomarca"
                : `as ${checkout.fileCount} logomarcas`}{" "}
              na conversa.
            </>
          )}
        </p>
      )}
      {checkout.needsCaptcha && (
        <CheckoutCaptcha
          siteKey={checkout.captchaSiteKey}
          onToken={checkout.setCaptchaToken}
          attempt={checkout.captchaAttempt}
        />
      )}
      {missingFiles > 0 && (
        <p className="error" role="alert">
          Algum arquivo anexado não está neste aparelho. Volte aos brindes,
          edite o item e anexe novamente.
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          <p>{error.message}</p>
          {error.canFallback && (
            <button
              type="button"
              className="btn outline full"
              onClick={checkout.openManual}
            >
              Enviar pelo WhatsApp sem registrar (anexo os arquivos na conversa)
            </button>
          )}
        </div>
      )}
      <p className="field-help">
        Ao finalizar, você concorda com o uso dos dados e arquivos para atender
        seu pedido de orçamento. Leia a{" "}
        <a href="#/privacidade" target="_blank" rel="noopener noreferrer">
          Política de Privacidade
        </a>{" "}
        e os{" "}
        <a href="#/termos" target="_blank" rel="noopener noreferrer">
          Termos de uso
        </a>
        .
      </p>
      <button
        className="btn primary full"
        type="submit"
        disabled={checkout.submitting || missingFiles > 0}
      >
        {checkout.submitting
          ? checkout.progress || "Enviando…"
          : "Finalizar pedido"}{" "}
        <MessageCircle size={18} />
      </button>
      {checkout.submitting && (
        <p className="sr-only" role="status">
          {checkout.progress}
        </p>
      )}
      <p className="field-help">
        Ao finalizar, o WhatsApp da Sanes abre com um resumo do pedido. Valores,
        prazo e pagamento são combinados no atendimento.
      </p>
      {!session && supabaseConfigured && (
        <button
          className="text-link full center"
          type="button"
          onClick={showAccount}
        >
          Tem conta? Entre para guardar o histórico (opcional)
        </button>
      )}
    </form>
  );
}
