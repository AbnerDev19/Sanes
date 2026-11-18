import Brand from "./Brand";
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
        <a href="#inicio">Voltar ao topo ↑</a>
      </div>
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
