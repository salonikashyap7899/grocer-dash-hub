import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreSettings = {
  store_name: string;
  delivery_fee_cents: number;
  free_delivery_threshold_cents: number;
  delivery_eta: string;
  currency: string;
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    staleTime: 60_000,
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await supabase
        .from("settings")
        .select("store_name,delivery_fee_cents,free_delivery_threshold_cents,delivery_eta,currency")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as StoreSettings;
    },
  });
}
