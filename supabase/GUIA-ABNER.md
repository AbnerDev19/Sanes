# Configuração e operação da Sanes Brindes

Use o projeto Supabase da loja. Copie a URL e a chave **publishable** em **Project Settings → API Keys**. A URL pública tem domínio `supabase.co`. Use credenciais administrativas apenas no terminal privado ou nos Secrets do Supabase. Nunca use uma chave administrativa em GitHub Variables, código do navegador, commits, chat ou arquivos `VITE_*`.

## 1. Migrações

Confira a origem das tabelas existentes em **Table Editor → public**. Em banco vazio, aplique as migrações abaixo em ordem. No projeto com 001–004 já aplicadas, comece na 005. Compare os nomes e os objetos existentes se as versões do histórico foram geradas pelo painel ou pelo conector. Cada arquivo executa em uma transação. Rode um por vez no SQL Editor e interrompa se houver erro.

| Ordem | Arquivo | Verificação |
|---|---|---|
| 001 | `202611170001_store.sql` | Catálogo, contas, pedidos e RLS |
| 002 | `202611170002_order_contact_validation.sql` | Validação histórica de contato |
| 003 | `202611230003_catalog_admin_uploads.sql` | Categorias, WhatsApp, `catalog` público, `order-files` privado |
| 004 | `202611230004_admin_ordering.sql` | RPCs de ordenação |
| 005 | `202611240005_security.sql` | `audit_log`, papéis e limite global de 100 pedidos por hora, além de 10 por usuário. Só `submit_order` registra pedidos |
| 006 | `202611240006_order_validation.sql` | Validação de opções e anexos, posição dos novos itens e atualização automática de datas |
| 007 | `202611240007_retention.sql` | Fila privada para exclusões e prazos opcionais |
| 008 | `202611240008_catalog_fields.sql` | Campo Material e atualização parcial do importador |
| 009 | `202611240009_staff_mfa.sql` | Exigência opcional de TOTP para a equipe |

As mudanças em 001 e 002 só tornam a reaplicação na etapa original idempotente. Em bancos atualizados, começar nas migrações ainda pendentes preserva as regras mais novas. Valide a restrição histórica de elementos de produtos após revisar as opções existentes no painel:

```sql
alter table public.products validate constraint products_element_format;
```

## 2. Auth, CAPTCHA e MFA

1. Em **Authentication → Sign In / Providers**, mantenha **Email**, **Confirm email** e **Allow anonymous sign-ins** ligados. Em **URL Configuration**, use a raiz pública exata, por exemplo `https://abnerdev19.github.io/Sanes/`, tanto em **Site URL** quanto na lista **Redirect URLs**. Confirme cadastro e recuperação de senha por e-mail no ambiente publicado. Em **Authentication → Emails**, configure SMTP com um remetente autorizado para produção.
2. Em **Authentication → Attack Protection**, cadastre o secret de um widget **Cloudflare Turnstile** permitido no domínio da loja e configure a chave pública em `VITE_CAPTCHA_SITE_KEY`. O site usa o widget na primeira sessão de visitante, no cadastro, no login por e-mail e na solicitação de recuperação de senha. Teste todos esses fluxos em homologação antes de ativar a proteção em produção. Para hCaptcha, integre o widget correspondente antes de ativar no site.
3. Em **Authentication → Users**, crie a conta de equipe, confirme seu e-mail e atribua o papel no SQL Editor. Substitua o exemplo pelo e-mail verificado.

```sql
insert into public.store_members(user_id, role)
select id, 'owner' from auth.users
where email = 'proprietario@example.com' and not is_anonymous
on conflict (user_id) do update set role = excluded.role;
```

Use `staff` para atendentes. Esses usuários editam e ordenam produtos e categorias e atualizam pedidos. `owner` também altera o WhatsApp e exclui produtos e categorias quando as referências permitem. O acesso de equipe é gerenciado pelo responsável pelo banco. Verifique com `select user_id, role from public.store_members` e com duas contas no painel.

4. Habilite o fator TOTP no painel de configurações de MFA do Supabase. Em homologação, entre com duas contas válidas. Quando estiver pronto para exigir o segundo fator, execute:

```sql
update public.store_settings set staff_mfa_required = true where id;
```

