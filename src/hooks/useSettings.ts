import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StoreSettings {
  shopee_commission: number;
  fixed_fee: number;
  tax_rate: number;
  default_packaging_cost: number;
}

const DEFAULTS: StoreSettings = {
  shopee_commission: 20,
  fixed_fee: 3,
  tax_rate: 0,
  default_packaging_cost: 0,
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("shopee_commission, fixed_fee, tax_rate, default_packaging_cost")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            shopee_commission: Number(data.shopee_commission),
            fixed_fee: Number(data.fixed_fee),
            tax_rate: Number(data.tax_rate),
            default_packaging_cost: Number(data.default_packaging_cost),
          });
        }
        setLoading(false);
      });
  }, [user]);

  const saveSettings = async (newSettings: StoreSettings) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update(newSettings)
      .eq("user_id", user.id);
    if (!error) setSettings(newSettings);
    return error;
  };

  return { settings, loading, saveSettings };
}
