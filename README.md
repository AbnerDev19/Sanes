# Sanes Brindes

Catálogo corporativo em React + Vite, com 103 produtos da base original, filtros, busca, personalização por item, carrinho local e solicitação de orçamento via WhatsApp.

## Executar

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

O resultado está em `dist/`. Hospedagem estática, sem backend ou pagamento integrado. O carrinho fica no navegador. Nenhum orçamento é registrado em servidor. A abertura do WhatsApp exige que o visitante confirme o envio.

## Editar conteúdo

- `src/products.js`: catálogo, pedidos mínimos e caminhos para fotos reais.
- `src/main.jsx`: interface e número de WhatsApp (`WA`). Usamos 5561981333737 do config original; o design tem outro número, que precisa ser validado antes do lançamento público.
- `src/order.js`: regras da quantidade e mensagem do orçamento.
- `src/style.css`: identidade visual e responsividade.
- `public/assets/`: imagens ilustrativas extraídas do design enviado. Não representam os modelos exatos; substituir pelas fotografias reais antes de usar comercialmente.

A identidade usa um símbolo vetorial aproximado da marca. Substituir pelo arquivo oficial da logo em SVG/PNG quando disponível como asset.

As cores e técnicas de personalização são preferências, sujeitas à confirmação. Referências selecionadas não são enviadas nem armazenadas: o nome é incluído no carrinho e o arquivo deve ser anexado pelo cliente na conversa do WhatsApp. Dados de contato existem apenas durante a sessão e são incluídos na mensagem.

## Animações

Componentes AnimatedContent, ClickSpark e GradientText extraídos dos arquivos React Bits fornecidos. Os outros anexos foram mantidos como referência; não são todos aplicáveis ao fluxo atual. Movimento reduzido é respeitado pelo CSS e pelos componentes quando disponível. BorderGlow está disponível no código para evolução.

## GitHub

Para criar um repositório privado após autorizar a permissão de criação:

```sh
gh repo create AbnerDev19/sanes-brindes --private --source . --remote github --push
```

Não incluir node_modules, dist, credenciais ou arquivos .env.
