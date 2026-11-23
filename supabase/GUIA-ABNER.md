# Guia de configuração do Supabase — Sanes Brindes

**Para:** Abner
**Projeto:** `whzklrxqbgvwacggeioz`
**URL do projeto:** `https://whzklrxqbgvwacggeioz.supabase.co` (o domínio é `supabase.co`, sem "r")
**Tempo estimado:** 30 a 45 minutos

Este guia prepara o banco de dados, o login, o armazenamento das logomarcas e a publicação do site. Siga as etapas na ordem. Cada etapa termina com uma verificação.

> **Regras de segurança**
>
> - A chave **`service_role`** (ou **secret key**, `sb_secret_...`) dá acesso total ao banco. Use-a **somente** na etapa 5, no seu computador. Nunca coloque essa chave no GitHub, em arquivo `.env` commitado, em variável `VITE_`, em chat ou em e-mail.
> - A chave que vai para o site é a **publishable key** (`sb_publishable_...`) ou, nos projetos antigos, a **anon key**. Ela é pública por natureza, e a segurança vem das regras RLS que as migrações criam.
> - Não desative o RLS de nenhuma tabela.

---

## 1. Conferir o projeto

1. Abra o painel do Supabase e entre no projeto `whzklrxqbgvwacggeioz`.
2. Vá em **Table Editor**, no schema `public`.
3. Se já existirem tabelas com os nomes `products`, `profiles`, `carts`, `orders`, `order_items`, `store_members`, `categories`, `store_settings` ou `order_files`, **pare e avise antes de continuar**. As migrações foram escritas para um projeto novo e não apagam dados, mas uma estrutura diferente com o mesmo nome precisa ser analisada antes.

**Verificação:** o schema `public` está vazio, ou você confirmou que as tabelas existentes vieram destas mesmas migrações.

---

## 2. Aplicar as migrações no SQL Editor

Os arquivos estão na pasta `supabase/migrations/` do repositório. Aplique **um por vez e nesta ordem**:

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `202611170001_store.sql` | Produtos, perfis, carrinhos, pedidos, equipe e bucket público `catalog` |
| 2 | `202611170002_order_contact_validation.sql` | Validação de telefone e data nos pedidos de contas |
| 3 | `202611230003_catalog_admin_uploads.sql` | Categorias, cores, modelos, destaques, ordem, número do WhatsApp, pedidos de visitante, bucket privado `order-files` e permissões do painel |

Para cada arquivo:

1. **SQL Editor → New query**.
2. Abra o arquivo no GitHub (botão **Raw**) ou no editor, copie **o conteúdo inteiro** e cole.
3. Clique em **Run**.
4. O resultado esperado é `Success. No rows returned`.

Cada arquivo roda dentro de `begin; … commit;`. Se der erro, nada daquele arquivo é aplicado. Nesse caso, **copie a mensagem de erro completa e me envie**; não tente corrigir editando o SQL.

**Verificação:**

- O **Table Editor** mostra as tabelas `products`, `categories`, `store_settings`, `orders`, `order_items`, `order_files`, `profiles`, `carts` e `store_members`.
- `store_settings` tem uma linha com `whatsapp = 5561981333737`.
- `categories` tem 6 linhas.
- **Storage** mostra dois buckets: `catalog` (Public) e `order-files` (Private).

---

## 3. Configurar o login (Authentication)

### 3.1 Provedores — **Authentication → Sign In / Providers**

- **Email:** habilitado.
- **Confirm email:** ligado.
- **Allow anonymous sign-ins:** **LIGADO**. ⚠️ Isso é obrigatório: é o que permite que um cliente sem conta envie a logomarca com segurança. O site cria uma sessão anônima invisível só no momento do envio, e cada cliente só consegue gravar e ler os próprios arquivos.

### 3.2 URLs — **Authentication → URL Configuration**

- **Site URL:** `https://abnerdev19.github.io/Sanes/`
- **Redirect URLs:** adicione `https://abnerdev19.github.io/Sanes/`

Se a Sanes passar a usar um domínio próprio, troque nas duas configurações e me avise.

### 3.3 Limites contra abuso — **Authentication → Rate Limits**

Confira se o limite de **anonymous sign-ins** está ativo. O padrão do Supabase é por volta de 30 por hora por IP, o que é suficiente. Além disso, o banco já limita cada visitante a 40 arquivos por dia e 10 pedidos por hora.

### 3.4 E-mails — **Authentication → Emails / SMTP Settings**

O SMTP padrão do Supabase envia **pouquíssimos e-mails por hora** e serve apenas para testes. Para que clientes com conta recebam a confirmação e a recuperação de senha, configure um SMTP próprio (por exemplo, o e-mail da empresa, Resend, Brevo ou similar).

Visitantes sem conta **não dependem de e-mail**. Os pedidos pelo WhatsApp funcionam mesmo sem esta etapa.

**Verificação:** em **Sign In / Providers**, as opções "Email" e "Allow anonymous sign-ins" aparecem ligadas.

---

## 4. Criar o acesso administrativo do Júnior

