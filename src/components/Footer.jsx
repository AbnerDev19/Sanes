import Brand from "./Brand";
import { BUSINESS_DETAILS, DEVELOPMENT_CREDITS } from "../business";
import { formatWhatsapp, whatsappLink } from "../config";
import { useStoreSettings } from "../lib/storeSettings";

export default function Footer() {
  const { whatsapp } = useStoreSettings();
  const details = [
    ["Razão social", BUSINESS_DETAILS.legalName],
    ["Nome fantasia", BUSINESS_DETAILS.tradeName],
    ["CNPJ", BUSINESS_DETAILS.cnpj],
    ["Endereço", BUSINESS_DETAILS.address],
    ["Telefone", <a href="tel:+556133447389">{BUSINESS_DETAILS.phone}</a>],
    [
      "WhatsApp",
      <a href={whatsappLink(whatsapp)} target="_blank" rel="noreferrer">
        {formatWhatsapp(whatsapp)}
      </a>,
    ],
    ["Horário", BUSINESS_DETAILS.hours],
    [
      "E-mail",
      BUSINESS_DETAILS.email && (
        <a href={`mailto:${BUSINESS_DETAILS.email}`}>
          {BUSINESS_DETAILS.email}
        </a>
      ),
    ],
    ["Situação cadastral", BUSINESS_DETAILS.registrationStatus],
    ["Data de abertura", BUSINESS_DETAILS.openedOn],
    ["Atividade principal", BUSINESS_DETAILS.activity],
  ];

  return (
    <footer className="wrap">
      <div className="footer-top">
        <Brand />
        <a href="#inicio">Voltar ao topo ↑</a>
      </div>
      <nav className="footer-links" aria-label="Links do rodapé">
        <a href="#/conta">Área do comprador</a>
        <a href="#/admin">Painel administrativo</a>
        <a href="#/privacidade">Política de Privacidade</a>
        <a href="#/termos">Termos de uso</a>
        <a href="#faq">Dúvidas frequentes</a>
      </nav>
      <dl className="business-details">
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Sanes Brindes. Todos os direitos
          reservados.
        </span>
        <span>Desenvolvimento por {DEVELOPMENT_CREDITS}</span>
      </div>
    </footer>
  );
}
