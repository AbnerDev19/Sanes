import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { WHATSAPP, normalizeWhatsapp } from "../config";

const StoreSettingsContext = createContext({ whatsapp: WHATSAPP });

export async function loadStoreSettings() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    whatsapp: WHATSAPP,
    mfaRequired: false,
    loading: Boolean(supabase),
  });
  useEffect(() => {
    let active = true;
    const refresh = () =>
      loadStoreSettings()
        .then((data) => {
          const whatsapp = normalizeWhatsapp(data?.whatsapp);
          if (active)
            setSettings({
              whatsapp: whatsapp || WHATSAPP,
              mfaRequired: data?.staff_mfa_required === true,
              loading: false,
            });
        })
        // Sem a tabela (migração 003 não aplicada) ou offline: mantém a reserva.
        .catch(
          () =>
            active &&
            setSettings((previous) => ({ ...previous, loading: false })),
        );
    refresh();
    const onChange = () => refresh();
    window.addEventListener("sanes:settings-changed", onChange);
    return () => {
      active = false;
      window.removeEventListener("sanes:settings-changed", onChange);
    };
  }, []);
  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export const useStoreSettings = () => useContext(StoreSettingsContext);
