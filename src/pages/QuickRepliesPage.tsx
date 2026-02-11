import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ReplyCard {
  id: string;
  title: string;
  text: string;
}

const categories: { name: string; emoji: string; cards: ReplyCard[] }[] = [
  {
    name: "Tamanho",
    emoji: "📏",
    cards: [
      {
        id: "t1",
        title: "Dúvida de Tamanho",
        text: "Olá! Nossa modelagem é padrão. Se a criança for grandinha, sugerimos um número maior! 🧡",
      },
      {
        id: "t2",
        title: "Tabela de Medidas",
        text: "Oi! Temos uma tabela de medidas nas fotos do anúncio. Qualquer dúvida sobre as medidas, estou à disposição! 😊",
      },
      {
        id: "t3",
        title: "Troca de Tamanho",
        text: "Caso o tamanho não sirva, fazemos a troca sem problemas! Basta entrar em contato em até 7 dias após o recebimento. 🧡",
      },
    ],
  },
  {
    name: "Envio",
    emoji: "📦",
    cards: [
      {
        id: "e1",
        title: "Prazo de Envio",
        text: "Olá! Enviamos em até 2 dias úteis após a confirmação do pagamento. O prazo de entrega depende da transportadora escolhida! 🚚",
      },
      {
        id: "e2",
        title: "Rastreamento",
        text: "Oi! O código de rastreamento é enviado automaticamente pela Shopee assim que postamos. Fique de olho nas atualizações! 📬",
      },
    ],
  },
  {
    name: "Pós-Venda",
    emoji: "⭐",
    cards: [
      {
        id: "p1",
        title: "Pedido de Avaliação",
        text: "Que bom que gostou! 🥰 Se puder deixar uma avaliação com foto na Shopee, ajuda muito nossa lojinha! Obrigada! 🧡",
      },
      {
        id: "p2",
        title: "Problema com Produto",
        text: "Sentimos muito pelo inconveniente! 😔 Por favor, envie uma foto do problema e resolveremos o mais rápido possível. Sua satisfação é nossa prioridade! 🧡",
      },
    ],
  },
  {
    name: "Objeções",
    emoji: "💬",
    cards: [
      {
        id: "o1",
        title: "Preço Alto",
        text: "Entendo! Nossos produtos têm qualidade premium e excelente acabamento. Vale cada centavo quando você vê no seu filho(a)! 🧡 Além disso, temos promoções frequentes!",
      },
      {
        id: "o2",
        title: "Frete Caro",
        text: "Oi! O valor do frete é calculado pela Shopee com base no seu CEP. Fique de olho nas promoções de frete grátis da plataforma! 🚚✨",
      },
    ],
  },
];

export default function QuickRepliesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (card: ReplyCard) => {
    await navigator.clipboard.writeText(card.text);
    setCopiedId(card.id);
    toast.success("Texto copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-primary" />
          Respostas Rápidas
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Copie e cole respostas prontas no chat da Shopee.
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat.name}>
          <h2 className="text-lg font-bold text-foreground mb-3">
            {cat.emoji} {cat.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.cards.map((card) => (
              <div
                key={card.id}
                className="bg-card rounded-2xl p-5 shadow-sm border flex flex-col gap-3"
              >
                <h3 className="font-bold text-foreground text-sm">{card.title}</h3>
                <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                  {card.text}
                </p>
                <button
                  onClick={() => handleCopy(card)}
                  className="self-end inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {copiedId === card.id ? (
                    <>
                      <Check className="w-4 h-4" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