1. **Authentication → Users → Add user → Create new user**.
2. Informe o e-mail e uma senha forte do Júnior e marque **Auto Confirm User**.
3. No **SQL Editor**, rode o comando abaixo, trocando o e-mail:

```sql
insert into public.store_members(user_id, role)
select id, 'owner' from auth.users where email = 'EMAIL-DO-JUNIOR@exemplo.com'
on conflict (user_id) do update set role = excluded.role;
```

Para dar acesso a você mesmo ou a outro funcionário, repita com `'staff'` no lugar de `'owner'`.

**Verificação:**

```sql
select u.email, m.role from public.store_members m join auth.users u on u.id = m.user_id;
```

O resultado deve mostrar o e-mail do Júnior com `owner`.

> O painel administrativo (`#/admin`) está em desenvolvimento. Depois que for publicado, o Júnior entra com esse mesmo e-mail e senha. Não existe tela pública para virar administrador: o acesso só é dado por este comando SQL.

---

## 5. Importar os produtos e as fotos (no seu computador)

Requer Node.js 22 e o repositório clonado.

1. Em **Project Settings → API Keys**, copie a **secret key** (ou a `service_role` legada).
2. No terminal, dentro da pasta do repositório:

```sh
npm ci
```

```sh
export SUPABASE_URL="https://whzklrxqbgvwacggeioz.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="COLE-A-SECRET-KEY-AQUI"
npm run catalog:import
```

3. Feche o terminal ao terminar, para a chave não ficar na sessão. Não salve a chave em arquivo.

O script cadastra os 111 produtos e envia as 24 fotos para o bucket `catalog`. Ele **só cadastra produtos que ainda não existem**, então rodar de novo não apaga as edições feitas no painel. Para regravar textos e fotos a partir do arquivo do repositório, use `npm run catalog:import -- --update`. Isso sobrescreve nome, descrição e fotos editados no painel; preços, disponibilidade, cores, modelos e destaques nunca são alterados.

**Verificação:** a mensagem final é `Imported 111 products and 24 catalog pictures`, e o **Table Editor → products** mostra 111 linhas.

---

## 6. Publicar o site com o Supabase (GitHub)

No repositório `AbnerDev19/Sanes`:

### 6.1 Ativar a publicação pelo GitHub Actions (recomendado)

1. **Settings → Pages → Build and deployment → Source:** selecione **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → aba Variables → New repository variable:**

| Nome | Valor |
|---|---|
| `PAGES_ACTIONS_ENABLED` | `true` |
| `VITE_SUPABASE_URL` | `https://whzklrxqbgvwacggeioz.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | a **publishable key** (`sb_publishable_...`) ou a **anon key** em *Project Settings → API Keys* |
| `VITE_WHATSAPP` | `5561981333737` |
| `VITE_SITE_URL` | `https://abnerdev19.github.io/Sanes/` |

Use **Variables**, não Secrets: esses valores são públicos e vão para o site. **Nunca** cadastre a secret/service_role aqui.

`VITE_WHATSAPP` é só um valor de reserva. O número que vale é o de `store_settings`, que o Júnior altera pelo painel.

3. **Actions → Build and deploy Pages → Run workflow** (ou faça um push na `main`).

**Verificação:** o workflow termina verde e o site abre no endereço do Pages.

---

## 7. Teste final

> As etapas 1 a 6 podem ser feitas **agora**: a versão atual do site continua funcionando com o banco novo. Os itens de upload e painel abaixo só funcionam depois que a nova versão do site for publicada; aviso quando estiver pronta.

Abra o site publicado em uma janela anônima do navegador e confira:

- [ ] O catálogo carrega e mostra os produtos (vindos do Supabase).
- [ ] Monte um pedido **sem conta**, anexe um PNG ou PDF de teste e finalize. O WhatsApp deve abrir com a mensagem do pedido, incluindo o link do arquivo.
- [ ] **Table Editor → orders:** o pedido aparece com `customer.guest = true`.
- [ ] **Storage → order-files:** o arquivo aparece dentro de uma pasta com o ID do visitante.
- [ ] O link do arquivo na mensagem abre a logomarca. O link é temporário, válido por 30 dias.
- [ ] Copie o endereço de um arquivo do bucket `order-files` **sem** o token e abra: o acesso deve ser **negado**.
- [ ] Crie uma conta de cliente comum, confirme o e-mail, entre e faça um pedido. Ele aparece em "Minha conta".

Se algum item falhar, me envie o print da tela e a mensagem de erro, de preferência do console do navegador (F12 → Console). **Antes de enviar, apague qualquer chave secreta que apareça no print.**

---

## Resumo do que me enviar quando terminar

1. Confirmação de que as 3 migrações rodaram sem erro (ou a mensagem de erro).
2. Confirmação de que "Allow anonymous sign-ins" está ligado.
3. Confirmação de que as variáveis do GitHub foram criadas e o workflow passou.
4. O resultado do teste final.

**Não me envie** a secret key nem a service_role. A publishable key não é segredo, mas basta cadastrá-la no GitHub.
