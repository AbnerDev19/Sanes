import{ArrowLeft,MessageCircle,Plus}from'lucide-react';
import ProductImage from './ProductImage';
import{money}from'../lib/supabase';
import{productHash}from'../lib/catalog';
export default function ProductPage({product,onCustomize,whatsapp}){
 if(!product)return <section className="product-page wrap"><h1>Produto não encontrado</h1><p>Este link não corresponde a um produto disponível no catálogo.</p><a className="btn outline" href="#catalogo">Voltar ao catálogo</a></section>;
 const url=new URL(productHash(product.id),location.origin+location.pathname).href;
 const share=`https://wa.me/?text=${encodeURIComponent(`Veja ${product.nome} no catálogo Sanes Brindes: ${url}`)}`;
 return <section className="product-page wrap"><a className="text-link" href="#catalogo"><ArrowLeft size={18}/>Voltar ao catálogo</a><div className="product-page-grid"><div className="product-page-image"><ProductImage p={product}/></div><div><div className="eyebrow">{product.categoria} · {product.id}</div><h1>{product.nome}</h1><p>{product.desc}</p><dl><dt>Capacidade / especificação</dt><dd>{product.capacidade||'Especificação a confirmar'}</dd><dt>Pedido mínimo</dt><dd>{product.min_confirmed===false?'A confirmar com a loja':`${product.min} unidades`}</dd>{product.dim&&<><dt>Medidas</dt><dd>{product.dim}</dd></>}</dl><strong>{typeof product.unit_price==='number'?money(product.unit_price):'Sob consulta'}</strong><p className="field-help">Cores, disponibilidade, arte, frete e prazo são confirmados pela loja.</p><button className="btn primary full" onClick={()=>onCustomize(product)}>Personalizar e adicionar <Plus size={18}/></button><a className="btn outline full" href={share} target="_blank" rel="noreferrer">Compartilhar no WhatsApp <MessageCircle size={18}/></a></div></div></section>;
}
