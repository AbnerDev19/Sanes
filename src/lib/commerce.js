export function cleanCart(items,products){
 if(!Array.isArray(items))return[];
 const byId=new Map(products.map(p=>[p.id,p]));
 return items.slice(0,100).flatMap((item,index)=>{const p=byId.get(item.id);if(!p||!Number.isSafeInteger(item.qty)||item.qty<p.min||item.qty>100000)return[];
 return [{id:p.id,name:p.nome,key:typeof item.key==='string'?item.key:`restored-${index}-${p.id}`,qty:item.qty,color:String(item.color||'A definir').slice(0,80),method:String(item.method||'A definir com a equipe').slice(0,80),text:String(item.text||'').slice(0,1200),art:String(item.art||'').slice(0,255)}];});
}
export function mergeCarts(remote,local,products){
 const all=cleanCart(remote,products);const keys=new Set(all.map(i=>i.key));
 for(const item of cleanCart(local,products))if(!keys.has(item.key)){all.push(item);keys.add(item.key)}
 return all.slice(0,100);
}
export function cartTotals(cart,products){const index=new Map(products.map(p=>[p.id,p]));let total=0;const priced=cart.every(item=>{const price=index.get(item.id)?.unit_price;if(typeof price!=='number'||!Number.isFinite(price))return false;total+=Math.round(price*100)*item.qty;return true;});return{units:cart.reduce((s,i)=>s+i.qty,0),total:cart.length&&priced?total/100:null};}
export function orderContactMessage(order){return [`Olá, Sanes! Quero atendimento para o pedido #${order.number}.`,`Referência: ${order.id}`,`Nome: ${order.customer.name}`,`E-mail da conta: ${order.customer.email}`,order.customer.phone&&`Telefone: ${order.customer.phone}`,order.customer.company&&`Empresa: ${order.customer.company}`,order.customer.city&&`Cidade: ${order.customer.city}`,order.customer.date&&`Data desejada: ${order.customer.date}`,'',...(order.order_items||[]).map(i=>`${i.product_id} — ${i.product_name}\nQuantidade: ${i.quantity}\nCor: ${i.color}\nTécnica: ${i.method}${i.details?'\nDetalhes: '+i.details:''}${i.art_name?'\nArte: '+i.art_name+' (enviarei o arquivo na conversa)':''}`),order.customer.notes&&`Observações: ${order.customer.notes}`,'Aguardo a confirmação de valores, disponibilidade, arte e prazo.'].filter(Boolean).join('\n');}
