import { readFile } from 'node:fs/promises';
const catalog=JSON.parse(await readFile(new URL('../../catalog/products.json',import.meta.url),'utf8'));
export const USER_ID='00000000-0000-4000-8000-000000000001';
export async function mockStore(page,{failOrder=false,cartDelay=0}={}){
 const state={cart:[],orders:[],calls:[],signedIn:false};
 const user={id:USER_ID,aud:'authenticated',role:'authenticated',email:'cliente@example.com',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),user_metadata:{name:'Cliente Teste'},app_metadata:{provider:'email'}};
 const rows=catalog.map(p=>({id:p.id,name:p.nome,category:p.categoria,capacity:p.capacidade,description:p.desc,dimensions:p.dim||null,min_qty:p.min,min_confirmed:p.min_confirmed!==false,unit_price:p.id==='SB-001'?12.5:null,image_url:p.imagem||null,source_document:p.source_document||null,source_page:p.source_page||null,active:true}));
 const jwt=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:USER_ID,aud:'authenticated',role:'authenticated',email:user.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-signature'].join('.');
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();
  let body;try{body=req.postDataJSON()}catch{}
  const respond=(json,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'},body:status===204?'':JSON.stringify(json)});
  if(method==='OPTIONS')return respond({},200);
  if(url.pathname==='/auth/v1/token'){state.signedIn=true;return respond({access_token:jwt(),refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})}
  if(url.pathname==='/auth/v1/user')return respond(user);
  if(url.pathname==='/auth/v1/signup')return respond({...user,identities:[{id:USER_ID}],confirmation_sent_at:new Date().toISOString()});
  if(url.pathname==='/auth/v1/recover')return respond({});
  if(url.pathname==='/auth/v1/logout'){state.signedIn=false;return respond(null,204)}
  if(url.pathname==='/rest/v1/products')return respond(rows);
  if(url.pathname==='/rest/v1/store_members')return respond([]);
  if(url.pathname==='/rest/v1/profiles'){if(method==='GET')return respond([{id:USER_ID,name:'Cliente Teste',company:'Empresa Teste',phone:'61999990000',city:'Brasília'}]);return respond(null,201)}
  if(url.pathname==='/rest/v1/carts'){if(method==='GET'){if(cartDelay)await new Promise(r=>setTimeout(r,cartDelay));return respond(state.cart.length?[{items:state.cart}]:[])}state.cart=body.items;return respond(null,201)}
  if(url.pathname==='/rest/v1/rpc/place_order'){
   state.calls.push(body);if(failOrder)return respond({message:'Unavailable',code:'P0001'},400);
   const order={id:'20000000-0000-4000-8000-000000000001',number:42,user_id:USER_ID,status:'requested',created_at:new Date().toISOString(),customer:{...body.p_customer,email:user.email},total_units:body.p_items.reduce((s,i)=>s+i.qty,0),estimated_total:375,order_items:body.p_items.map((i,n)=>({id:String(n),product_id:i.id,product_name:rows.find(p=>p.id===i.id).name,quantity:i.qty,color:i.color,method:i.method,details:i.text,art_name:i.art,unit_price:rows.find(p=>p.id===i.id).unit_price}))};state.orders=[order];return respond(order);
  }
  if(url.pathname==='/rest/v1/orders')return respond(state.orders);
  return respond({message:`Unexpected test endpoint ${method} ${url.pathname}`},400);
 });
 return state;
}
