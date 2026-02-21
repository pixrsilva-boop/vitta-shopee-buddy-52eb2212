import { useState, useEffect } from "react";
import { Calculator, ClipboardList, StickyNote, MessageCircle, Package, DollarSign, Camera, Factory, GripVertical, LogOut, Settings, Archive, Tag } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const DEFAULT_ITEMS = [
  { id: "calc", title: "Calculadora de Preços", url: "/", icon: Calculator, emoji: "🧮" },
  { id: "respostas", title: "Respostas Rápidas", url: "/respostas", icon: MessageCircle, emoji: "💬" },
  { id: "expedicao", title: "Expedição", url: "/expedicao", icon: Package, emoji: "📦" },
  { id: "tarefas", title: "Organização & Tarefas", url: "/tarefas", icon: ClipboardList, emoji: "📋" },
  { id: "notas", title: "Bloco de Notas", url: "/notas", icon: StickyNote, emoji: "📝" },
  { id: "financeiro", title: "Financeiro", url: "/financeiro", icon: DollarSign, emoji: "💰" },
  { id: "estoque", title: "Meu Estoque", url: "/estoque", icon: Archive, emoji: "🗃️" },
  { id: "estudio", title: "Estúdio", url: "/estudio", icon: Camera, emoji: "📸" },
  { id: "fornecedores", title: "Fornecedores", url: "/fornecedores", icon: Factory, emoji: "🏭" },
  { id: "etiquetas", title: "Etiquetas", url: "/etiquetas", icon: Tag, emoji: "🏷️" },
  { id: "config", title: "Configurações", url: "/configuracoes", icon: Settings, emoji: "⚙️" },
];

const STORAGE_KEY = "vitta-sidebar-order";

const loadOrder = (): typeof DEFAULT_ITEMS => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
    if (saved.length === 0) return DEFAULT_ITEMS;
    const map = new Map(DEFAULT_ITEMS.map((i) => [i.id, i]));
    const ordered = saved.filter((id) => map.has(id)).map((id) => map.get(id)!);
    const remaining = DEFAULT_ITEMS.filter((i) => !saved.includes(i.id));
    return [...ordered, ...remaining];
  } catch {
    return DEFAULT_ITEMS;
  }
};

export function AppSidebar() {
  const location = useLocation();
  const { storeName, signOut } = useAuth();
  const [items, setItems] = useState(loadOrder);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((i) => i.id)));
  }, [items]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };

  return (
    <Sidebar className="border-r-0">
      <div className="p-5 pb-2">
        <h1 className="text-xl font-extrabold tracking-tight text-sidebar-primary-foreground">
          🛍️ Shopee Vendas
        </h1>
        <p className="text-xs font-semibold text-sidebar-foreground/60 tracking-wider uppercase mt-0.5">
          {storeName || "Organização Inteligente"}
        </p>
      </div>
      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="sidebar-menu">
                {(provided) => (
                  <SidebarMenu ref={provided.innerRef} {...provided.droppableProps}>
                    {items.map((item, index) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <SidebarMenuItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={provided.draggableProps.style}
                            >
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={item.url}
                                  end
                                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                    isActive
                                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                  } ${snapshot.isDragging ? "opacity-80 shadow-xl" : ""}`}
                                  activeClassName=""
                                >
                                  <span
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-colors"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </span>
                                  <span className="text-lg">{item.emoji}</span>
                                  <span>{item.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </SidebarMenu>
                )}
              </Droppable>
            </DragDropContext>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="p-4 mt-auto space-y-3">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
        <div className="rounded-xl bg-sidebar-accent/50 p-3 text-center">
          <p className="text-xs text-sidebar-foreground/60 font-medium">
            Feito com 🧡 para vendedores
          </p>
        </div>
      </div>
    </Sidebar>
  );
}
