// Fill these only with verified company data. Empty fields stay hidden.
export const BUSINESS_DETAILS = {
  address: import.meta.env?.VITE_BUSINESS_ADDRESS || "",
  cnpj: import.meta.env?.VITE_BUSINESS_CNPJ || "",
  hours: import.meta.env?.VITE_BUSINESS_HOURS || "",
  email: import.meta.env?.VITE_BUSINESS_EMAIL || "",
};
export const FAQ_REVIEW_PENDING = true;
export const FAQ_ITEMS = [
  {
    question: "Qual é o prazo de entrega?",
    answer:
      "O prazo depende do produto, da quantidade, da personalização e do destino. A equipe confirma a previsão durante o atendimento, antes da compra.",
  },
  {
    question: "Qual é o pedido mínimo?",
    answer:
      "O pedido mínimo varia conforme o produto. Consulte a informação do item; quando aparecer “a confirmar”, peça a quantidade mínima à equipe antes de fechar o pedido.",
  },
  {
    question: "Em qual formato devo enviar a arte?",
    answer:
      "Envie a referência e confirme o formato ideal com a equipe. Um PDF vetorial ou uma imagem em boa resolução pode ajudar na avaliação. O arquivo deve ser anexado na conversa do WhatsApp.",
  },
  {
    question: "Quais técnicas de gravação estão disponíveis?",
    answer:
      "A técnica depende do material e do resultado desejado. As opções mostradas no site são preferências para consulta; a equipe confirma a técnica compatível e aprova a arte antes da produção.",
  },
];
