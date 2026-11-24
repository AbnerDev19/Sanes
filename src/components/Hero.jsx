import { appPath } from "../lib/routes";
import {
  ArrowUpRight,
  ArrowRight,
  Package,
  Sparkles,
  Truck,
} from "lucide-react";
import AnimatedContent from "./AnimatedContent";
import GradientText from "./GradientText";
import StrokeText from "./StrokeText";
import IMG from "./ProductImage";
export default function Hero({ reducedMotion }) {
  return (
    <section className="hero wrap">
      <AnimatedContent
        key={String(reducedMotion)}
        trigger="mount"
        distance={45}
        duration={1}
        stagger={0.12}
      >
        <div className="eyebrow">
          <span className="dot" /> OBJETOS QUE CRIAM CONEXÕES
        </div>
        <h1 aria-label="Sua marca. Sempre presente.">
          <span className="hero-stroke" aria-hidden="true">
            <StrokeText
              key={String(reducedMotion)}
              text="Sua marca."
              fontFamily="Manrope Variable, sans-serif"
              fontSize={76}
              fontWeight={650}
              letterSpacing={-4}
              strokeColor="#775707"
              fillColor="#252629"
              drawDuration={1.5}
              fillDelay={0.15}
              stagger={0.055}
              fillMode="wipe"
              trigger="mount"
              hoverRedraw
            />
          </span>
          <span className="hero-rest" aria-hidden="true">
            Sempre{" "}
            <GradientText
              className="hero-gradient"
              colors={["#775707", "#805c08", "#654800"]}
              animationSpeed={5}
            >
              presente.
            </GradientText>
          </span>
        </h1>
        <p>
          Transforme brindes em boas lembranças.
          <br />
          Design, cuidado e personalização em cada detalhe.
        </p>
        <div className="hero-actions">
          <a className="btn primary" href={appPath("#catalogo")}>
            Encontre seu brinde <ArrowUpRight size={17} />
          </a>
          <a className="text-link" href={appPath("#personalizacao")}>
            Do seu jeito <ArrowRight size={16} />
          </a>
        </div>
        <div className="hero-proof">
          <span className="mini-icons">
            <Package size={15} />
            <Sparkles size={15} />
            <Truck size={15} />
          </span>
          <span>Da primeira ideia à entrega. A gente cuida.</span>
        </div>
      </AnimatedContent>
      <div className="hero-visual" data-reveal>
        <div className="visual-label">
          <span className="dot" /> SELEÇÃO CORPORATIVA
        </div>
        <div className="hero-orbit" />
        <IMG hero />
        <div className="floating-note">
          <span className="note-icon">
            <Sparkles size={18} />
          </span>
          <div>
            Sua identidade, em cada detalhe.
            <small>Personalização feita para sua empresa.</small>
          </div>
        </div>
        <span className="image-note">Composição ilustrativa</span>
      </div>
    </section>
  );
}
