import { 
  LayoutDashboard, Package, CircleDollarSign, Wrench, 
  Printer, Calculator, ClipboardCheck, CheckSquare, 
  StickyNote, Camera, MessageSquare, Settings, Users 
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link, useLocation } from "react-router-dom";

export function AppSidebar() {
  const location = useLocation();
  const menuItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Estoque", url: "/stock", icon: Package },
    { title: "Financeiro", url: "/financeiro", icon: CircleDollarSign },
  ];

  const toolItems = [
    { title: "Etiquetas", url: "/etiquetas", icon: Printer },
    { title: "Calculadora", url: "/calculadora", icon: Calculator },
    { title: "Expedições", url: "/expedicoes", icon: ClipboardCheck },
    { title: "Tarefas", url: "/tasks", icon: CheckSquare },
    { title: "Bloco de Notas", url: "/notes", icon: StickyNote },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-orange-600 font-bold">VITTA STORE</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                  <Link to={item.url}><item.icon /><span>{item.title}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <Collapsible className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton><Wrench /><span>Ferramentas</span></SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {toolItems.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={location.pathname === item.url}>
                          <Link to={item.url}><item.icon /><span>{item.title}</span></Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
