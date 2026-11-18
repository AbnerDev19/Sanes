# Sanes Brindes

Catálogo React/Vite para brindes personalizados, preparado para Supabase Auth, catálogo, carrinhos por cliente, pedidos e atendimento da loja via WhatsApp.

## Desenvolvimento

```sh
npm ci
npm run dev
npm test
npm run test:responsive
npm run build
```

O runner de navegador local usa `/usr/bin/chromium`. Para usar o navegador do Playwright, execute `npx playwright install chromium` e rode os testes com `CI=true`; também é possível definir `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Supabase e produção

Siga [supabase/README.md](supabase/README.md) para migração, importação, autenticação, equipe e publicação. O segundo PDF fornecido ainda está pendente porque excede o limite de transferência; o cadastro remoto também depende da conexão confirmada com o projeto. **Não foi concluída uma importação no Supabase nem ativado login em produção nesta etapa.**

```sh
npm run catalog:import
npm run build:production
```

O build de produção exige as configurações públicas reais e recusa publicar enquanto o catálogo fornecido estiver incompleto. O catálogo consolidado de desenvolvimento contém 111 produtos, dos quais 24 têm imagem do PDF de lançamentos. Os preços seguem sob consulta, sem valores inventados. A logo foi preservada.

## Arquivos principais

- `catalog/products.json`: base consolidada e referência aos PDFs.
- `catalog/import-report.json`: relatório de importação e pendências.
- `supabase/migrations/`: schema, RLS e funções de pedidos.
- `scripts/import-supabase.mjs`: importador privado de produtos e imagens.
- `src/lib/useStore.js`: catálogo, sessão e sincronização de carrinhos.
- `src/lib/commerce.js`: normalização do carrinho e mensagem de atendimento.
- `src/components/AuthPanel.jsx` e `AccountPanel.jsx`: conta e histórico/atendimento.
- `src/main.jsx`: interface, personalização e finalização.
- `src/responsive.css` e `commerce.css`: adaptações para celular e novos fluxos.
- `app/index.html`: HTML fonte. O `index.html` da raiz e `assets/` são gerados para o Pages.

O visitante pode solicitar orçamento com nome, e-mail e telefone diretamente pelo WhatsApp, sem login e sem gravar pedido anônimo no banco. O login é opcional para salvar histórico; nesse fluxo, o pedido é validado e salvo no servidor antes do contato. O carrinho de visitante é separado dos carrinhos das contas. Artes selecionadas são referências de nome; o arquivo é anexado pelo cliente na conversa com a loja. Valores, arte, frete, prazo e pagamento são confirmados pela equipe.

### Publicação automática no Pages

O workflow `.github/workflows/pages.yml` compila o código atual e publica `dist/` quando a variável do repositório `PAGES_ACTIONS_ENABLED` é `true`. Para ativar: em **Settings → Pages → Source**, selecione **GitHub Actions**, e em **Settings → Secrets and variables → Actions → Variables**, defina `PAGES_ACTIONS_ENABLED=true`. As variáveis públicas opcionais são `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_WHATSAPP` e `VITE_SITE_URL`; nunca use uma chave privilegiada.

A integração desta conversa recebe HTTP 403 ao tentar alterar a configuração do Pages. Enquanto o modo legado continuar ativo, o workflow verifica que `index.html` e `assets/` correspondem ao build atual, para impedir divergências silenciosas. `npm run build:pages` atualiza esses arquivos para publicação legada.

## Revisão para publicação

As seis prioridades foram implementadas, com testes unitários, SQL local, acessibilidade automatizada e fluxos de navegador. Esses testes não equivalem a uma certificação WCAG nem à validação de um Supabase remoto.

- 111 produtos em seis categorias; 24 imagens WebP reais (largura máxima 804px) e 87 placeholders “Foto em breve”. Não há preços inventados.
- Orçamento como visitante funciona sem Supabase. Para conta e histórico, configure o projeto e aplique as duas migrações em ordem.
- `npm run build:pages` gera o catálogo publicável e atualiza HTML, assets, favicon, robots e sitemap da raiz. O comando estrito `build:production` continua exigindo a conclusão da importação remota e do PDF pendente.
- Configure `VITE_WHATSAPP` e `VITE_SITE_URL` conforme o ambiente. Endereço, CNPJ, horário e e-mail ficam vazios em `.env.example`; preencha somente dados confirmados.
- A FAQ está marcada na interface como conteúdo provisório para revisão. Após revisar as respostas em `src/business.js`, altere `FAQ_REVIEW_PENDING`.
- Links de produto usam `#/produto/SB-104`. O compartilhamento abre o produto, mas a prévia social e o sitemap usam a página geral: robôs não recebem HTML exclusivo por hash.
- A arte não é transmitida pelo site: o cliente deve anexá-la no WhatsApp.
