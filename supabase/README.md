# Ativação do catálogo, contas e pedidos

A implementação está preparada para um projeto Supabase. Nenhum projeto remoto foi alterado sem conexão confirmada. A ativação precisa do projeto correto e do PDF de sugestões completo, que excedeu o limite de transferência de 32 MiB nesta conversa.

## Estado do catálogo

- Base original: 103 produtos.
- `Catalago Lançamentos.pdf`: 25 páginas analisadas, 24 produtos identificados; 16 correspondem à base e 8 são novos. Imagens reproduzem as páginas do arquivo recebido, com referência de origem por produto.
- Total consolidado: 111 produtos.
- `Sanes Brindes - SUGESTÕES DE BRINDES 2026.pdf`: **pendente**, não lido nem importado. É necessário receber o arquivo dividido ou comprimido abaixo do limite.
- Preços não foram fornecidos. Todos os preços permanecem `null`, exibidos como “Sob consulta”. Novos produtos usam quantidade desejada a partir de uma unidade para solicitar atendimento, com pedido mínimo explicitamente a confirmar. Os mínimos antigos foram preservados da base original.
- `catalog/import-report.json` registra essas limitações. Não marque um documento como concluído sem efetivamente processá-lo.

## 1. Conferir o projeto e aplicar a migração

Inspecione o schema existente do projeto antes de aplicar `migrations/202611170001_store.sql`. A migração é transacional e não apaga tabelas ou dados. Se já houver tabelas com os mesmos nomes e outra estrutura, adapte a migração ao projeto antes de aplicá-la.

A migração cria catálogo público, perfis privados, carrinhos por conta, pedidos, itens e equipe da loja. RLS permite que cada cliente veja apenas seus dados. Pedidos e preços são validados por uma função de banco transacional; o cliente não pode gravar valores ou status diretamente. A chave de repetição impede pedidos duplicados quando a mesma tentativa é reenviada.

O bucket `catalog` é público e exclusivo para imagens comerciais. Artes de clientes não são enviadas para esse bucket: o cliente as anexa no atendimento pelo WhatsApp.

Aplique depois `migrations/202611170002_order_contact_validation.sql`, que adiciona validação de telefone e data sem alterar a migração original. O RPC anterior perde acesso público; preços e isolamento por RLS continuam no servidor.

## 2. Importar os dados e imagens

O script executa uploads para `catalog` e upserts dos produtos, preservando os preços e a disponibilidade que já estiverem administrados na loja. Use uma credencial privilegiada somente no ambiente privado do importador, nunca em código de navegador, commits, logs ou variáveis `VITE_`.

Variáveis privadas necessárias ao importador:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

```sh
npm run catalog:import
```

O script informa a contagem efetivamente importada. Não indica que o segundo PDF foi importado quando ele continua pendente.

## 3. Configurar autenticação

No Supabase Auth:

- Ativar Email/Password e confirmação de e-mail.
- Configurar **Site URL** com a URL pública real do site.
- Adicionar a URL exata do callback em **Redirect URLs**. No endereço atual: `https://abnerdev19.github.io/Sanes/`. Ao usar domínio próprio, adicionar a URL real desse domínio e revisar os links.
- Configurar SMTP de produção com o remetente da empresa, conforme o provedor escolhido, e verificar entrega de confirmação e recuperação de senha.
- Revisar os limites de autenticação e proteção contra abuso fornecidos pelo projeto.

A interface oferece criação de conta, login, recuperação de senha e alteração de senha pelo link recebido. O pedido só pode ser registrado com uma sessão válida e um e-mail confirmado; o banco obtém o e-mail do usuário autenticado.

## 4. Dar acesso à equipe

Após o responsável criar e confirmar a própria conta, um administrador do projeto cadastra seu UUID em `public.store_members`, com `role='owner'` ou `'staff'`. Não há tela pública para promover usuários. Não use metadados editáveis pelo cliente como autorização.

A mesma área “Minha conta” passa a mostrar o atendimento da loja para membros autorizados: pedidos, contato do comprador e atualização do status. Clientes comuns veem apenas os próprios pedidos.

## 5. Compilar e publicar

Crie `.env.local` na raiz, com a **URL pública** e a **publishable/anon key**, seguindo `.env.example`. Essas duas informações são próprias para o navegador e dependem de RLS. A configuração de build recusa chaves `service_role`, chaves secretas e tokens de usuários.

```sh
npm ci
npm test
npm run test:responsive
npm run build:production
```

`build:production` recusa a compilação de produção enquanto não houver configuração real, catálogo importado ou enquanto um PDF fornecido continuar pendente. O build comum (`npm run build`) continua disponível para desenvolvimento e revisão, com o login indisponível se não houver configuração.

O Pages existente publica os arquivos compilados `index.html` e `assets/` da raiz da branch `main`. `build:production` prepara esses arquivos; eles precisam corresponder exatamente à configuração real do projeto antes do push para produção. O build não altera Auth, DNS, SMTP ou permissões do projeto.

Antes de liberar a compra, verificar no projeto real: cadastro e confirmação de e-mail; login e recuperação; restauração do carrinho; registro de pedido e retorno do número; histórico em duas contas diferentes; visualização pela loja; link de atendimento; sessão expirada e falhas de rede. Os testes locais de SQL usam PostgreSQL via PGlite com as estruturas Auth/Storage simuladas, e os testes de navegador simulam as respostas do Supabase. Eles não substituem a verificação do projeto conectado.

## Funcionamento nesta etapa

O comprador monta o carrinho e pode enviar um orçamento como visitante, informando nome, e-mail e telefone. Esse fluxo abre o WhatsApp e não grava pedidos anônimos no Supabase. Opcionalmente, pode entrar na conta para registrar o pedido; após a confirmação do banco, a tela mostra o número e o contato da loja, com histórico na conta. A equipe confirma valores, frete, arte, prazo e pagamento diretamente no atendimento. Não existe cobrança online, cálculo de frete ou estoque reservado automaticamente.

O telefone de atendimento permanece `+55 61 98133-3737`, correspondente ao código original e à última página do catálogo de lançamentos. A logo não foi modificada.
