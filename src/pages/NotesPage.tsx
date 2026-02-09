import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "vitta-notes";

const NotesPage = () => {
  const [content, setContent] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [saved, setSaved] = useState(true);

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, content);
    setSaved(true);
  }, [content]);

  useEffect(() => {
    setSaved(false);
    const timeout = setTimeout(save, 800);
    return () => clearTimeout(timeout);
  }, [content, save]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">📝 Caderno de Estratégias da Vitta</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Anote ideias, rascunhos de descrições, dúvidas e planos.
          </p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
            saved
              ? "bg-success/10 text-success"
              : "bg-accent text-accent-foreground"
          }`}
        >
          {saved ? "✓ Salvo" : "Salvando..."}
        </span>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-5 py-3 flex gap-2">
          <FormatHint>💡 Dicas de produtos</FormatHint>
          <FormatHint>📏 Descrições</FormatHint>
          <FormatHint>❓ Dúvidas</FormatHint>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comece a escrever suas ideias aqui...

Exemplos:
• Descrição para body infantil: 'Body 100% algodão, confortável e durável...'
• Dúvida: Como funciona o frete grátis extra da Shopee?
• Ideia: Criar kits com 3 peças com desconto progressivo"
          className="flex-1 min-h-[500px] w-full resize-none bg-transparent px-6 py-5 text-sm font-medium text-foreground leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>
    </div>
  );
};

function FormatHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
      {children}
    </span>
  );
}

export default NotesPage;
