import {Package} from 'lucide-react';
export const imageSource=p=>/^https?:/.test(p.imagem)?p.imagem:`${import.meta.env.BASE_URL}${p.imagem}`;
export default function ProductImage({p,hero=false}){
 if(hero)return <img className="hero-img" src={`${import.meta.env.BASE_URL}assets/reference-0.png`} alt="Composição ilustrativa de kit corporativo com caderneta e caneta"/>;
 if(!p?.imagem)return <div className="photo-placeholder" role="img" aria-label={`Foto em breve: ${p.nome}`}><Package size={36} aria-hidden="true"/><span>Foto em breve</span></div>;
 return <img src={imageSource(p)} alt={`${p.nome} — imagem do catálogo Sanes`} loading="lazy"/>;
}
