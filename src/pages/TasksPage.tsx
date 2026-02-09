import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface TaskSection {
  id: string;
  title: string;
  emoji: string;
  items: TaskItem[];
}

const defaultSections: TaskSection[] = [
  {
    id: "suppliers",
    title: "Fornecedores a Contatar",
    emoji: "🏢",
    items: [
      { id: "1", text: "Fornecedor de roupas infantis — atacado SP", done: false },
      { id: "2", text: "Fornecedor de acessórios — Brás", done: false },
      { id: "3", text: "Pesquisar fornecedores no 1688/AliExpress", done: false },
    ],
  },
  {
    id: "shipping",
    title: "Kit Expedição & Estoque",
    emoji: "📦",
    items: [
      { id: "4", text: "Envelopes de segurança", done: false },
      { id: "5", text: "Papel de seda", done: false },
      { id: "6", text: "Fita adesiva personalizada", done: false },
      { id: "7", text: "Prateleiras / organizadores", done: false },
      { id: "8", text: "Etiquetas e tags da marca", done: false },
    ],
  },
  {
    id: "marketing",
    title: "Ações de Marketing",
    emoji: "🚀",
    items: [
      { id: "9", text: "Criar Instagram @vittastore", done: false },
      { id: "10", text: "Tirar fotos do primeiro lote", done: false },
      { id: "11", text: "Cadastrar primeiros 4 produtos na Shopee", done: false },
      { id: "12", text: "Criar logo e identidade visual", done: false },
    ],
  },
];

const STORAGE_KEY = "vitta-tasks";

const TasksPage = () => {
  const [sections, setSections] = useState<TaskSection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultSections;
  });
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  }, [sections]);

  const toggleItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, done: !i.done } : i
              ),
            }
          : s
      )
    );
  };

  const addItem = (sectionId: string) => {
    const text = newItemTexts[sectionId]?.trim();
    if (!text) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: [
                ...s.items,
                { id: Date.now().toString(), text, done: false },
              ],
            }
          : s
      )
    );
    setNewItemTexts((p) => ({ ...p, [sectionId]: "" }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      )
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground">📋 Organização & Tarefas</h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Gerencie tudo que precisa para lançar sua loja.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {sections.map((section) => {
          const doneCount = section.items.filter((i) => i.done).length;
          const total = section.items.length;
          const progress = total > 0 ? (doneCount / total) * 100 : 0;

          return (
            <div key={section.id} className="bg-card rounded-2xl p-5 shadow-sm border flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{section.emoji}</span>
                <h2 className="text-sm font-extrabold text-foreground">{section.title}</h2>
              </div>
              <p className="text-xs text-muted-foreground font-semibold mb-3">
                {doneCount}/{total} completas
              </p>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="space-y-2 flex-1">
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 group"
                  >
                    <button
                      onClick={() => toggleItem(section.id, item.id)}
                      className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        item.done
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {item.done && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6L5 8.5L9.5 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`text-sm font-medium flex-1 ${
                        item.done ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => removeItem(section.id, item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={newItemTexts[section.id] || ""}
                  onChange={(e) =>
                    setNewItemTexts((p) => ({ ...p, [section.id]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addItem(section.id)}
                  placeholder="Novo item..."
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => addItem(section.id)}
                  className="bg-primary text-primary-foreground rounded-lg p-2 hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TasksPage;
