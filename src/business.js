export const BUSINESS_DETAILS = {
  legalName: "Sanes Mais Comercial de Brindes e Servicos Graficos LTDA",
  tradeName: "Sanes",
  cnpj: import.meta.env?.VITE_BUSINESS_CNPJ || "11.893.105/0001-33",
  address:
    import.meta.env?.VITE_BUSINESS_ADDRESS ||
    "Setor de Indústrias Gráficas, Quadra 06, 1205 — Zona Industrial, Brasília/DF, CEP 70.610-460",
  phone: "(61) 3344-7389",
  registrationStatus: "Ativa",
  openedOn: "29/04/2010",
  activity: "Impressão de material para uso publicitário (CNAE 18.13-0-01)",
  hours: import.meta.env?.VITE_BUSINESS_HOURS || "",
  email: import.meta.env?.VITE_BUSINESS_EMAIL || "",
};
export const DEVELOPMENT_CREDITS =
  import.meta.env?.VITE_DEVELOPMENT_CREDITS ||
  "Abner Oliveira e Matheus Rodrigues";
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
