import { 
  Calculator, ClipboardList, StickyNote, MessageCircle, 
  Package, DollarSign, Camera, Factory, LogOut, 
  Settings, Archive, Tag, Wrench, ChevronDown 
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// 1. Itens Principais do Negócio
const mainItems = [
  { title: "Calculadora de Preços", url: "/", icon: Calculator, emoji: "🧮" },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, emoji: "💰" },
  { title: "Meu Estoque", url: "/estoque", icon: Archive, emoji: "🗃️" },
  { title: "Fornecedores", url: "/fornecedores", icon: Factory, emoji: "🏭" },
  { title: "Etiquetas", url: "/etiquetas", icon: Tag, emoji: "🏷️" },
];

// 2. Ferramentas Operacionais (Serão Agrupadas)
const toolItems = [
  { title: "Expedição", url: "/expedicao", icon: Package, emoji: "📦" },
  { title: "Organização & Tarefas", url: "/tarefas", icon: ClipboardList, emoji: "📋" },
  { title: "Bloco de Notas", url: "/notas", icon: StickyNote, emoji: "📝" },
  { title: "Estúdio", url: "/estudio", icon: Camera, emoji: "📸" },
  { title: "Respostas Rápidas", url: "/respostas", icon: MessageCircle, emoji: "💬" },
];

export function AppSidebar() {
  const location = useLocation();
  const { storeName, signOut } = useAuth();

  // Verifica se alguma ferramenta está ativa para manter o menu aberto
  const isToolActive = toolItems.some(item => location.pathname === item.url);

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
            <SidebarMenu>
              
              {/* Renderiza os Itens Principais */}
              {mainItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-3 py-3">
                        <span className="text-lg">{item.emoji}</span>
                        <span className="font-semibold">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Renderiza o Menu Retrátil de Ferramentas */}
              <Collapsible defaultOpen={isToolActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Ferramentas">
                      <Wrench className="w-5 h-5 text-sidebar-foreground/70" />
                      <span className="font-semibold ml-1 text-sidebar-foreground/70">Ferramentas</span>
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {toolItems.map((item) => {
                        const isActive = location.pathname === item.url;
                        return (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link to={item.url} className="flex items-center gap-2">
                                <span className="text-sm">{item.emoji}</span>
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Rodapé: Configurações e Sair */}
      <div className="p-4 mt-auto space-y-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === "/configuracoes"}>
              <Link to="/configuracoes" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="font-semibold">Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair do Sistema
        </button>
      </div>
    </Sidebar>
  );
}
