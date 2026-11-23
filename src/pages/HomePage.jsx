import { ShieldCheck, Sparkles, Package, Truck } from "lucide-react";
import Hero from "../components/Hero";
import CatalogSection from "../components/CatalogSection";
import MarketingSections from "../components/MarketingSections";
import FAQ from "../components/FAQ";

const BENEFITS = [
  [ShieldCheck, "Cuidado em cada acabamento"],
  [Sparkles, "Personalização sob medida"],
  [Package, "Pedidos para sua empresa"],
  [Truck, "Entrega em todo o Brasil"],
];

export default function HomePage({ reducedMotion, catalog }) {
  return (
    <>
      <Hero reducedMotion={reducedMotion} />
      <section className="benefits">
        <div className="wrap">
          {BENEFITS.map(([Icon, label]) => (
            <span key={label}>
              <Icon />
              {label}
            </span>
          ))}
        </div>
      </section>
      <CatalogSection reducedMotion={reducedMotion} {...catalog} />
      <MarketingSections />
      <FAQ />
    </>
  );
}
