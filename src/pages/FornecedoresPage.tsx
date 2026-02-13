import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Phone, MapPin, Trash2, Pencil, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Supplier {
  id: string;
  name: string;
  categories: string[];
  phone: string;
  location: string;
  notes: string;
}

const CATEGORY_OPTIONS = ["Jeans", "Malha", "Moda Praia", "Embalagem", "Acessórios", "Outros"];

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const FornecedoresPage = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("suppliers").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setSuppliers(data.map((s: any) => ({ id: s.id, name: s.name, categories: s.categories || [], phone: s.phone, location: s.location, notes: s.notes })));
      });
  }, [user]);

  const resetForm = () => { setName(""); setCategories([]); setPhone(""); setLocation(""); setNotes(""); setEditing(null); };
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setName(s.name); setCategories(s.categories); setPhone(s.phone); setLocation(s.location); setNotes(s.notes); setOpen(true); };

  const save = async () => {
    if (!name.trim()) { toast.error("Preencha o nome do fornecedor."); return; }
    if (editing) {
      const { error } = await supabase.from("suppliers").update({ name: name.trim(), categories, phone, location, notes }).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar."); return; }
      setSuppliers((prev) => prev.map((s) => s.id === editing.id ? { ...s, name: name.trim(), categories, phone, location, notes } : s));
      toast.success("Fornecedor atualizado!");
    } else {
      const { data, error } = await supabase.from("suppliers").insert({ user_id: user!.id, name: name.trim(), categories, phone, location, notes }).select().single();
      if (error) { toast.error("Erro ao salvar."); return; }
      setSuppliers((prev) => [{ id: data.id, name: data.name, categories: data.categories || [], phone: data.phone, location: data.location, notes: data.notes }, ...prev]);
      toast.success("Fornecedor cadastrado!");
    }
    setOpen(false); resetForm();
  };

  const remove = async (id: string) => {
    await supabase.from("suppliers").delete().eq("id", id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    toast("Fornecedor removido.");
  };

  const whatsappUrl = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, "")}`;
  const toggleCategory = (cat: string) => setCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary">🏭 Gestão de Fornecedores</h1>
          <p className="text-muted-foreground mt-1 font-medium">Cadastre e contate seus fornecedores rapidamente.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
      </div>

      {suppliers.length === 0 ? (
        <Card className="border-none shadow-md"><CardContent className="text-center py-16"><p className="text-5xl mb-3">🏭</p><p className="text-muted-foreground font-semibold">Nenhum fornecedor cadastrado.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <Card key={s.id} className="border-none shadow-md">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-extrabold text-foreground text-lg">{s.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {s.categories.length > 0 && (<div className="flex flex-wrap gap-1.5">{s.categories.map((c) => (<Badge key={c} variant="secondary" className="text-xs">{c}</Badge>))}</div>)}
                {s.phone && <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {s.phone}</p>}
                {s.location && <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {s.location}</p>}
                {s.notes && <p className="text-xs text-muted-foreground/80 italic line-clamp-2">{s.notes}</p>}
                {s.phone && (<a href={whatsappUrl(s.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors" style={{ backgroundColor: "#25D366" }}><MessageCircle className="h-4 w-4" /> WhatsApp</a>)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-secondary">{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da Empresa *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Textil São Paulo" /></div>
            <div className="space-y-2"><Label>Categorias</Label><div className="flex flex-wrap gap-2">{CATEGORY_OPTIONS.map((cat) => (<button key={cat} type="button" onClick={() => toggleCategory(cat)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${categories.includes(cat) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>{cat}</button>))}</div></div>
            <div className="space-y-2"><Label>Telefone / WhatsApp</Label><Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" /></div>
            <div className="space-y-2"><Label>Localização</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Brás, São Paulo" /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações..." rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? "Salvar" : "Cadastrar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FornecedoresPage;
