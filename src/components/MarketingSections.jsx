import { ArrowUpRight, MessageCircle } from "lucide-react";
import GradientText from "./GradientText";
import { whatsappLink } from "../config";
import { useStoreSettings } from "../lib/storeSettings";
export default function MarketingSections() {
  const { whatsapp } = useStoreSettings();
  return (
    <>
      <section className="personalization wrap" id="personalizacao">
        <div className="personal-art" data-reveal>
          <span className="eyebrow">O DETALHE MUDA TUDO</span>
          <div className="sample-notebook">
            <div className="notebook-band" />
            <span>
              SUA
              <br />
              MARCA<span>é o que fica.</span>
            </span>
          </div>
          <span className="art-bottom">
            DA SUA IDEIA PARA O MUNDO REAL <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="personal-copy" data-reveal data-reveal-delay="100">
          <div className="eyebrow">PERSONALIZAÇÃO SANES</div>
          <h2>
            Um brinde.
            <br />
            <GradientText
              colors={["#775707", "#805c08", "#654800"]}
              animationSpeed={8}
            >
              Infinitas possibilidades.
            </GradientText>
          </h2>
          <p>
            Mais do que aplicar um logo, é dar forma à sua identidade. Conte sua
            ideia e encontre o acabamento ideal com a nossa equipe.
          </p>
          <div className="process">
            {[
              [
                "01",
                "Escolha o seu brinde",
                "Encontre o produto que combina com o seu momento.",
              ],
              [
                "02",
                "Deixe com a sua cara",
                "Defina quantidade, cor e detalhes da personalização.",
              ],
              [
                "03",
                "Vamos criar juntos",
                "Envie seu orçamento e alinhe a arte com a nossa equipe.",
              ],
            ].map(([n, t, d]) => (
              <div key={n} data-reveal>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
          <a href="#catalogo" className="text-link">
            Começar meu projeto <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <section className="about wrap" id="sobre" data-reveal>
        <div className="eyebrow">PRAZER, SOMOS A SANES</div>
        <h2>
          Grandes relações começam
          <br />
          com um <span>pequeno gesto.</span>
        </h2>
        <p>
          Acreditamos no poder de um presente bem escolhido. Por isso, ajudamos
          sua empresa a transformar objetos do dia a dia em conexões que ficam.
        </p>
        <div className="about-tags">
          <span>Atendimento de perto</span>
          <span>Identidade em cada detalhe</span>
          <span>De Brasília para o Brasil</span>
        </div>
      </section>
      <section className="contact wrap" id="contato" data-reveal>
        <div>
          <div className="eyebrow">VAMOS TIRAR SUA IDEIA DO PAPEL?</div>
          <h2>
            O próximo brinde
            <br />
            pode ser <em>inesquecível.</em>
          </h2>
        </div>
        <div>
          <a
            className="btn gold"
            href={whatsappLink(
              whatsapp,
              "Olá! Quero criar um projeto personalizado com a Sanes Brindes.",
            )}
            target="_blank"
            rel="noreferrer"
          >
            Vamos conversar <ArrowUpRight size={19} />
          </a>
          <p>
            <MessageCircle size={13} /> Atendimento humano, do início ao fim.
          </p>
        </div>
      </section>
    </>
  );
}
