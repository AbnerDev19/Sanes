import Brand from "./Brand";
import { ArrowUpRight, UserRound, ShoppingBag, Menu, X } from "lucide-react";
import { WHATSAPP as WA } from "../config";
export default function Header({
  session,
  showAccount,
  cart,
  mobile,
  setMobile,
  setAccountView,
  setCartOpen,
  setStep,
}) {
  return (
    <>
      <div id="inicio" className="topline">
        <span>Feito para sua marca. Pensado para durar.</span>
        <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">
          Atendimento personalizado <ArrowUpRight size={12} />
        </a>
      </div>
      <header>
        <div className="nav wrap">
          <Brand />
          <nav aria-label="Navegação principal">
            <a href="#catalogo">Catálogo</a>
            <a href="#personalizacao">Personalização</a>
            <a href="#sobre">A Sanes</a>
            <a href="#contato">
              Fale com a gente <ArrowUpRight size={13} />
            </a>
          </nav>
          <div className="nav-actions">
            <button
              className="account-action"
              aria-label={session ? "Minha conta" : "Entrar na conta"}
              onClick={showAccount}
            >
              <UserRound size={18} />
              <span>{session ? "Minha conta" : "Entrar"}</span>
            </button>
            <button
              className="bag"
              aria-label={`Meu carrinho ${cart.length}`}
              onClick={() => {
                setAccountView(null);
                setCartOpen(true);
                setStep(1);
              }}
            >
              <ShoppingBag size={18} />
              <span className="bag-label">Meu carrinho</span>{" "}
              <b>{cart.length}</b>
            </button>
            <button
              className="mobile-menu icon"
              aria-label={mobile ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobile}
              aria-controls="mobile-navigation"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {mobile && (
          <nav
            id="mobile-navigation"
            className="mobile-links"
            aria-label="Navegação no celular"
          >
            <a onClick={() => setMobile(false)} href="#catalogo">
              Catálogo
            </a>
            <a onClick={() => setMobile(false)} href="#personalizacao">
              Personalização
            </a>
            <a onClick={() => setMobile(false)} href="#sobre">
              A Sanes
            </a>
            <a onClick={() => setMobile(false)} href="#contato">
              Fale com a gente
            </a>
          </nav>
        )}
      </header>
    </>
  );
}
