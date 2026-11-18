import { FAQ_ITEMS, FAQ_REVIEW_PENDING } from "../business";
export default function FAQ() {
  return (
    <section id="faq" className="faq wrap">
      <div className="eyebrow">DÚVIDAS FREQUENTES</div>
      <h2>Antes de escolher seu brinde.</h2>
      {FAQ_REVIEW_PENDING && (
        <p className="faq-review">
          Respostas provisórias — conteúdo genérico pendente de revisão pela
          Sanes.
        </p>
      )}
      {FAQ_ITEMS.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </section>
  );
}
