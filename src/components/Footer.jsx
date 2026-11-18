import Brand from "./Brand";
import { BUSINESS_DETAILS } from "../business";
export default function Footer() {
  return (
    <footer className="wrap">
      <div className="footer-top">
        <Brand />
        <p>
          Especialista em brindes.
          <br />
          Presente na sua história.
        </p>
        <a className="text-link" href="#faq">
          Dúvidas frequentes
        </a>
        <a href="#inicio">Voltar ao topo ↑</a>
      </div>
      {Object.values(BUSINESS_DETAILS).some(Boolean) && (
        <dl className="business-details">
          {[
            ["address", "Endereço"],
            ["cnpj", "CNPJ"],
            ["hours", "Horário"],
            ["email", "E-mail"],
          ].map(
            ([key, label]) =>
              BUSINESS_DETAILS[key] && (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {key === "email" ? (
                      <a href={`mailto:${BUSINESS_DETAILS[key]}`}>
                        {BUSINESS_DETAILS[key]}
                      </a>
                    ) : (
                      BUSINESS_DETAILS[key]
                    )}
                  </dd>
                </div>
              ),
          )}
        </dl>
      )}
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Sanes Brindes. Todos os direitos
          reservados.
        </span>
        <span>
          Catálogo sob encomenda · Valores e disponibilidade sob consulta.
        </span>
      </div>
    </footer>
  );
}
