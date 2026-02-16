import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Wallet, Trash2, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/PageTransition";

interface Transaction {
  id: string;
  type: "expense" | "income";
  description: string;
  category: string;
  value: number;
  date: string;
}

const FinanceiroPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expValue, setExpValue] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [incValue, setIncValue] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTransactions(data.map((t: any) => ({ id: t.id, type: t.type, description: t.description, category: t.category, value: Number(t.value), date: t.date })));
        setLoading(false);
      });
  }, [user]);

  const { totalExpenses, totalIncome, balance } = useMemo(() => {
    let totalExpenses = 0, totalIncome = 0;
    for (const t of transactions) {
      if (t.type === "expense") totalExpenses += t.value;
      else totalIncome += t.value;
    }
    return { totalExpenses, totalIncome, balance: totalIncome - totalExpenses };
  }, [transactions]);

  // Monthly chart data
  const chartData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions) {
      // date is in pt-BR format dd/mm/yyyy
      const parts = t.date.split("/");
      const key = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : t.date;
      if (!months[key]) months[key] = { income: 0, expense: 0 };
      if (t.type === "income") months[key].income += t.value;
      else months[key].expense += t.value;
    }
    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        Faturamento: data.income,
        Custos: data.expense,
        Lucro: data.income - data.expense,
      }))
      .reverse()
      .slice(-6);
  }, [transactions]);

  const addExpense = async () => {
    if (!expDesc.trim() || !expCategory || !expValue) { toast.error("Preencha todos os campos."); return; }
    const value = parseFloat(expValue);
    if (isNaN(value) || value <= 0) { toast.error("Valor inválido."); return; }
    const newT = { user_id: user!.id, type: "expense" as const, description: expDesc.trim(), category: expCategory, value, date: new Date().toLocaleDateString("pt-BR") };
    const { data, error } = await supabase.from("transactions").insert(newT).select().single();
    if (error) { toast.error("Erro ao salvar."); return; }
    setTransactions((prev) => [{ id: data.id, type: data.type as "expense", description: data.description, category: data.category, value: Number(data.value), date: data.date }, ...prev]);
    setExpDesc(""); setExpCategory(""); setExpValue("");
    toast.success("Despesa adicionada!");
  };

  const addIncome = async () => {
    if (!incDesc.trim() || !incValue) { toast.error("Preencha todos os campos."); return; }
    const value = parseFloat(incValue);
    if (isNaN(value) || value <= 0) { toast.error("Valor inválido."); return; }
    const newT = { user_id: user!.id, type: "income" as const, description: incDesc.trim(), category: "Venda", value, date: new Date().toLocaleDateString("pt-BR") };
    const { data, error } = await supabase.from("transactions").insert(newT).select().single();
    if (error) { toast.error("Erro ao salvar."); return; }
    setTransactions((prev) => [{ id: data.id, type: data.type as "income", description: data.description, category: data.category, value: Number(data.value), date: data.date }, ...prev]);
    setIncDesc(""); setIncValue("");
    toast.success("Receita adicionada!");
  };

  const removeTransaction = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast("Lançamento removido.");
  };

  const exportCSV = () => {
    if (transactions.length === 0) { toast.error("Nenhum dado para exportar."); return; }
    const header = "Tipo,Descrição,Categoria,Valor,Data\n";
    const rows = transactions.map((t) =>
      `${t.type === "expense" ? "Despesa" : "Receita"},"${t.description}","${t.category}",${t.value},"${t.date}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio-financeiro.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado! 📥");
  };

  const exportExcel = async () => {
    if (!user) return;
    toast.info("Gerando relatório Excel...");

    // Fetch suppliers and products
    const [suppRes, prodRes, notesRes] = await Promise.all([
      supabase.from("suppliers").select("*").eq("user_id", user.id),
      supabase.from("products").select("*").eq("user_id", user.id),
      supabase.from("notes").select("*").eq("user_id", user.id),
    ]);

    const wb = XLSX.utils.book_new();

    // --- ABA 1: FINANCEIRO ---
    const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
    const finData = transactions.map((t) => ({
      PRODUTO: t.description.toUpperCase(),
      TIPO: t.category.toUpperCase(),
      VALOR: fmtBRL(t.value),
      DATA: t.date,
    }));
    // Calculate totals
    const totalInc = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.value, 0);
    const totalExp = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.value, 0);
    const totalResult = totalInc - totalExp;
    finData.push({ PRODUTO: "", TIPO: "", VALOR: "", DATA: "" });
    finData.push({ PRODUTO: "TOTAL RECEITAS", TIPO: "", VALOR: fmtBRL(totalInc), DATA: "" });
    finData.push({ PRODUTO: "TOTAL DESPESAS", TIPO: "", VALOR: fmtBRL(totalExp), DATA: "" });
    finData.push({ PRODUTO: totalResult >= 0 ? "LUCRO LÍQUIDO" : "PREJUÍZO", TIPO: "", VALOR: fmtBRL(Math.abs(totalResult)), DATA: "" });
    const ws1 = XLSX.utils.json_to_sheet(finData.length > 0 ? finData : [{ PRODUTO: "Sem dados", TIPO: "", VALOR: "", DATA: "" }]);
    ws1["!cols"] = [
      { wch: Math.max(20, ...finData.map((r) => r.PRODUTO.length)) },
      { wch: Math.max(15, ...finData.map((r) => r.TIPO.length)) },
      { wch: 18 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "FINANCEIRO");

    // --- ABA 2: FORNECEDORES ---
    const suppData = (suppRes.data || []).map((s: any) => ({
      EMPRESA: s.name,
      CATEGORIA: (s.categories || []).join(", "),
      CONTATO: s.phone,
      LOCAL: s.location,
    }));
    const ws2 = XLSX.utils.json_to_sheet(suppData.length > 0 ? suppData : [{ EMPRESA: "Sem dados", CATEGORIA: "", CONTATO: "", LOCAL: "" }]);
    ws2["!cols"] = [
      { wch: Math.max(20, ...suppData.map((r) => r.EMPRESA.length)) },
      { wch: Math.max(15, ...suppData.map((r) => r.CATEGORIA.length)) },
      { wch: 18 },
      { wch: Math.max(15, ...suppData.map((r) => r.LOCAL.length)) },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "FORNECEDORES");

    // --- ABA 3: DADOS GERAIS ---
    const generalData: Record<string, string>[] = [];
    (prodRes.data || []).forEach((p: any) => {
      generalData.push({ INFO: `Produto: ${p.name}`, DETALHE: `Custo: R$${Number(p.cost).toFixed(2)} | Venda: R$${Number(p.sale_price).toFixed(2)}` });
    });
    (notesRes.data || []).forEach((n: any) => {
      generalData.push({ INFO: "Anotação", DETALHE: n.content?.slice(0, 100) || "" });
    });
    const ws3 = XLSX.utils.json_to_sheet(generalData.length > 0 ? generalData : [{ INFO: "Espaço reservado para futuras expansões", DETALHE: "" }]);
    ws3["!cols"] = [{ wch: 40 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws3, "DADOS GERAIS");

    // Bold headers for all sheets
    [ws1, ws2, ws3].forEach((ws) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[addr]) ws[addr].s = { font: { bold: true } };
      }
    });

    const today = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    XLSX.writeFile(wb, `Relatorio_Shopee_Vendas_${today}.xlsx`);
    toast.success("Relatório Excel exportado! 📊");
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary">💰 Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle de investimentos e retornos da loja</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md rounded-2xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-destructive/10 p-3"><TrendingDown className="h-6 w-6 text-destructive" /></div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Investido</p>
                <p className="text-2xl font-extrabold text-destructive">{fmt(totalExpenses)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md rounded-2xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-success/10 p-3"><TrendingUp className="h-6 w-6 text-success" /></div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Retornado</p>
                <p className="text-2xl font-extrabold text-success">{fmt(totalIncome)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md rounded-2xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-accent p-3"><Wallet className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Saldo Atual</p>
                <p className={`text-2xl font-extrabold ${balance >= 0 ? "text-success" : "text-destructive"}`}>{fmt(balance)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Bar Chart */}
        {chartData.length > 0 && (
          <Card className="border-none shadow-md rounded-2xl">
            <CardHeader><CardTitle className="text-lg text-secondary">📊 Visão Mensal</CardTitle></CardHeader>
            <CardContent>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                    <ReTooltip formatter={(value: number) => fmt(value)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontFamily: "Nunito", fontWeight: 600 }} />
                    <Legend />
                    <Bar dataKey="Faturamento" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Custos" fill="hsl(0, 84%, 60%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Lucro" fill="hsl(210, 100%, 50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forms */}
        <Tabs defaultValue="expense" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">🔴 Registrar Investimento</TabsTrigger>
            <TabsTrigger value="income">🟢 Registrar Retorno</TabsTrigger>
          </TabsList>
          <TabsContent value="expense">
            <Card className="border-none shadow-md rounded-2xl">
              <CardHeader><CardTitle className="text-lg text-secondary">Nova Despesa (Saída)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Descrição</Label><Input placeholder="Ex: Compra de Estoque" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Categoria</Label>
                    <Select value={expCategory} onValueChange={setExpCategory}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Estoque">Estoque</SelectItem><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Logística">Logística</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" placeholder="0,00" value={expValue} onChange={(e) => setExpValue(e.target.value)} /></div>
                </div>
                <Button onClick={addExpense} variant="destructive" className="w-full md:w-auto rounded-xl active:scale-95 transition-transform">Adicionar Despesa</Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="income">
            <Card className="border-none shadow-md rounded-2xl">
              <CardHeader><CardTitle className="text-lg text-secondary">Nova Receita (Entrada)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Descrição</Label><Input placeholder="Ex: Venda Shopee #123" value={incDesc} onChange={(e) => setIncDesc(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Valor Líquido (R$)</Label><Input type="number" min="0" step="0.01" placeholder="0,00" value={incValue} onChange={(e) => setIncValue(e.target.value)} /></div>
                </div>
                <Button onClick={addIncome} className="w-full md:w-auto rounded-xl bg-success text-success-foreground hover:bg-success/90 active:scale-95 transition-transform">Adicionar Receita</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* History */}
        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg text-secondary">📜 Extrato</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={exportExcel} className="gap-2 rounded-xl bg-success text-success-foreground hover:bg-success/90 active:scale-95 transition-transform">
                  <FileSpreadsheet className="h-4 w-4" /> Baixar Excel Completo
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 rounded-xl active:scale-95 transition-transform">
                  <Download className="h-4 w-4" /> Baixar Relatório (CSV)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum lançamento ainda.</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <div className="min-w-[600px] px-6">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.type === "expense" ? <TrendingDown className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-success" />}</TableCell>
                          <TableCell className="font-medium">{t.description}</TableCell>
                          <TableCell className="text-muted-foreground">{t.category}</TableCell>
                          <TableCell className="text-muted-foreground">{t.date}</TableCell>
                          <TableCell className={`text-right font-bold ${t.type === "expense" ? "text-destructive" : "text-success"}`}>{t.type === "expense" ? "- " : "+ "}{fmt(t.value)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeTransaction(t.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default FinanceiroPage;
