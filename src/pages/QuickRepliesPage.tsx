import { useState, useEffect } from "react";
import { Copy, Check, MessageCircle, Edit2, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface ReplyCard {
  id: string;
  title: string;
  text: string;
}

interface Category {
  name: string;
  emoji: string;
  cards: ReplyCard[];
}

const defaultCategories: Category[] = [
  {
    name: "Tamanho",
    emoji: "📏",
    cards: [
      { id: "t1", title: "Dúvida de Tamanho", text: "Olá! Nossa modelagem é padrão. Se a criança for grandinha, sugerimos um número maior! 🧡" },
      { id: "t2", title: "Tabela de Medidas", text: "Oi! Temos uma tabela de medidas nas fotos do anúncio. Qualquer dúvida sobre as medidas, estou à disposição! 😊" },
      { id: "t3", title: "Troca de Tamanho", text: "Caso o tamanho não sirva, fazemos a troca sem problemas! Basta entrar em contato em até 7 dias após o recebimento. 🧡" },
    ],
  },
  {
    name: "Envio",
    emoji: "📦",
    cards: [
      { id: "e1", title: "Prazo de Envio", text: "Olá! Enviamos em até 2 dias úteis após a confirmação do pagamento. O prazo de entrega depende da transportadora escolhida! 🚚" },
      { id: "e2", title: "Rastreamento", text: "Oi! O código de rastreamento é enviado automaticamente pela Shopee assim que postamos. Fique de olho nas atualizações! 📬" },
    ],
  },
  {
    name: "Pós-Venda",
    emoji: "⭐",
    cards: [
      { id: "p1", title: "Pedido de Avaliação", text: "Que bom que gostou! 🥰 Se puder deixar uma avaliação com foto na Shopee, ajuda muito nossa lojinha! Obrigada! 🧡" },
      { id: "p2", title: "Problema com Produto", text: "Sentimos muito pelo inconveniente! 😔 Por favor, envie uma foto do problema e resolveremos o mais rápido possível. Sua satisfação é nossa prioridade! 🧡" },
    ],
  },
  {
    name: "Objeções",
    emoji: "💬",
    cards: [
      { id: "o1", title: "Preço Alto", text: "Entendo! Nossos produtos têm qualidade premium e excelente acabamento. Vale cada centavo quando você vê no seu filho(a)! 🧡 Além disso, temos promoções frequentes!" },
      { id: "o2", title: "Frete Caro", text: "Oi! O valor do frete é calculado pela Shopee com base no seu CEP. Fique de olho nas promoções de frete grátis da plataforma! 🚚✨" },
    ],
  },
];

const STORAGE_KEY = "vitta-quick-replies";

export default function QuickRepliesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Estados para edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", text: "" });

  // Carregar dados guardados ou usar os padrão
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCategories(JSON.parse(saved));
      } catch (e) {
        setCategories(defaultCategories);
      }
    } else {
      setCategories(defaultCategories);
    }
  }, []);

  // Guardar alterações automaticamente
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    }
  }, [categories]);

  const handleCopy = async (card: ReplyCard) => {
    await navigator.clipboard.writeText(card.text);
    setCopiedId(card.id);
    toast.success("Texto copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (card: ReplyCard) => {
    setEditingId(card.id);
    setEditForm({ title: card.title, text: card.text });
  };

  const saveEdit = (categoryName: string, cardId: string) => {
    if (!editForm.title.trim() || !editForm.text.trim()) {
      toast.error("O título e o texto não podem estar vazios.");
      return;
    }

    setCategories(cats => cats.map(cat => {
      if (cat.name === categoryName) {
        return {
          ...cat,
          cards: cat.cards.map(c => c.id === cardId ? { ...c, title: editForm.title, text: editForm.text } : c)
        };
      }
      return cat;
    }));
    setEditingId(null);
    toast.success("Resposta atualizada!");
  };

  const deleteCard = (categoryName: string, cardId: string) => {
    if (!confirm("Tem a certeza que deseja eliminar esta resposta?")) return;
    
    setCategories(cats => cats.map(cat => {
      if (cat.name === categoryName) {
        return { ...cat, cards: cat.cards.filter(c => c.id !== cardId) };
      }
      return cat;
    }));
    toast.success("Resposta eliminada!");
  };

  const addNewCard = (categoryName: string) => {
    const newCard: ReplyCard = {
      id: `new-${Date.now()}`,
      title: "Novo Título",
      text: "Escreva a sua resposta aqui..."
    };

    setCategories(cats => cats.map(cat => {
      if (cat.name === categoryName) {
        return { ...cat, cards: [...cat.cards, newCard] };
      }
      return cat;
    }));
    
    // Inicia a edição automaticamente no novo card
    startEdit(newCard);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-primary" />
            Respostas Rápidas
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Gira, edite e copie respostas para o chat da Shopee.
          </p>
        </div>
        <button 
          onClick={() => {
            if(confirm("Deseja restaurar as respostas originais do sistema? Irá perder as suas edições.")) {
              setCategories(defaultCategories);
              toast.success("Respostas originais restauradas!");
            }
          }}
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
        >
          Restaurar Padrão
        </button>
      </div>

      {categories.map((cat) => (
        <div key={cat.name} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span>{cat.emoji}</span> {cat.name}
            </h2>
            <button
              onClick={() => addNewCard(cat.name)}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.cards.map((card) => (
              <div
                key={card.id}
                className={`bg-card rounded-2xl p-5 shadow-sm border flex flex-col gap-3 transition-all ${editingId === card.id ? 'ring-2 ring-primary/20 border-primary/30' : 'hover:border-primary/20'}`}
              >
                {editingId === card.id ? (
                  // MODO DE EDIÇÃO
                  <div className="flex flex-col gap-3 flex-1">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="font-bold text-sm w-full p-2 rounded-lg border focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Título da resposta"
                    />
                    <textarea
                      value={editForm.text}
                      onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                      className="text-sm w-full p-2 rounded-lg border focus:ring-2 focus:ring-primary outline-none flex-1 min-h-[100px] resize-none"
                      placeholder="Texto da resposta..."
                    />
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <button
                        onClick={() => saveEdit(cat.name, card.id)}
                        className="flex-1 flex justify-center items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 transition-colors"
                      >
                        <Save className="w-4 h-4" /> Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // MODO DE VISUALIZAÇÃO
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground text-sm leading-tight">{card.title}</h3>
                      <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(card)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600" title="Editar">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteCard(cat.name, card.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-500" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground flex-1 leading-relaxed whitespace-pre-wrap">
                      {card.text}
                    </p>
                    
                    <button
                      onClick={() => handleCopy(card)}
                      className="w-full mt-2 inline-flex justify-center items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all active:scale-95"
                    >
                      {copiedId === card.id ? (
                        <>
                          <Check className="w-4 h-4" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copiar para o Chat
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            ))}
            
            {cat.cards.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-2xl">
                Nenhuma resposta nesta categoria. Clique em "Adicionar".
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
