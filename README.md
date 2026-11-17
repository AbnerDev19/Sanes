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

## Publicação no GitHub Pages

O código-fonte HTML fica em `app/index.html`. O `index.html` da raiz e a pasta `assets/` são a versão compilada para o GitHub Pages, que está configurado para publicar a branch `main` na raiz.

Depois de editar o código:

```sh
npm ci
npm test
npm run build:pages
git add app src public scripts package.json package-lock.json vite.config.js index.html assets .nojekyll
git commit -m "Atualiza catálogo"
git push
```

Use `npm run dev` para desenvolvimento. Não edite os arquivos gerados em `assets/` nem o `index.html` da raiz manualmente. `base: './'` e `import.meta.env.BASE_URL` mantêm JS, CSS e imagens acessíveis em `/Sanes/` e em outras pastas. A integração atual não permite alterar Settings → Pages, por isso esta estrutura preserva a publicação existente sem exigir uma mudança manual nas configurações.

O workflow de CI valida testes e build e disponibiliza o pacote compilado como artifact; a publicação atual ocorre pelo push dos arquivos gerados.

## Movimento e scroll reveal

`useScrollReveal` revela cartões e seções ao entrarem na tela, com pequeno intervalo entre os produtos. Novos resultados de filtros e do botão de carregar mais também são observados. Hero com AnimatedContent e gradiente, faíscas nos cliques, realce dos cartões e entrada de itens do carrinho completam as animações. A preferência de movimento reduzido é respeitada. O reveal mantém o conteúdo visível quando as APIs de animação não estão disponíveis.

### Títulos React Bits

Os componentes originais dos anexos agora estão ativos: `StrokeText` desenha e preenche o título “Sua marca.” (com redesenho ao passar o mouse), `TechText` anima “Escolhas que marcam.” com montagem e contornos interativos, e `GradientText` mantém o gradiente animado de “presente.” e da seção de personalização. Os componentes respeitam a preferência de movimento reduzido.

## Responsividade

As regras de adaptação estão em `src/responsive.css`: menu de celular/tablet abaixo de 1024 px, seções empilhadas abaixo de 768 px, catálogo em duas colunas no celular e uma coluna até 380 px. Formulários usam fonte de 16 px no celular, botões principais têm área de toque de pelo menos 44 px e os painéis respeitam a altura dinâmica e as áreas seguras da tela.

Validação automatizada do catálogo, busca, menu, personalização, quantidade e formulário do orçamento em 320, 360, 390, 430, 768, 1024 e 1440 px:

```sh
npx playwright install chromium
npm run test:responsive
```

O runner local usa `/usr/bin/chromium` quando disponível; em outras máquinas, informe `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ou execute com `CI=true` para usar o navegador instalado pelo Playwright. Os testes não enviam mensagens pelo WhatsApp.

As fontes DM Sans e Manrope são distribuídas junto com o site via Fontsource, com licenças OFL em `public/assets/font-licenses/`. O carregamento da interface não depende do Google Fonts.
