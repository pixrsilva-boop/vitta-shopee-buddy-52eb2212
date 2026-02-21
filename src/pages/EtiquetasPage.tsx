import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileDown, RotateCcw, Printer, FileText, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "@/hooks/use-toast";
import * as pdfjsLib from "pdfjs-dist";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/* ───── types ───── */
interface ProdItem {
  n: string;
  desc: string;
  var: string;
  qtd: string | number;
  val: string;
}
interface LabelData {
  rastreio: string;
  contrato: string;
  idPedido: string;
  modal: string;
  destNome: string;
  destEnd: string;
  destBairro: string;
  destCidade: string;
  destUf: string;
  destCep: string;
  remNome: string;
  remEnd: string;
  remCidade: string;
  remUf: string;
  remCep: string;
  prods: ProdItem[];
  totalQtd: number;
  totalVal: string;
}

type Fmt = "t" | "a";
type Status = { msg: string; type: "info" | "loading" | "success" | "error" } | null;

/* ───── label-specific CSS (pixel-perfect, NO tailwind) ───── */
const LS: Record<string, React.CSSProperties> = {
  root: { width: 283, background: "#fff", border: "1.5px solid #000", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", color: "#000", fontSize: 8, flexShrink: 0 },
  hdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 6px 4px", borderBottom: "1px solid #000" },
  logo: { display: "flex", alignItems: "flex-start", gap: 5 },
  sico: { width: 22, height: 22, border: "2px solid #000", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#000", flexShrink: 0 },
  sname: { fontSize: 17, fontWeight: 900, lineHeight: 1 },
  idlbl: { fontSize: 5.5, color: "#777", marginTop: 2 },
  idval: { fontSize: 7.5, fontWeight: 700, fontFamily: "monospace" },
  rastr: { padding: "4px 6px 0", borderBottom: "1px solid #000" },
  contrato: { fontSize: 6, color: "#777" },
  modal: { fontSize: 10, fontWeight: 700, margin: "2px 0 1px" },
  cod: { fontSize: 12, fontWeight: 900, fontFamily: "monospace", letterSpacing: 0.3 },
  bcMain: {},
  receb: { padding: "3px 6px", borderBottom: "1px solid #ccc", fontSize: 6, color: "#555", display: "flex", flexDirection: "column", gap: 3 },
  row: { display: "flex", alignItems: "flex-end", gap: 5 },
  ul: { flex: 1, borderBottom: "1px solid #000", height: 11 },
  tag: { padding: "3px 6px", background: "#000", color: "#fff", fontSize: 9, fontWeight: 700 },
  dest: { padding: "5px 6px 3px", borderBottom: "1px solid #ccc" },
  dnome: { fontSize: 10.5, fontWeight: 700, lineHeight: 1.2 },
  dend: { fontSize: 8, marginTop: 2 },
  dbairro: { fontSize: 7.5, color: "#333" },
  dciduf: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 },
  dcid: { fontSize: 9, fontWeight: 700 },
  dcep: { fontSize: 9, fontWeight: 700, fontFamily: "monospace" },
  duf: { fontSize: 7.5, marginTop: 1, color: "#333" },
  bccep: { padding: "3px 6px 2px", borderBottom: "1px solid #000" },
  rem: { padding: "5px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #000" },
  rnome: { fontSize: 9.5, fontWeight: 700 },
  rend: { fontSize: 7.5, marginTop: 2 },
  rcid: { fontSize: 7.5 },
  rcep: { fontSize: 7.5, marginTop: 1 },
  btit: { textAlign: "center", fontSize: 7, fontWeight: 700, padding: "3px 0 2px", borderBottom: "1px solid #ccc" },
  btbl: { width: "100%", borderCollapse: "collapse" },
  bth: { background: "#000", color: "#fff", padding: "2.5px 3px", fontSize: 5.5, textAlign: "left" as const, fontWeight: 700 },
  btd: { padding: "3px 3px", fontSize: 6.5, borderBottom: "1px solid #ebebeb", verticalAlign: "top", lineHeight: 1.35 },
  btot: { display: "flex", justifyContent: "space-between", background: "#e8e8e8", padding: "4px 6px", fontSize: 8, fontWeight: 700 },
  assin: { display: "flex", justifyContent: "space-between", padding: "5px 6px 4px", fontSize: 5.5, color: "#666", borderTop: "1px solid #ccc" },
  aul: { borderBottom: "1px solid #000", width: 110, height: 13, marginBottom: 2 },
  dul: { borderBottom: "1px solid #000", width: 75, height: 13, marginBottom: 2, marginLeft: "auto" },
  rod: { textAlign: "center", fontSize: 4.5, color: "#aaa", padding: "3px 6px 5px" },
};

/* ───── parse helpers (INTOCÁVEIS) ───── */
function fmtCep(s: string) { return s.replace(/(\d{5})(\d{3})/, "$1-$2"); }

function parse(allItems: string[], fullText: string): LabelData {
  const rastreio = (fullText.match(/\b([A-Z]{2}\d{9}[A-Z]{2})\b/) || ["", ""])[1];
  const contrato = (fullText.match(/Contrato:\s*(\S+)/) || ["", ""])[1];
  const modal = (fullText.match(/(SEDEX|PAC|MINI ENVIOS?|\.PACKAGE|LOGÍSTICA SHOPEE)[^\n]*/i) || ["", "SEDEX"])[1].trim();
  const idMatch = fullText.match(/(?:Pedido|ID)[:\s]*(\d{10,})/i) || fullText.match(/(\d{10,})/);
  const idPedido = idMatch ? idMatch[1] : "";

  const destNome = (fullText.match(/DESTINAT[AÁ]RIO[:\s]*([^\n]+)/i) || fullText.match(/(?:Para|Dest)[.:]?\s*([^\n]+)/i) || ["", ""])[1].trim();
  const endLines = allItems.filter(l => /^(Rua|Avenida|Av\.|Alameda|Travessa|Praça)/i.test(l));
  const destEnd = endLines[0] || "Endereço";

  let remNome = (fullText.match(/REMETENTE[:\s]*([^\n@]+)/i) || ["", ""])[1].replace(/\s*(NOME:\s*)?/i, "").replace(/CEP:.*/, "").replace(/\d{5}-?\d{3}.*/, "").replace(/\s+/g, " ").replace(/(Rua|Avenida|Av\.|R\.).*$/i, "").replace(/\d+.*$/, "").replace(/,\s*\d.*$/, "").replace(/\s*(Bairro|Cidade|Estado|UF|CEP|Fone|Tel|CNPJ|CPF|IE|IM|Loja|@.*).*$/i, "").replace(/\s*[-–]\s*$/, "").replace(/(.*?)\s+\1/, "$1").replace(/\s+/g, " ").trim().replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b(Ltda|Me|Mei|Epp|Eireli|Sa)\b\.?/gi, m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()).replace(/\s*(,|\.)\s*$/, "").replace(/(\S+@\S+\.\S+).*$/, "").replace(/^(.*?)(?=\s+(?:Rua|Avenida|Av\.|R\.|Praça|Travessa|Al\.|Alameda)\b)/, "$1").replace(/\s*\b\d{5}-?\d{3}\b.*$/, "").replace(/\s*(,\s*)+$/, "").replace(/(.*?)\s*\bRua\b.*$/i, "$1").replace(/(.*?)\s*\b(CEP|Bairro|Cidade|Estado)\b.*/i, "$1").replace(/^(.+?)(\s+\d+.*)$/, "$1").replace(/\s+/g, " ").trim().replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).replace(/\b(Da|De|Do|Dos|Das|E)\b/g, m => m.toLowerCase()).replace(/\b(Ltda|Me|Mei|Epp|Eireli|Sa|Llc)\b/gi, m => m.toUpperCase()).replace(/(.*?)\s*(?:,\s*)?(?:\d+|Nº|n[.ºo°])\s*\d*.*$/i, "$1").replace(/\s*(,|\.|-|–)\s*$/, "").replace(/(.*?)(\s+(?:loja|sala|bloco|apto?|apartamento|casa|galpão|andar|conjunto|cj|conj|sl|apt)\s.*$)/i, "$1").replace(/([^,]+),\s*\d+.*$/, "$1").replace(/\s+/g, " ").trim().split(/\s+/).filter(w => !/^\d+$/.test(w) && !/^(Rua|Avenida|Av|R|Praça|Travessa|Al|Alameda)\.?$/i.test(w) || w.length > 3).join(" ").replace(/\s*(Rua|Avenida|Av\.|R\.|Praça|Travessa|Alameda|Al\.).*$/i, "").replace(/\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/, "").replace(/\s*\d{3}\.\d{3}\.\d{3}-\d{2}.*$/, "").replace(/\s*(,|\.|-|–)\s*$/, "").trim() || (fullText.match(/(?:Loja|Seller|Vendedor)[:\s]*([^\n@]+)/i) || ["", ""])[1].replace(/(.*?)(?=\s+(?:Rua|Avenida|Av\.|R\.))/i, "$1").replace(/\s*\b\d{5}-?\d{3}\b.*$/, "").replace(/\s*(,|\.|-|–)\s*$/, "").replace(/(.*?)\s*(?:,\s*)?(?:\d+|Nº|n[.ºo°])\s*\d*.*$/i, "$1").replace(/(.*?)(\s+(?:loja|sala|bloco|apt|casa)\s.*$)/i, "$1").replace(/([^,]+),\s*\d+.*$/, "$1").replace(/\s+/g, " ").trim().replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).replace(/\b(Da|De|Do|Dos|Das|E)\b/g, m => m.toLowerCase()).replace(/(.*?)\s*(?=\s+\d|\s+(?:Rua|R\.|Av\.|Avenida|Praça|Travessa|Alameda|Al\.)\s)/i, "$1").replace(/\s*[-–]\s*$/, "").replace(/\s*(,|\.)\s*$/, "").trim().replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s*\b(CNPJ|CPF|IE|IM|Fone|Tel|Email|@)\b.*/i, "").replace(/\s*(,|\.|-|–)\s*$/, "").replace(/(.*?)(\s+\d{2}\.\d{3}\.\d{3}\/\d{4}.*$)/, "$1").replace(/(.*?)(\s+\d{3}\.\d{3}\.\d{3}.*$)/, "$1").trim().replace(/^(.{2,50}?)(?:\s+.+)?$/, "$1").replace(/\s*(Rua|R\.|Av\.|Avenida|Praça|Travessa|Alameda|Al\.).*$/i, "").replace(/\s*\d+.*$/, "").replace(/\s*(,|\.|-|–)\s*$/, "").replace(/\s+/g, " ").trim().split(/\s*(?:,|\s{2,})\s*/).filter(p => p.length > 1 && !/^\d+$/.test(p) && !/^(Rua|R|Av|Avenida|Praça|Travessa|Al|Alameda)\.?$/i.test(p)).slice(0, 4).join(" ").replace(/\s+/g, " ").trim().replace(/^(.+?)\s+\1$/, "$1").replace(/\s*(,|\.|-|–)\s*$/, "").trim().replace(/(.*?)(?:\s*(?:Rua|R\.|Av\.|Avenida|Praça|Travessa|Al\.|Alameda)\s.*$)/i, "$1").trim().replace(/(.*?)\s*[-–]\s*(?:Rua|R\.|Av\.|Avenida).*$/i, "$1").trim().replace(/^(.+?)\s*[,.]?\s*\d{1,5}\s*$/, "$1").replace(/(.*?)(?:\s+(?:loja|sala|bloco|apto?|apartamento|casa|galpão|andar|conjunto|cj|conj|sl|apt)\s.*$)/i, "$1").replace(/\s*(,|\.|-|–)\s*$/, "").replace(/\s+/g, " ").trim().replace(/(.*?)(\s*\(.*?\)\s*)$/, "$1").replace(/\s*(,|\.|-|–)\s*$/, "").trim() || "";

  if (!remNome) {
    const iRem = allItems.findIndex(l => /^REMETENTE$/i.test(l));
    if (iRem !== -1) remNome = allItems[iRem + 1].replace(/NOME:\s*/i, "");
  }

  const endLinesAll = allItems.filter(l => /^(Rua|Avenida|Av\.|Alameda|Travessa|Praça)/i.test(l));
  let remEnd = endLinesAll.find(l => l !== destEnd) || endLinesAll[0] || "Endereço Remetente";

  const ceps = [...fullText.matchAll(/\b(\d{8}|\d{5}-\d{3})\b/g)].map(m => m[1]);
  let destCep = "", remCep = "";
  if (ceps.length > 0) destCep = fmtCep(ceps[0]);
  if (ceps.length > 1) remCep = fmtCep(ceps[1]);

  const destBairro = "Bairro";
  const destCidade = "Cidade";
  const destUf = "UF";
  const remCidade = "Mongaguá";
  const remUf = "São Paulo";

  let totalQtd = 1;
  let totalVal = "R$ 0,00";

  const valMatch = fullText.match(/Totais\s+\d+\s+([\d.,]+)/i) || fullText.match(/R\$\s*([\d.,]+)/);
  if (valMatch) totalVal = "R$ " + valMatch[1].replace(".", ",");

  const qtdMatch = fullText.match(/Totais\s+(\d+)/i) || fullText.match(/Total\s*\((\d+)\s*itens\)/i);
  if (qtdMatch) totalQtd = parseInt(qtdMatch[1]);

  const prods: ProdItem[] = [];

  if (fullText.includes("Nenhum produto extraido") || fullText.includes("Nenhum produto extraído")) {
    prods.push({ n: "-", desc: "Nenhum produto extraido", var: "-", qtd: "-", val: "-" });
  } else {
    let blocoTabela = "";
    const tableMatch = fullText.match(/VALOR\b\s*(.+?)\s*(?:Totais\b|Peso Total\b|DECLARAÇÃO\b)/i);
    if (tableMatch) blocoTabela = tableMatch[1].trim();

    if (blocoTabela) {
      blocoTabela = blocoTabela.replace(/VARIAÇÃO|QTD|CÓDIGO \(SKU\)|Nº|DESCRIÇÃO DO PRODUTO/gi, "").trim();
      const itemRegex = /(?:^|\s)(\d+)\s+(.+?)\s+(\d+)\s+([\d.,]{3,})(?=\s|$|\s\d+\s)/g;
      let m;
      let encontrou = false;
      while ((m = itemRegex.exec(blocoTabela)) !== null) {
        encontrou = true;
        const n = m[1];
        const rawDesc = m[2].trim();
        const qtd = m[3];
        let val = m[4];
        let desc = rawDesc;
        let vari = "-";
        const varMatch = rawDesc.match(/(.*?)\s+([A-Za-z0-9À-ÿ/\s-]+,[A-Za-z0-9À-ÿ/\s-]+)$/);
        if (varMatch) {
          desc = varMatch[1].trim();
          vari = varMatch[2].trim();
        } else {
          const colorMatch = rawDesc.match(/(.*?)\s+((?:Bege|Preto|Branco|Azul|Verde|Vermelho|Rosa|Cinza|Amarelo|Lilás|Roxo|Laranja|Marrom|Sortido).*?)$/i);
          if (colorMatch) {
            desc = colorMatch[1].trim();
            vari = colorMatch[2].trim();
          }
        }
        val = val.replace(".", ",");
        if (!val.includes(",")) val += ",00";
        if (!val.includes("R$")) val = "R$ " + val;
        prods.push({ n, desc, var: vari, qtd, val });
      }
      if (!encontrou) {
        prods.push({ n: "1", desc: blocoTabela, var: "-", qtd: totalQtd, val: totalVal });
      }
    }
    if (prods.length === 0) {
      prods.push({ n: "1", desc: "Produtos conforme declaração", var: "-", qtd: totalQtd, val: totalVal });
    }
  }

  return { rastreio, contrato, idPedido, modal, destNome, destEnd, destBairro, destCidade, destUf, destCep, remNome, remEnd, remCidade, remUf, remCep, prods, totalQtd, totalVal };
}

