const raw=import.meta.env.VITE_WHATSAPP||'5561981333737';
export const WHATSAPP=/^\d{10,15}$/.test(raw.replace(/\D/g,''))?raw.replace(/\D/g,''):'5561981333737';
