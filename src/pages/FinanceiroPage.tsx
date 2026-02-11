import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, TrendingUp, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: "expense" | "income";
  description: string;
  category: string;
  value: number;
  date: string;
}

const STORAGE_KEY = "vitta-financeiro";

const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const FinanceiroPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);

  // Expense form
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expValue, setExpValue] = useState("");

  // Income form
  const [incDesc, setIncDesc] = useState("");
  const [incValue, setIncValue] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const { totalExpenses, totalIncome, balance } = useMemo(() => {
    let totalExpenses = 0;
    let totalIncome = 0;
    for (const t of transactions) {
      if (t.type === "expense") totalExpenses += t.value;
      else totalIncome += t.value;
    }
    return { totalExpenses, totalIncome, balance: totalIncome - totalExpenses };
  }, [transactions]);

  const addExpense = () => {
    if (!expDesc.trim() || !expCategory || !expValue) {
      toast.error("Preencha todos os campos da despesa.");
      return;
    }
    const value = parseFloat(expValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    setTransactions((prev) => [
      {
        id: crypto.randomUUID(),
        type: "expense",
        description: expDesc.trim(),
        category: expCategory,
        value,
        date: new Date().toLocaleDateString("pt-BR"),
      },
      ...prev,
    ]);
    setExpDesc("");
    setExpCategory("");
    setExpValue("");
    toast.success("Despesa adicionada!");
  };

  const addIncome = () => {
    if (!incDesc.trim() || !incValue) {
      toast.error("Preencha todos os campos da receita.");
      return;
    }
    const value = parseFloat(incValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    setTransactions((prev) => [
      {
        id: crypto.randomUUID(),
        type: "income",
        description: incDesc.trim(),
        category: "Venda",
        value,
        date: new Date().toLocaleDateString("pt-BR"),
      },
      ...prev,
    ]);
    setIncDesc("");
    setIncValue("");
    toast.success("Receita adicionada!");
  };

  const removeTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast("Lançamento removido.");
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary">💰 Financeiro Vitta</h1>
        <p className="text-muted-foreground mt-1">Controle de investimentos e retornos da loja</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-destructive/10 p-3">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Total Investido</p>
              <p className="text-2xl font-extrabold text-destructive">{fmt(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-success/10 p-3">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Total Retornado</p>
              <p className="text-2xl font-extrabold text-success">{fmt(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-accent p-3">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Saldo Atual</p>
              <p className={`text-2xl font-extrabold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
                {fmt(balance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forms */}
      <Tabs defaultValue="expense" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense">🔴 Registrar Investimento</TabsTrigger>
          <TabsTrigger value="income">🟢 Registrar Retorno</TabsTrigger>
        </TabsList>

        <TabsContent value="expense">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-secondary">Nova Despesa (Saída)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex: Compra de Estoque"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={expCategory} onValueChange={setExpCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Estoque">Estoque</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Logística">Logística</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={expValue}
                    onChange={(e) => setExpValue(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={addExpense}
                variant="destructive"
                className="w-full md:w-auto"
              >
                Adicionar Despesa
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-secondary">Nova Receita (Entrada)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex: Venda Shopee #123"
                    value={incDesc}
                    onChange={(e) => setIncDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Líquido (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={incValue}
                    onChange={(e) => setIncValue(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={addIncome}
                className="w-full md:w-auto bg-success text-success-foreground hover:bg-success/90"
              >
                Adicionar Receita
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* History */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg text-secondary">📜 Extrato Vitta</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum lançamento ainda. Comece registrando uma movimentação acima!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.type === "expense" ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-success" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{t.category}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{t.date}</TableCell>
                    <TableCell
                      className={`text-right font-bold ${t.type === "expense" ? "text-destructive" : "text-success"}`}
                    >
                      {t.type === "expense" ? "- " : "+ "}
                      {fmt(t.value)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTransaction(t.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroPage;
