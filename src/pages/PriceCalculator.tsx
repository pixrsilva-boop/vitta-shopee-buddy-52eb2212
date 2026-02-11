import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MonthGoalWidget } from "@/components/MonthGoalWidget";

const PriceCalculator = () => {
  const [productCost, setProductCost] = useState<string>("");
  const [packagingCost, setPackagingCost] = useState<string>("");
  const [travelCost, setTravelCost] = useState<string>("");
  const [strategy, setStrategy] = useState<"aggressive" | "healthy">("aggressive");

  const marginPercent = strategy === "aggressive" ? 0.1 : 0.2;

  const results = useMemo(() => {
    const costs =
      (parseFloat(productCost) || 0) +
      (parseFloat(packagingCost) || 0) +
      (parseFloat(travelCost) || 0);

    if (costs <= 0) return null;

    // Price * (1 - 0.20 - margin) = costs + 3
    const price = (costs + 3) / (1 - 0.20 - marginPercent);
    const shopeeFee = price * 0.2 + 3;
    const profit = price * marginPercent;

    return {
      price: price,
      profit: profit,
      shopeeFee: shopeeFee,
      totalCost: costs,
      chartData: [
        { name: "Taxas Shopee", value: shopeeFee, color: "hsl(16, 100%, 66%)" },
        { name: "Custo Total", value: costs, color: "hsl(210, 30%, 70%)" },
        { name: "Lucro Líquido", value: profit, color: "hsl(142, 71%, 45%)" },
      ],
    };
  }, [productCost, packagingCost, travelCost, marginPercent]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Month Goal Widget */}
      <MonthGoalWidget />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground">🧮 Calculadora de Preços</h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Precifique seus produtos para a Shopee de forma inteligente.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold text-foreground mb-4">Custos do Produto</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            label="Custo do Produto (Un.)"
            value={productCost}
            onChange={setProductCost}
            placeholder="0,00"
          />
          <InputField
            label="Embalagem/Tags (Un.)"
            value={packagingCost}
            onChange={setPackagingCost}
            placeholder="0,00"
          />
          <InputField
            label="Custos de Viagem (Rateio)"
            value={travelCost}
            onChange={setTravelCost}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Strategy */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold text-foreground mb-4">Estratégia de Venda</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStrategy("aggressive")}
            className={`p-4 rounded-xl border-2 text-left transition-all font-semibold ${
              strategy === "aggressive"
                ? "border-primary bg-primary/10 text-primary shadow-md"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            <span className="text-2xl block mb-1">🚀</span>
            <span className="text-sm font-bold block">Agressiva</span>
            <span className="text-xs opacity-80">Ganhar Tração — 10% margem</span>
          </button>
          <button
            onClick={() => setStrategy("healthy")}
            className={`p-4 rounded-xl border-2 text-left transition-all font-semibold ${
              strategy === "healthy"
                ? "border-success bg-success/10 text-success shadow-md"
                : "border-border text-muted-foreground hover:border-success/30"
            }`}
          >
            <span className="text-2xl block mb-1">💰</span>
            <span className="text-sm font-bold block">Boa Lucratividade</span>
            <span className="text-xs opacity-80">Saudável — 20% margem</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-primary rounded-2xl p-6 text-primary-foreground shadow-lg">
              <p className="text-sm font-bold uppercase tracking-wider opacity-80">
                Preço de Venda na Shopee
              </p>
              <p className="text-4xl font-extrabold mt-2">
                {formatCurrency(results.price)}
              </p>
            </div>
            <div className="bg-success rounded-2xl p-6 text-success-foreground shadow-lg">
              <p className="text-sm font-bold uppercase tracking-wider opacity-80">
                Seu Lucro Líquido Real
              </p>
              <p className="text-4xl font-extrabold mt-2">
                {formatCurrency(results.profit)}
              </p>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Para onde vai o dinheiro da venda
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-52 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={results.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {results.chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        fontFamily: "Nunito",
                        fontWeight: 600,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {results.chartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.value)} (
                        {((item.value / results.price) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!results && (
        <div className="bg-card rounded-2xl p-10 shadow-sm border text-center">
          <p className="text-5xl mb-3">📊</p>
          <p className="text-muted-foreground font-semibold">
            Preencha os custos acima para ver o preço sugerido
          </p>
        </div>
      )}
    </div>
  );
};

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-foreground block mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
          R$
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border bg-background px-3 pl-10 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
    </div>
  );
}

export default PriceCalculator;
