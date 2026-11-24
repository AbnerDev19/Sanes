import { formatWhatsapp, whatsappLink } from "../config";
import { useStoreSettings } from "../lib/storeSettings";

export default function LegalPage({ privacy }) {
  const { whatsapp } = useStoreSettings();
  return (
    <article className="wrap account-page legal-page">
      <h1>{privacy ? "Política de Privacidade" : "Termos de uso"}</h1>
      <p>
        <strong>Minuta sujeita à revisão jurídica.</strong>
      </p>
      {privacy ? (
        <>
          <h2>Dados e finalidade</h2>
          <p>
            Usamos nome, telefone, cidade, estado, e-mail opcional e arquivos de
            personalização para registrar o pedido de orçamento, preparar a arte
            e responder ao atendimento. O cadastro opcional permite consultar
            pedidos anteriores.
          </p>
          <h2>Compartilhamento e retenção</h2>
          <p>
            O Supabase armazena contas, pedidos e arquivos em ambiente com
            acesso controlado. Se você abrir a conversa, o WhatsApp recebe os
            dados incluídos na mensagem que você enviar. O prazo de retenção de
            pedidos e arquivos será confirmado pela Sanes conforme a finalidade
            do tratamento e as obrigações legais aplicáveis.
          </p>
          <h2>Seus direitos</h2>
          <p>
            Você pode solicitar confirmação do tratamento, acesso, correção ou
            exclusão dos seus dados, conforme a LGPD. Para exercer seus
            direitos, fale com a Sanes pelo{" "}
            <a href={whatsappLink(whatsapp)}>
              WhatsApp {formatWhatsapp(whatsapp)}
            </a>
            .
          </p>
        </>
      ) : (
        <>
          <h2>Solicitação de orçamento</h2>
          <p>
            O catálogo permite personalizar brindes e solicitar um orçamento.
            Preço, disponibilidade, pedido mínimo, frete, prazo, arte e
            pagamento são confirmados pela equipe no atendimento.
          </p>
          <h2>Envio de arquivos</h2>
          <p>
            Envie somente materiais que você tenha autorização para usar e os
            dados necessários para o orçamento. A Sanes poderá pedir outra
            versão da arte antes de produzir.
          </p>
          <p>
            Consulte também a{" "}
            <a href="#/privacidade">Política de Privacidade</a>.
          </p>
        </>
      )}
    </article>
  );
}
