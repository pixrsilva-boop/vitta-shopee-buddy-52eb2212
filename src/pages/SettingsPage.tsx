import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSettings, StoreSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";

const SettingsPage = () => {
  const { user, storeName } = useAuth();
  const { settings, loading, saveSettings } = useSettings();
  const [form, setForm] = useState<StoreSettings & { store_name: string }>({
    ...settings,
    store_name: storeName,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...settings, store_name: storeName });
  }, [settings, storeName]);

  const handleSave = async () => {
    setSaving(true);
    const { store_name, ...settingsData } = form;

    // Save settings
    const err = await saveSettings(settingsData);
    if (err) {
      toast.error("Erro ao salvar configurações.");
      setSaving(false);
      return;
    }

    // Save store name separately
    if (store_name !== storeName && user) {
      await supabase
        .from("profiles")
        .update({ store_name })
        .eq("user_id", user.id);
    }

    toast.success("Configurações salvas com sucesso! ✅");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary">⚙️ Configurações da Loja</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Defina as taxas e variáveis globais da sua operação.
          </p>
        </div>

        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-secondary">Perfil da Loja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Nome da Loja</Label>
              <Input
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                placeholder="Vitta Store"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-secondary">Taxas da Shopee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Comissão Shopee (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.shopee_commission}
                  onChange={(e) => setForm({ ...form, shopee_commission: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Taxa variável cobrada sobre cada venda</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Taxa Fixa por Venda (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fixed_fee}
                  onChange={(e) => setForm({ ...form, fixed_fee: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Valor fixo por transação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-secondary">Impostos e Custos Padrão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Imposto / Simples Nacional (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.tax_rate}
                  onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">0% para CPF/Isento, 4-6% para MEI/PJ</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Custo Médio de Embalagem (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.default_packaging_cost}
                  onChange={(e) => setForm({ ...form, default_packaging_cost: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Valor padrão pré-preenchido na calculadora</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto rounded-xl font-bold active:scale-95 transition-transform"
          size="lg"
        >
          {saving ? "Salvando..." : "💾 Salvar Configurações"}
        </Button>
      </div>
    </PageTransition>
  );
};

export default SettingsPage;
