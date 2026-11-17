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

O carrinho de visitante é separado dos carrinhos das contas. O pedido é salvo no banco antes de oferecer o contato pelo WhatsApp. Artes selecionadas são referências de nome; o arquivo é anexado pelo cliente na conversa com a loja. Valores, arte, frete, prazo e pagamento são confirmados pela equipe.

### Publicação automática no Pages

O workflow `.github/workflows/pages.yml` compila o código atual e publica `dist/` quando a variável do repositório `PAGES_ACTIONS_ENABLED` é `true`. Para ativar: em **Settings → Pages → Source**, selecione **GitHub Actions**, e em **Settings → Secrets and variables → Actions → Variables**, defina `PAGES_ACTIONS_ENABLED=true`. As variáveis públicas opcionais são `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_WHATSAPP` e `VITE_SITE_URL`; nunca use uma chave privilegiada.

A integração desta conversa recebe HTTP 403 ao tentar alterar a configuração do Pages. Enquanto o modo legado continuar ativo, o workflow verifica que `index.html` e `assets/` correspondem ao build atual, para impedir divergências silenciosas. `npm run build:pages` atualiza esses arquivos para publicação legada.
