import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShoppingBag, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta! 🎉");
      } else {
        if (!storeName.trim()) {
          toast.error("Preencha o nome da sua loja.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { store_name: storeName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro. 📧");
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F5F5F5" }}>
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#EE4D2D" }}>
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#003366" }}>
              Shopee Vendas
            </h1>
            <p className="text-sm font-semibold text-muted-foreground">
              Organização Inteligente
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label>Nome da sua Loja *</Label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: Vitta Store"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full text-white font-bold"
              style={{ backgroundColor: "#EE4D2D" }}
              disabled={loading}
            >
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Cadastrar"}
            </Button>
          </form>
          <p className="text-center text-sm mt-4 text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold hover:underline"
              style={{ color: "#EE4D2D" }}
            >
              {isLogin ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