Saia e entre no painel. Cadastre o QR code num aplicativo autenticador e confirme o código de seis dígitos. Verifique que a mesma edição falha numa sessão `aal1` e funciona após obter `aal2`. Mantenha um administrador do projeto disponível para recuperar acesso. Se houver bloqueio operacional, o responsável pelo projeto pode voltar o campo para `false` temporariamente, registrar o motivo e reativar depois.

## 3. Importar catálogo

Use Node 22 e credenciais privadas no terminal. Defina `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nessa sessão, rode a simulação, importe e encerre a sessão.

```sh
npm ci
npm run catalog:import -- --dry-run
npm run catalog:import
```

O padrão cria produtos ausentes e reaproveita fotos existentes. `--update` regrava os campos enviados pelo catálogo, preservando a categoria do painel, preços, disponibilidade, opções e a capa quando o arquivo de origem não tem foto. `--update --update-min` autoriza substituir as quantidades mínimas. Confira o relatório de criados, atualizados, ignorados e falhas e confirme os 111 produtos e as 24 imagens no painel. As imagens reproduzem páginas do fornecedor. Antes de recortar por produto ou reutilizar em campanhas, confirme os direitos de uso. O segundo PDF permanece pendente no relatório.

## 4. GitHub Pages e domínio

1. Em **Settings → Pages**, confirme a origem do deploy. O modo legado usa os arquivos gerados na raiz de `main`. Para esse modo, rode `npm run build:pages` e versione os arquivos gerados.
2. Após validar em homologação, escolha **GitHub Actions** como origem. Em **Settings → Secrets and variables → Actions → Variables**, cadastre:
   - `PAGES_ACTIONS_ENABLED=true`;
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`;
   - `VITE_SITE_URL` com a raiz pública, inclusive a barra final;
   - opcionalmente `VITE_CAPTCHA_SITE_KEY`, `VITE_WHATSAPP`, `VITE_DEVELOPMENT_CREDITS` e os campos de empresa de `.env.example`.
3. Se o segundo PDF ainda estiver pendente, decida se a loja pode operar com o catálogo disponível. Com aprovação, defina `CATALOG_PENDING_ACCEPTED=true`. O estado do arquivo continua registrado no relatório. A FAQ permanece sinalizada como provisória e não bloqueia o build, pois o conteúdo está marcado para revisão e o atendimento confirma as condições comerciais.
4. Depois que o workflow publicar `dist/` com sucesso em produção, faça a transição definitiva em um commit: remova o rastreamento de `index.html`, `assets/`, `404.html`, `produto/`, `robots.txt`, `sitemap.xml`, `favicon.svg` e `.nojekyll` na raiz com `git rm --cached` (use `-r` para pastas), adicione esses caminhos à `.gitignore` e confirme uma segunda publicação. A origem dos arquivos continua em `app/`, `src/` e `public/`. Confirme que o site carregou os ativos a partir da URL publicada antes de remover os artefatos legados.
5. Para um domínio próprio, configure DNS e o domínio em **Settings → Pages**, valide HTTPS e atualize `VITE_SITE_URL`, **Site URL**, **Redirect URLs**, os domínios autorizados do Turnstile e `ORDER_NOTIFY_SITE_URL`. As URLs limpas usam o caminho base da URL pública. O arquivo `robots.txt` vale na raiz do host. No endereço `github.io/Sanes/`, registre o sitemap explícito no Search Console quando tiver a propriedade verificada. No domínio próprio, confirme `/robots.txt` e `/sitemap.xml` servidos na raiz.

## 5. Notificações e manutenção opcionais

### Notificação via Resend

1. Valide o domínio remetente no Resend. Em **Edge Functions → Secrets** do Supabase, adicione `RESEND_API_KEY`, `ORDER_NOTIFY_FROM`, `ORDER_NOTIFY_TO`, `ORDER_NOTIFY_SITE_URL` e uma senha aleatória longa em `ORDER_WEBHOOK_SECRET`.
2. Publique `notify-order`. O gateway usa `verify_jwt=false` para o webhook e a função compara o cabeçalho `x-sanes-webhook-secret`.
3. Em **Database → Webhooks**, crie um webhook assíncrono de INSERT em `public.orders`, método POST para a URL da função, com o cabeçalho e o valor do secret.
4. Registre um pedido de teste. Confira a entrega do e-mail com número e link para o painel. Em caso de falha, confira os logs da função e a lista de entregas do Resend. O registro do pedido não depende do e-mail.

### Retenção e exclusão

