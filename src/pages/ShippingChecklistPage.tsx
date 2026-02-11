import { useState, useEffect } from "react";
import { Package, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const checklistItems = [
  "Conferiu Tamanho e Cor?",
  "Revisou defeitos?",
  "Passou o cheirinho?",
  "Colocou o Cartão de Agradecimento?",
  "Colou a Etiqueta de Envio?",
];

export default function ShippingChecklistPage() {
  const [checked, setChecked] = useState<boolean[]>(
    () => Array(checklistItems.length).fill(false)
  );
  const [packagesCount, setPackagesCount] = useState<number>(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("vitta-shipping");
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) return data.count;
    }
    return 0;
  });
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "vitta-shipping",
      JSON.stringify({ date: new Date().toDateString(), count: packagesCount })
    );
  }, [packagesCount]);

  const allChecked = checked.every(Boolean);

  const handleNewPackage = () => {
    if (showChecklist && allChecked) {
      setPackagesCount((c) => c + 1);
      toast.success("Pacote expedido! 📦🎉");
    }
    setChecked(Array(checklistItems.length).fill(false));
    setShowChecklist(true);
  };

  const toggleItem = (index: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const completedCount = checked.filter(Boolean).length;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
          <Package className="w-8 h-8 text-primary" />
          Expedição Vitta
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Checklist de envio para garantir qualidade em cada pacote.
        </p>
      </div>

      {/* Counter */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border text-center">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Pacotes Expedidos Hoje
        </p>
        <p className="text-5xl font-extrabold text-primary mt-2">{packagesCount}</p>
      </div>

      {/* New Package Button */}
      <button
        onClick={handleNewPackage}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-extrabold shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        {showChecklist && allChecked ? (
          <>
            <Package className="w-5 h-5" /> Confirmar & Novo Pacote
          </>
        ) : (
          <>
            <RotateCcw className="w-5 h-5" /> Novo Pacote
          </>
        )}
      </button>

      {/* Checklist */}
      {showChecklist && (
        <div className="bg-card rounded-2xl p-6 shadow-sm border space-y-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Checklist</h2>
            <span className="text-sm font-bold text-muted-foreground">
              {completedCount}/{checklistItems.length}
            </span>
          </div>
          {checklistItems.map((item, i) => (
            <label
              key={i}
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                checked[i]
                  ? "bg-success/10"
                  : "hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={checked[i]}
                onCheckedChange={() => toggleItem(i)}
                className="h-6 w-6 rounded-lg"
              />
              <span
                className={`text-base font-semibold ${
                  checked[i]
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
