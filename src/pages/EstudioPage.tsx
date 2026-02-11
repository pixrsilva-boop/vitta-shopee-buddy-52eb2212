import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, ImageIcon } from "lucide-react";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

const EstudioPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [productImage, setProductImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [logoSize, setLogoSize] = useState(20); // % of image width
  const [opacity, setOpacity] = useState(80);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !productImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = productImage.naturalWidth;
    canvas.height = productImage.naturalHeight;

    ctx.drawImage(productImage, 0, 0);

    // Draw logo or placeholder
    const logoW = (canvas.width * logoSize) / 100;
    const logoH = logoImage
      ? (logoImage.naturalHeight / logoImage.naturalWidth) * logoW
      : logoW;

    const padding = canvas.width * 0.03;
    let x = padding;
    let y = padding;

    switch (position) {
      case "top-right":
        x = canvas.width - logoW - padding;
        break;
      case "bottom-left":
        y = canvas.height - logoH - padding;
        break;
      case "bottom-right":
        x = canvas.width - logoW - padding;
        y = canvas.height - logoH - padding;
        break;
      case "center":
        x = (canvas.width - logoW) / 2;
        y = (canvas.height - logoH) / 2;
        break;
    }

    ctx.globalAlpha = opacity / 100;

    if (logoImage) {
      ctx.drawImage(logoImage, x, y, logoW, logoH);
    } else {
      // placeholder circle with "Vitta"
      ctx.fillStyle = "hsl(16, 100%, 66%)";
      const r = logoW / 2;
      ctx.beginPath();
      ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${r * 0.6}px Nunito, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Vitta", x + r, y + r);
    }

    ctx.globalAlpha = 1;
  }, [productImage, logoImage, position, logoSize, opacity]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setProductImage(img);
    img.src = URL.createObjectURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setLogoImage(img);
    img.src = URL.createObjectURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "vitta-produto.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const positions: { label: string; value: Position }[] = [
    { label: "↖ Sup. Esq.", value: "top-left" },
    { label: "↗ Sup. Dir.", value: "top-right" },
    { label: "⊙ Centro", value: "center" },
    { label: "↙ Inf. Esq.", value: "bottom-left" },
    { label: "↘ Inf. Dir.", value: "bottom-right" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary">📸 Estúdio Vitta</h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Aplique a logomarca nos seus produtos automaticamente.
        </p>
      </div>

      {/* Upload area */}
      {!productImage ? (
        <Card
          className="border-2 border-dashed border-primary/40 cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Upload className="h-12 w-12 text-primary" />
            <p className="text-muted-foreground font-semibold text-center">
              Arraste uma foto ou clique para carregar (JPG/PNG)
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Preview */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-4">
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-xl"
              />
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-md">
              <CardContent className="p-5 space-y-5">
                <div>
                  <p className="text-sm font-bold text-foreground mb-2">Logo da Marca</p>
                  <Button
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {logoImage ? "Trocar Logo" : "Carregar Logo (PNG)"}
                  </Button>
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground mb-2">Posição</p>
                  <div className="grid grid-cols-3 gap-2">
                    {positions.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPosition(p.value)}
                        className={`text-xs font-semibold py-2 px-1 rounded-lg border-2 transition-all ${
                          position === p.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-5 space-y-5">
                <div>
                  <p className="text-sm font-bold text-foreground mb-2">
                    Tamanho: {logoSize}%
                  </p>
                  <Slider
                    value={[logoSize]}
                    onValueChange={([v]) => setLogoSize(v)}
                    min={5}
                    max={50}
                    step={1}
                  />
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground mb-2">
                    Opacidade: {opacity}%
                  </p>
                  <Slider
                    value={[opacity]}
                    onValueChange={([v]) => setOpacity(v)}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleDownload} className="flex-1 gap-2">
                    <Download className="h-4 w-4" />
                    Baixar Foto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProductImage(null);
                      setLogoImage(null);
                    }}
                  >
                    Nova Foto
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleProductUpload}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={handleLogoUpload}
      />
    </div>
  );
};

export default EstudioPage;
