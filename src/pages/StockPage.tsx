import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Minus, Trash2, Package, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/PageTransition";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SizeEntry {
  id?: string;
  size_label: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  cost: number;
  sale_price: number;
  sizes: SizeEntry[];
}

const StockPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newSizes, setNewSizes] = useState<SizeEntry[]>([{ size_label: "", quantity: 0 }]);

  const fetchProducts = async () => {
    if (!user) return;
    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!prods) { setLoading(false); return; }

    const { data: sizes } = await supabase
      .from("product_sizes")
      .select("*")
      .eq("user_id", user.id);

    const mapped: Product[] = prods.map((p: any) => ({
      id: p.id,
      name: p.name,
      cost: Number(p.cost),
      sale_price: Number(p.sale_price),
      sizes: (sizes || [])
        .filter((s: any) => s.product_id === p.id)
        .map((s: any) => ({ id: s.id, size_label: s.size_label, quantity: s.quantity })),
    }));
    setProducts(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [user]);

  const addProduct = async () => {
    if (!user || !newName.trim()) { toast.error("Preencha o nome do produto."); return; }
    const validSizes = newSizes.filter((s) => s.size_label.trim());
    if (validSizes.length === 0) { toast.error("Adicione pelo menos um tamanho."); return; }

    const { data: prod, error } = await supabase
      .from("products")
      .insert({ user_id: user.id, name: newName.trim(), cost: parseFloat(newCost) || 0, sale_price: parseFloat(newPrice) || 0 })
      .select()
      .single();

    if (error || !prod) { toast.error("Erro ao criar produto."); return; }

    const sizeRows = validSizes.map((s) => ({
      product_id: prod.id,
      user_id: user.id,
      size_label: s.size_label.trim(),
      quantity: s.quantity,
    }));
    await supabase.from("product_sizes").insert(sizeRows);

    toast.success("Produto adicionado! 📦");
    setNewName(""); setNewCost(""); setNewPrice("");
    setNewSizes([{ size_label: "", quantity: 0 }]);
    setDialogOpen(false);
    fetchProducts();
  };

  const updateQuantity = async (sizeId: string, delta: number) => {
    const product = products.find((p) => p.sizes.some((s) => s.id === sizeId));
    const size = product?.sizes.find((s) => s.id === sizeId);
    if (!size) return;
    const newQty = Math.max(0, size.quantity + delta);
    await supabase.from("product_sizes").update({ quantity: newQty }).eq("id", sizeId);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        sizes: p.sizes.map((s) => (s.id === sizeId ? { ...s, quantity: newQty } : s)),
      }))
    );
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast("Produto removido.");
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getStockBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="destructive" className="text-xs font-bold">Esgotado</Badge>;
    if (qty <= 2) return <Badge className="bg-yellow-500 text-white text-xs font-bold">Acabando</Badge>;
    return <Badge variant="secondary" className="text-xs font-bold">{qty} un</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-secondary">📦 Meu Estoque</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              Controle de produtos por tamanho (grade)
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-bold active:scale-95 transition-transform gap-2">
                <Plus className="h-4 w-4" /> Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-secondary font-extrabold">Cadastrar Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="font-bold">Nome do Produto</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Calça Cargo Duna" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Custo (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Preço Venda (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0,00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Grade de Tamanhos</Label>
                  {newSizes.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Tam (ex: P, M, 36)"
                        value={s.size_label}
                        onChange={(e) => {
                          const copy = [...newSizes];
                          copy[i].size_label = e.target.value;
                          setNewSizes(copy);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Qtd"
                        value={s.quantity || ""}
                        onChange={(e) => {
                          const copy = [...newSizes];
                          copy[i].quantity = parseInt(e.target.value) || 0;
                          setNewSizes(copy);
                        }}
                        className="w-20"
                      />
                      {newSizes.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setNewSizes(newSizes.filter((_, j) => j !== i))} className="h-8 w-8">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setNewSizes([...newSizes, { size_label: "", quantity: 0 }])} className="w-full rounded-xl">
                    + Adicionar Tamanho
                  </Button>
                </div>

                <Button onClick={addProduct} className="w-full rounded-xl font-bold active:scale-95 transition-transform">
                  Salvar Produto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {products.length === 0 ? (
          <Card className="border-none shadow-md rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground font-semibold">Nenhum produto cadastrado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((p) => (
              <Card key={p.id} className="border-none shadow-md rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-extrabold text-foreground">{p.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-medium">
                        Custo: {fmt(p.cost)} · Venda: {fmt(p.sale_price)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {p.sizes.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                        <span className="text-sm font-bold text-foreground min-w-[40px]">{s.size_label}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg active:scale-90 transition-transform" onClick={() => updateQuantity(s.id!, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        {getStockBadge(s.quantity)}
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg active:scale-90 transition-transform" onClick={() => updateQuantity(s.id!, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default StockPage;
