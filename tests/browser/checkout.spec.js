import {test,expect}from'@playwright/test';import{mockStore}from'./store-mock.js';
async function add(page){await page.getByLabel('Buscar produtos').fill('Munique');await page.getByRole('button',{name:'Personalizar Garrafa Térmica Munique',exact:true}).first().click();await page.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).click();}
async function login(page){await page.getByRole('button',{name:'Entrar na conta',exact:true}).click();await page.getByLabel('E-mail da conta').fill('cliente@example.com');await page.getByLabel('Senha',{exact:true}).fill('password-test');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('button',{name:'Minha conta',exact:true})).toBeVisible();}
test('signed-in customer records an order before opening store contact',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await mockStore(page);await page.goto('/');await add(page);await login(page);
 await page.getByRole('button',{name:'Meu carrinho 1',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.getByLabel('Seu nome *',{exact:true})).toHaveValue('Cliente Teste');await page.getByRole('button',{name:'Registrar pedido',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Pedido #42 registrado!',exact:true})).toBeVisible();
 const link=page.getByRole('link',{name:'Continuar atendimento no WhatsApp',exact:false});await expect(link).toHaveAttribute('href',/wa.me\/5561981333737/);expect(decodeURIComponent(await link.getAttribute('href'))).toContain('pedido #42');
 expect(state.calls).toHaveLength(1);expect(state.calls[0].p_items[0].qty).toBe(30);expect(state.calls[0].p_items[0]).not.toHaveProperty('unit_price');
 await page.getByRole('button',{name:'Ver meus pedidos',exact:true}).click();await expect(page.getByRole('heading',{name:'Pedido #42',exact:true})).toBeVisible();
});
test('registration failures preserve the cart and expose no success contact',async({page})=>{
 const state=await mockStore(page,{failOrder:true});await page.goto('/');await add(page);await login(page);await page.getByRole('button',{name:'Meu carrinho 1',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('button',{name:'Registrar pedido',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Seu carrinho foi preservado');await expect(page.getByRole('link',{name:'Continuar atendimento no WhatsApp',exact:false})).toHaveCount(0);const key=state.calls[0].p_request_key;await page.getByRole('button',{name:'Registrar pedido',exact:true}).click();await expect.poll(()=>state.calls.length).toBe(2);expect(state.calls[1].p_request_key).toBe(key);
});
test('guest must sign in to register; cart remains after opening login',async({page})=>{
 const state=await mockStore(page);await page.goto('/');await add(page);await page.getByRole('button',{name:'Meu carrinho 1',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByLabel('Seu nome *',{exact:true}).fill('Visitante');await page.getByRole('button',{name:'Entrar para enviar pedido',exact:true}).click();await expect(page.getByRole('heading',{name:'Entre na sua conta',exact:true})).toBeVisible();expect(state.calls).toHaveLength(0);await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Meu carrinho 1',exact:true}).click();await expect(page.getByRole('dialog').getByRole('heading',{name:'Garrafa Térmica Munique',exact:true})).toBeVisible();
});

test('sign-out hides the signed-in cart from the next guest',async({page})=>{
 await mockStore(page);await page.goto('/');await add(page);await login(page);await page.getByRole('button',{name:'Minha conta',exact:true}).click();await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await expect(page.getByRole('button',{name:'Entrar na conta',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Meu carrinho 0',exact:true})).toBeVisible();
});