/* ───── Component ───── */
export default function EtiquetasPage() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<LabelData | null>(null);
  const [fmt, setFmt] = useState<Fmt>("t");
  const [status, setStatus] = useState<Status>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const etqRef = useRef<HTMLDivElement>(null);
  const bcMainRef = useRef<SVGSVGElement>(null);
  const bcCepRef = useRef<SVGSVGElement>(null);
  const qrTopRef = useRef<HTMLCanvasElement>(null);
  const qrRemRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── draw barcodes / qr whenever data changes ── */
  useEffect(() => {
    if (!data) return;
    try {
      if (bcMainRef.current) {
        JsBarcode(bcMainRef.current, data.rastreio || "AD000000000BR", { format: "CODE128", displayValue: true, fontSize: 9, height: 34, margin: 3, lineColor: "#000", background: "#fff", textMargin: 2, font: "Courier New,monospace" });
        bcMainRef.current.setAttribute("width", "100%");
        bcMainRef.current.removeAttribute("height");
      }
    } catch {}
    try {
      const cepNum = (data.destCep || "00000000").replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
      if (bcCepRef.current) JsBarcode(bcCepRef.current, cepNum, { format: "CODE128", displayValue: false, height: 20, margin: 2, lineColor: "#000", background: "#fff" });
    } catch {}
    if (qrTopRef.current) QRCode.toCanvas(qrTopRef.current, data.rastreio || "NOTRACK", { width: 52, margin: 1, color: { dark: "#000", light: "#fff" } }).catch(() => {});
    if (qrRemRef.current) QRCode.toCanvas(qrRemRef.current, data.rastreio || "NOTRACK", { width: 42, margin: 1, color: { dark: "#000", light: "#fff" } }).catch(() => {});
  }, [data]);

  /* ── handle file ── */
  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf") { setStatus({ msg: "Selecione um arquivo PDF.", type: "error" }); return; }
    setFile(f);
    setStatus({ msg: "Lendo PDF…", type: "loading" });
    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const page = await pdf.getPage(1);
      const tc = await page.getTextContent();
      const items = tc.items as any[];
      items.sort((a: any, b: any) => {
        const dy = b.transform[5] - a.transform[5];
        if (Math.abs(dy) > 3) return dy;
        return a.transform[4] - b.transform[4];
      });
      const allItems = items.map((i: any) => i.str.trim()).filter(Boolean);
      const fullText = allItems.join(" ");
      const d = parse(allItems, fullText);
      setData(d);
      setStatus({ msg: `✓ ${d.rastreio || "Etiqueta"} extraído com sucesso!`, type: "success" });
    } catch (e: any) {
      setStatus({ msg: "Erro ao ler PDF: " + e.message, type: "error" });
    }
  }, []);

  /* ── generate PDF ── */
  const gerar = useCallback(async () => {
    if (!data || busy || !etqRef.current) return;
    setBusy(true);
    setStatus({ msg: "Gerando imagem…", type: "loading" });
    try {
      await new Promise(r => setTimeout(r, 600));
      const canvas = await html2canvas(etqRef.current, { scale: 4, useCORS: true, backgroundColor: "#fff", logging: false, imageTimeout: 0 });
      const img = canvas.toDataURL("image/png");
      const W = 100;
      const H = parseFloat(((canvas.height / canvas.width) * W).toFixed(1));
      let pdf: jsPDF;
      if (fmt === "a") {
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(img, "PNG", (210 - W) / 2, (297 - H) / 2, W, H);
      } else {
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, Math.max(H, 100)] });
        pdf.addImage(img, "PNG", 0, 0, W, H);
      }
      const fname = `etiqueta_${data.rastreio || "shopee"}_${fmt === "a" ? "A4" : "termica"}.pdf`;
      pdf.save(fname);
      setStatus({ msg: `✓ ${fname} baixado!`, type: "success" });
      toast({ title: "Etiqueta exportada!", description: fname });
    } catch (e: any) {
      setStatus({ msg: "Erro: " + e.message, type: "error" });
    }
    setBusy(false);
  }, [data, busy, fmt]);

  /* ── reset ── */
  const reset = () => { setFile(null); setData(null); setStatus(null); if (inputRef.current) inputRef.current.value = ""; };

  /* ── drop handlers ── */
  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }, [handleFile]);
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);

  const dropBorder = data ? "border-success" : dragging ? "border-primary" : "border-border";
  const dropBg = data ? "bg-success/5" : dragging ? "bg-primary/5" : "bg-muted/30";

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Tag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Etiquetas Shopee</h1>
            <p className="text-xs text-muted-foreground">Extração por coordenadas — impressão térmica 100×150 mm</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* ──── LEFT PANEL ──── */}
          <div className="space-y-4">
            {/* dropzone */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> PDF da Shopee</CardTitle></CardHeader>
              <CardContent>
                <div
                  onClick={() => inputRef.current?.click()}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dropBorder} ${dropBg}`}
                >
                  <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {data ? (
                    <>
                      <span className="text-2xl block mb-1">✅</span>
                      <p className="text-sm font-semibold text-success">{file?.name}</p>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl block mb-1">📦</span>
                      <p className="text-sm font-semibold">Arraste o PDF aqui</p>
                      <p className="text-xs text-muted-foreground">clique ou arraste · .pdf</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* format */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Printer className="h-4 w-4" /> Formato</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {(["t", "a"] as Fmt[]).map(f => (
                    <button key={f} onClick={() => setFmt(f)} className={`rounded-xl border-2 p-3 text-center transition-all ${fmt === f ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                      <span className="text-sm font-bold block">{f === "t" ? "🖨️ Térmica" : "📄 A4"}</span>
                      <span className="text-xs text-muted-foreground">{f === "t" ? "100×150 mm" : "210×297 mm"}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* actions */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileDown className="h-4 w-4" /> Exportar</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {status && (
                  <div className={`rounded-lg px-3 py-2 text-xs font-mono flex items-center gap-2 border ${status.type === "loading" ? "bg-primary/10 border-primary/30 text-primary" : status.type === "success" ? "bg-success/10 border-success/30 text-success" : status.type === "error" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted border-border text-muted-foreground"}`}>
                    {status.type === "loading" && <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                    {status.msg}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={gerar} disabled={!data || busy} className="flex-1 gap-2">
                    ⚡ Gerar PDF
                  </Button>
                  <Button variant="outline" onClick={reset} size="icon"><RotateCcw className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            {/* extracted data */}
            {data && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Dados Extraídos</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {([["Rastreio", data.rastreio], ["Modal", data.modal], ["ID Pedido", data.idPedido], ["CEP Dest.", data.destCep], ["Destinatário", data.destNome], ["Remetente", data.remNome]] as [string, string][]).map(([l, v]) => (
                      <div key={l} className={`rounded-lg bg-muted/40 px-2 py-1.5 ${l === "Destinatário" || l === "Remetente" ? "col-span-2" : ""}`}>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{l}</p>
                        <p className="text-xs font-semibold font-mono truncate">{v || "—"}</p>
                      </div>
                    ))}
                  </div>
                  <table className="w-full text-xs mt-2">
                    <thead><tr className="bg-primary/10"><th className="p-1 text-left text-[9px] font-bold text-primary">#</th><th className="p-1 text-left text-[9px] font-bold text-primary">Descrição</th><th className="p-1 text-left text-[9px] font-bold text-primary">Var.</th><th className="p-1 text-left text-[9px] font-bold text-primary">Qtd</th><th className="p-1 text-left text-[9px] font-bold text-primary">Valor</th></tr></thead>
                    <tbody>{data.prods.map((p, i) => (<tr key={i} className="border-b border-border"><td className="p-1">{p.n}</td><td className="p-1">{p.desc}</td><td className="p-1">{p.var}</td><td className="p-1">{p.qtd}</td><td className="p-1">{p.val}</td></tr>))}</tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ──── RIGHT PANEL — LABEL PREVIEW ──── */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Preview · Etiqueta</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start justify-center min-h-[200px] p-4 rounded-xl border border-border bg-[repeating-conic-gradient(rgba(0,0,0,.03)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] overflow-y-auto">
                {!data ? (
                  <div className="text-center text-muted-foreground pt-10">
                    <span className="text-4xl block mb-2">🏷️</span>
                    <p className="font-semibold">Carregue um PDF</p>
                  </div>
                ) : (
                  /* ═══ ETIQUETA — CSS FIXO EM PX (sem Tailwind) ═══ */
                  <div ref={etqRef} style={LS.root}>
                    {/* HEADER */}
                    <div style={LS.hdr}>
                      <div style={LS.logo}>
                        <div style={LS.sico}>S</div>
                        <div>
                          <div style={LS.sname}>Shopee</div>
                          <div style={LS.idlbl}>ID pedido:</div>
                          <div style={LS.idval}>{data.idPedido || "—"}</div>
                        </div>
                      </div>
                      <canvas ref={qrTopRef} />
                    </div>
                    {/* RASTREIO */}
                    <div style={LS.rastr}>
                      <div style={LS.contrato}>Contrato: {data.contrato}</div>
                      <div style={LS.modal}>{data.modal}</div>
                      <div style={LS.cod}>{data.rastreio}</div>
                      <div style={LS.bcMain}><svg ref={bcMainRef} /></div>
                    </div>
                    {/* RECEBEDOR */}
                    <div style={LS.receb}>
                      <div style={LS.row}><span>Recebedor:</span><div style={LS.ul} /></div>
                      <div style={LS.row}><span>Assinatura:</span><div style={LS.ul} /></div>
                      <div style={LS.row}><span>Documento:</span><div style={LS.ul} /></div>
                    </div>
                    {/* DESTINATÁRIO */}
                    <div style={LS.tag}>DESTINATÁRIO</div>
                    <div style={LS.dest}>
                      <div style={LS.dnome}>{data.destNome || "—"}</div>
                      <div style={LS.dend}>{data.destEnd || "—"}</div>
                      <div style={LS.dbairro}>{data.destBairro}</div>
                      <div style={LS.dciduf}>
                        <span style={LS.dcid}>{data.destCidade}</span>
                        <span style={LS.dcep}>{data.destCep}</span>
                      </div>
                      <div style={LS.duf}>{data.destUf}</div>
                    </div>
                    {/* BARCODE CEP */}
                    <div style={LS.bccep}><svg ref={bcCepRef} style={{ display: "block", maxWidth: 155 }} /></div>
                    {/* REMETENTE */}
                    <div style={LS.tag}>REMETENTE</div>
                    <div style={LS.rem}>
                      <div>
                        <div style={LS.rnome}>{data.remNome}</div>
                        <div style={LS.rend}>{(data.remEnd || "").slice(0, 55)}</div>
                        <div style={LS.rcid}>{data.remCidade} — {data.remUf}</div>
                        <div style={LS.rcep}>CEP: {data.remCep}</div>
                      </div>
                      <canvas ref={qrRemRef} />
                    </div>
                    {/* PRODUTOS */}
                    <div style={LS.btit}>IDENTIFICAÇÃO DOS BENS</div>
                    <table style={LS.btbl}>
                      <thead>
                        <tr>
                          <th style={LS.bth}>#</th>
                          <th style={LS.bth}>Descrição do Produto</th>
                          <th style={LS.bth}>Variação</th>
                          <th style={LS.bth}>Qtd</th>
                          <th style={LS.bth}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.prods.map((p, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#f8f8f8" : "#fff" }}>
                            <td style={LS.btd}>{p.n}</td>
                            <td style={LS.btd}>{p.desc}</td>
                            <td style={LS.btd}>{p.var}</td>
                            <td style={LS.btd}>{p.qtd}</td>
                            <td style={LS.btd}>{p.val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={LS.btot}>
                      <span>Total ({Math.max(data.totalQtd, 1)} itens)</span>
                      <span>{data.totalVal}</span>
                    </div>
                    {/* ASSINATURA */}
                    <div style={LS.assin}>
                      <div><div style={LS.aul} /><span>Assinatura do Remetente/Declarante</span></div>
                      <div><div style={LS.dul} /><span>Data: ___/___/______</span></div>
                    </div>
                    <div style={LS.rod}>Shopee não é proprietário nem responsável pelos bens entregues (art.261 CP).</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