Somente ative após aprovar a política de retenção, conferir backups e testar a restauração. Os prazos de contas e arquivos ficam desativados enquanto suas colunas estiverem `NULL`. Com a função agendada, órfãos de mais de 48 horas e arquivos de pedidos excluídos entram na remoção mesmo que os demais prazos estejam desativados.

1. Publique `maintain-orders` e configure `ORDER_MAINTENANCE_SECRET` com um valor distinto. A função usa as credenciais internas do Supabase para Storage e Auth.
2. Em **Integrations → Cron** (ou agendador autorizado), crie um POST periódico à função com `x-sanes-maintenance-secret`. Guarde o valor no Vault se usar pg_cron/pg_net, sem colocar o literal no SQL do agendamento. Use uma execução por vez e monitore a fila. Cada execução trata até 100 arquivos e 100 contas.
3. Defina os prazos aprovados, em dias, em `public.store_settings.order_file_retention_days` e `anonymous_retention_days`. Arquivos vinculados são elegíveis após o prazo desde a última atualização de um pedido concluído ou cancelado. Perfis e carrinhos legados de visitantes são limpos após o prazo. O Auth remove apenas contas anônimas expiradas sem pedidos nem objetos, junto com suas sessões. Nunca apague linhas de `storage.objects` diretamente.
4. Verifique em homologação: crie um órfão antigo e um recente; somente o antigo deve sumir. Exclua um pedido descartável e confira o sumiço do arquivo após rodar o job. Consulte os logs, confira os contadores e confirme que o link antigo não abre mais. A rotina deixa itens na fila se a remoção não for confirmada.

**Solicitação do titular:** valide a identidade e a base legal antes de excluir. Localize os pedidos pelo contato confirmado. Obtenha aprovação de quem controla a retenção. Exclua somente os registros autorizados e rode a manutenção para remover os objetos correspondentes. Confira a fila e o Storage. Atenda separadamente aos dados de conta no Supabase Auth e às cópias do WhatsApp sob controle da loja. Registre a conclusão sem copiar os dados pessoais para o log.

O navegador verifica assinaturas de arquivo para ajudar o cliente, e o banco cruza a extensão com os metadados do Storage. Para risco maior, avalie uma Edge Function que leia os primeiros bytes do objeto em quarentena e libere apenas tipos concordantes. PDF fica disponível ao painel como download, evitando abertura embutida.

## Checklist manual pós-deploy

- [ ] Aplicar 005 a 009 se 001 a 004 já estiverem registradas. Verificar RLS, papéis e bucket privado.
- [ ] Configurar Auth, SMTP, URLs e proteção definida pela loja. Abrir a conta e o painel pelos links publicados.
- [ ] Verificar credenciais, importação e catálogo real. Conferir o build e a conclusão do job Pages.
- [ ] Testar visitante e comprador com uma imagem de teste. Confirmar número e link único no WhatsApp, arquivos privados no painel e PDF baixado como anexo.
- [ ] Validar controle de proprietário, auditoria, MFA se ativado, notificação e retenção se configuradas.
- [ ] Revisar FAQ, minutas legais e direitos das imagens. Publicar as informações jurídicas definitivas após aprovação.

Pode-se executar `npm run check:production -- --smoke` com as variáveis públicas, `CATALOG_PENDING_ACCEPTED=true` quando aprovado e `SANES_SMOKE_CAPTCHA_TOKEN` privado se o projeto exigir CAPTCHA. O teste cria uma sessão de visitante e encerra a sessão local. Não envia pedido nem altera a ordenação.

## Runbook de incidente

- **Chave vazada:** revogue ou rotacione a credencial no Supabase, substitua as cópias nas funções e no importador, revise os logs e verifique que a credencial anterior falha. Se o vazamento estiver no Git, trate o histórico como exposto.
- **WhatsApp alterado indevidamente:** consulte `audit_log`, restaure o número aprovado em **Configurações** com o proprietário e teste o destino em uma janela privada. Revise as permissões do ator registrado.
- **Spam de pedidos:** confira a quantidade por IP e horário nos logs de Auth e a auditoria do banco. Ajuste `max_orders_per_hour` com o responsável, habilite proteção de Auth após homologação e teste um pedido legítimo.
- **Revogar acesso:** remova o UUID de `store_members`, revogue as sessões de equipe no Auth quando aplicável e valide que a conta não consegue consultar ou editar os pedidos da loja. Consulte a auditoria após a revogação.
