export function todayBrazil(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=type=>parts.find(p=>p.type===type).value;return`${value('year')}-${value('month')}-${value('day')}`;
}
export function phoneDigits(value){let digits=String(value||'').replace(/\D/g,'');if((digits.length===12||digits.length===13)&&digits.startsWith('55'))digits=digits.slice(2);return digits;}
export function formatBrazilianPhone(value){const d=phoneDigits(value).slice(0,11);if(!d)return'';if(d.length<3)return`(${d}`;const body=d.slice(2),cut=body.length>8?5:4;return`(${d.slice(0,2)}) ${body.slice(0,cut)}${body.length>cut?'-'+body.slice(cut):''}`;}
export function validPhone(value){return /^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(phoneDigits(value));}
export function validDeliveryDate(value,now=new Date()){
 if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T12:00:00Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value&&value>=todayBrazil(now);
}
export function contactError(customer,now=new Date()){
 if(!customer.name?.trim())return'Informe seu nome.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email||''))return'Informe um e-mail válido.';
 if(!validPhone(customer.phone))return'Informe um telefone brasileiro com DDD, por exemplo (61) 98133-3737.';
 if(!validDeliveryDate(customer.date,now))return'A data desejada não pode ser passada ou inválida.';
 return'';
}
