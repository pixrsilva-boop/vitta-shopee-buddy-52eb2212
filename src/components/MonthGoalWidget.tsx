import { useState } from "react";
import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function MonthGoalWidget() {
  const [goalAmount, setGoalAmount] = useState<string>("");
  const [profitPerPiece, setProfitPerPiece] = useState<string>("");

  const goal = parseFloat(goalAmount) || 0;
  const perPiece = parseFloat(profitPerPiece) || 0;
  const piecesNeeded = perPiece > 0 ? Math.ceil(goal / perPiece) : 0;
  const hasResult = goal > 0 && perPiece > 0;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-6 h-6 text-primary" />
        <h2 className="text-lg font-bold text-foreground">🎯 Meta do Mês</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-bold text-foreground block mb-1.5">
            Minha Meta de Lucro (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
              R$
            </span>
            <input
              type="number"
              min="0"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="1000"
              className="w-full rounded-xl border bg-background px-3 pl-10 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-bold text-foreground block mb-1.5">
            Lucro Médio por Peça (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
              R$
            </span>
            <input
              type="number"
              min="0"
              value={profitPerPiece}
              onChange={(e) => setProfitPerPiece(e.target.value)}
              placeholder="15"
              className="w-full rounded-xl border bg-background px-3 pl-10 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>
      </div>

      {hasResult ? (
        <div className="space-y-3">
          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-muted-foreground">Você precisa vender</p>
            <p className="text-4xl font-extrabold text-primary mt-1">
              {piecesNeeded} peças
            </p>
            <p className="text-sm font-bold text-muted-foreground mt-1">para bater a meta!</p>
          </div>
          <Progress value={0} className="h-3 rounded-full" />
          <p className="text-center text-sm font-semibold text-muted-foreground">
            Vamos lá, falta pouco para dominar a Shopee! 🚀
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground font-medium py-4">
          Preencha os valores acima para calcular sua meta 🎯
        </p>
      )}
    </div>
  );
}
