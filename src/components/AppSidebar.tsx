import { Calculator, ClipboardList, StickyNote } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const items = [
  { title: "Calculadora de Preços", url: "/", icon: Calculator, emoji: "🧮" },
  { title: "Organização & Tarefas", url: "/tarefas", icon: ClipboardList, emoji: "📋" },
  { title: "Bloco de Notas", url: "/notas", icon: StickyNote, emoji: "📝" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r-0">
      <div className="p-5 pb-2">
        <h1 className="text-xl font-extrabold tracking-tight text-sidebar-primary-foreground">
          🍊 Vitta
        </h1>
        <p className="text-xs font-semibold text-sidebar-foreground/60 tracking-wider uppercase mt-0.5">
          Store Manager
        </p>
      </div>
      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                        activeClassName=""
                      >
                        <span className="text-lg">{item.emoji}</span>
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="p-4 mt-auto">
        <div className="rounded-xl bg-sidebar-accent/50 p-3 text-center">
          <p className="text-xs text-sidebar-foreground/60 font-medium">
            Feito com 🧡 para Vitta
          </p>
        </div>
      </div>
    </Sidebar>
  );
}
