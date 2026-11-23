# Sanes Brindes

Catálogo digital e sistema de pedidos personalizados da Sanes Brindes. O cliente navega pelo catálogo, escolhe quantidades, cores e modelos, anexa a logomarca e envia o pedido completo para o WhatsApp do Júnior. A equipe gerencia catálogo, pedidos e configurações em um painel administrativo.

- **Loja:** React 19 + Vite 6, publicada no GitHub Pages.
- **Backend:** Supabase (Auth, Postgres com RLS, funções RPC e Storage).
- **Sem backend configurado,** a loja continua funcionando: catálogo local e pedido pelo WhatsApp com anexo manual dos arquivos.

## Funcionalidades

**Loja**

- Catálogo com busca sem acento, abas de categoria, filtro por pedido mínimo, ordenação, destaques e página própria por produto (`#/produto/SB-104`), com galeria, cores e modelos.
- Personalização de cada item:
  - quantidade, respeitando o mínimo do produto;
  - uma ou mais cores, com divisão opcional da quantidade entre elas;
  - modelo ou variação e técnica de gravação;
  - observações;
  - até 5 logomarcas (PNG, JPG ou PDF, até 10 MB cada), com pré-visualização e opção de substituir ou remover.
- Carrinho com edição de itens, alteração de quantidade, remoção e observações gerais.
- Identificação simples: nome, empresa (opcional), telefone, cidade/UF e observações. Não exige conta.
- Finalização:
  1. as logomarcas vão para um bucket **privado** do Supabase;
  2. o pedido é registrado pela função `submit_order`, que valida tudo no servidor;
  3. o WhatsApp abre com a mensagem **NOVO PEDIDO — SANES BRINDES**, com links dos arquivos válidos por 30 dias e o link do pedido no painel.

  Se o registro falhar, o cliente pode enviar a mensagem sem registro e anexar os arquivos manualmente na conversa.
- Conta de cliente **opcional**, que guarda o histórico de pedidos.

**Painel (`#/admin`, só para a equipe)**

- **Pedidos:** busca, filtro e status; detalhes com links para ver e baixar as logomarcas.
- **Produtos:** criar, editar, excluir, fotos, cores, modelos, preço, ativar/desativar, destacar e ordenar.
- **Categorias:** criar, renomear, ocultar, ordenar e excluir.
- **Configurações:** número de WhatsApp que recebe os pedidos.

Guia de uso para a loja: [docs/GUIA-JUNIOR.md](docs/GUIA-JUNIOR.md).

## Desenvolvimento

```sh
npm ci
npm run dev
npm test                 # unitários + SQL (PGlite)
npm run test:responsive  # navegador (Playwright + axe)
npm run build
```

Os testes de navegador usam `/usr/bin/chromium` por padrão. Para usar outro navegador, defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ou rode com `CI=true` depois de `npx playwright install chromium`.

## Configuração (Supabase e GitHub)

O passo a passo completo está em **[supabase/GUIA-ABNER.md](supabase/GUIA-ABNER.md)**:

1. aplicar as migrações 001 a 004 no SQL Editor;
2. ligar o login anônimo, usado no upload das logomarcas de visitantes;
3. dar acesso de equipe ao Júnior;
4. importar o catálogo;
5. cadastrar as variáveis públicas no GitHub;
6. fazer o teste final.

Variáveis públicas, todas com prefixo `VITE_`, listadas em `.env.example`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `WHATSAPP`, `SITE_URL` e os dados da empresa. A build recusa chaves privilegiadas.

**Número do WhatsApp:**

- O número em uso fica na tabela `store_settings` e é alterado pelo painel.
- `VITE_WHATSAPP` e o valor em `src/config.js` são só reservas, usadas quando o banco não está disponível.
- Esses são os únicos lugares do código com o número.

## Organização

| Caminho | Conteúdo |
|---|---|
| `app/index.html` | HTML de origem. O `index.html` e a pasta `assets/` na raiz são **gerados** para o Pages |
| `src/main.jsx`, `src/App.jsx` | Entrada e composição da loja |
| `src/pages/`, `src/components/` | Telas e componentes (catálogo, produto, carrinho, checkout, conta) |
| `src/hooks/` | Rotas, foco de diálogos, filtros, formulário do produto, checkout |
| `src/lib/commerce.js` | Regras do carrinho e mensagem do pedido |
| `src/lib/orderSubmit.js` | Upload das logomarcas, `submit_order` e links temporários |
| `src/lib/attachments.js` | Arquivos guardados no navegador (IndexedDB) e verificação de tipo real |
| `src/lib/useCatalog.js`, `useStore.js`, `storeSettings.jsx` | Catálogo, sessão/carrinho e configurações da loja |
| `src/admin/` | Painel administrativo, carregado sob demanda |
| `supabase/migrations/` | Schema, RLS, Storage e funções (001 a 004) |
| `scripts/` | Importador do catálogo, checagem de produção, preparo do Pages e SEO |
| `tests/` | Unitários, SQL e navegador (`tests/browser/`, com Supabase simulado) |

## Segurança

- O cliente nunca envia preço nem status. `submit_order` recalcula tudo no servidor e não registra o mesmo pedido duas vezes, mesmo se o envio for repetido.
- Logomarcas:
  - ficam no bucket privado `order-files`, e cada visitante só grava e lê a própria pasta;
  - a equipe acessa por links temporários;
  - o bucket aceita só PNG, JPG ou PDF de até 10 MB;
  - o site confere a assinatura real do arquivo, não só a extensão;
  - há limite de 40 arquivos por dia e 10 pedidos por hora por visitante.
- Escrita no catálogo, nas categorias e nas configurações é permitida só a `store_members` com conta não anônima.

## Publicação no Pages

`.github/workflows/pages.yml` compila e publica `dist/` quando a variável `PAGES_ACTIONS_ENABLED` é `true` (recomendado; veja o guia). No modo legado, o workflow exige que `index.html` e `assets/` da raiz correspondam ao build atual: `npm run build:pages` atualiza esses arquivos.

## Estado do catálogo

- 111 produtos em seis categorias. 24 têm foto real; os demais mostram "Foto em breve".
- Não há preços inventados: aparece "Sob consulta" até a loja cadastrar um preço.
- Cores, modelos e fotos novas são cadastrados pelo painel.
- O PDF "SUGESTÕES DE BRINDES 2026" ainda não foi importado (passou do limite de envio) e está registrado em `catalog/import-report.json`. Enquanto isso, `npm run build:production` continua bloqueado de propósito.
- A FAQ está marcada como provisória (`FAQ_REVIEW_PENDING` em `src/business.js`).
