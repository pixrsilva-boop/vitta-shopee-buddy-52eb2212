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

/* ───── label-specific CSS (pixel-perfect) ───── */
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

/* ───── helpers ───── */
function fmtCep(s: string) { 
  if(!s) return '';
  s = s.replace(/\D/g, '');
  if(s.length !== 8) return s;
  return s.substring(0,5) + '-' + s.substring(5);
}

// O PARSER V5 (Proteção de Endereço + Extração de Tabela Garantida)
function parse(lines: string[]): LabelData {
  const fullText = lines.join(' ');

  const rastreio=(fullText.match(/\b([A-Z]{2}\d{9}[A-Z]{2})\b/)||[])[1]||'';
  const contrato=(fullText.match(/Contrato:\s*(\d+)/i)||[])[1]||'';
  const modal=(fullText.match(/\b(SEDEX|PAC|MINI ENVIOS|SHOPEE XPRESS)\b/i)||["SEDEX"])[0];

  const idMatch = fullText.match(/ID pedido[:\s]*([A-Z0-9]+)/i);
  const idPedido = idMatch ? idMatch[1] : '';

  // DESTINATÁRIO (Com Trava de Segurança)
  const iDest = lines.findIndex(l => l.toUpperCase() === 'DESTINATÁRIO' || l.toUpperCase() === 'DESTINATARIO');
  let destNome = 'Nome não encontrado';
  let destEnd = '';
  let destBairro = '';
  let destCidade = '';
  let destUf = '';

  if (iDest !== -1) {
      let dData = [];
      for(let j = iDest + 1; j < iDest + 6; j++) {
          let l = lines[j];
          if (!l) break;
          let up = l.toUpperCase();
          if (up.includes('DOCUMENTO') || up.includes('REMETENTE') || up.match(/^\d{5}-\d{3}$/) || up.match(/^\d{8}$/)) break;
          dData.push(l);
      }
      if (dData.length > 0) destNome = dData[0];
      if (dData.length > 1) destEnd = dData[1];
      if (dData.length === 3) destCidade = dData[2];
      if (dData.length === 4) { destBairro = dData[2]; destCidade = dData[3]; }
      if (dData.length >= 5) { destBairro = dData[2]; destCidade = dData[3]; destUf = dData[4]; }
  }

  // REMETENTE
  let remNome = 'VITTA@STORE';
  let remEnd = '';
  const iRem = lines.findIndex(l => l.toUpperCase().includes('REMETENTE'));
  
  if (iRem !== -1) {
      let txt = lines[iRem];
      if (txt.toUpperCase().includes('REMETENTE:')) {
          remNome = txt.substring(txt.toUpperCase().indexOf('REMETENTE:') + 10).trim();
          remEnd = lines[iRem + 1] || '';
      } else {
          remNome = lines[iRem + 1] || remNome;
          remEnd = lines[iRem + 2] || '';
      }
  } else {
      let rIdx = lines.findIndex(l => l.includes('VITTA@STORE') || l.includes('@'));
      if (rIdx !== -1) {
          remNome = lines[rIdx];
          remEnd = lines[rIdx + 1] || '';
      }
  }

  if(remNome) remNome = remNome.replace(/NOME:\s*/i, '');
  if(remEnd) remEnd = remEnd.replace(/ENDEREÇO:\s*/i, '');

  const ceps=[...fullText.matchAll(/\b(\d{8}|\d{5}-\d{3})\b/g)].map(m=>m[1].replace('-',''));
  let destCep='',remCep='';
  if (ceps.length > 0) destCep = fmtCep(ceps[0]);
  if (ceps.length > 1) remCep = fmtCep(ceps[1]);

  const remCidade='Mongaguá';
  const remUf='São Paulo';

  // ==============================================================
  // TABELA DE PRODUTOS (Nova Lógica à Prova de Falhas)
  // ==============================================================
  let totalQtd = 1;
  let totalVal = "R$ 0,00";

  const tMatch = fullText.match(/Totais\s+(\d+)\s+([\d.,]+[.,]\d{2})/i) || fullText.match(/Total\s*\((\d+)\s*itens\)/i);
  if (tMatch) {
      totalQtd = parseInt(tMatch[1]);
      if (tMatch[2]) totalVal = "R$ " + tMatch[2].replace('.', ',');
  } else {
      const valMatch = fullText.match(/R\$\s*([\d.,]+)/);
      if (valMatch) totalVal = "R$ " + valMatch[1];
  }

  const prods: ProdItem[] = [];
  
  if (fullText.includes("Nenhum produto extraido") || fullText.includes("Nenhum produto extraído")) {
      prods.push({ n: '-', desc: 'Nenhum produto extraido', var: '-', qtd: '-', val: '-' });
  } else {
      let blocoTabela = "";
      
      // Busca desde a palavra VALOR ou DESCRIÇÃO até ao fim da página (ignorando linhas quebradas)
      const tableMatch = fullText.match(/(?:VALOR|DESCRIÇÃO DO PRODUTO)\b\s*(.+?)\s*(?:Totais\b|Peso Total\b|DECLARAÇÃO\b|Assinatura\b)/i);
      
      if (tableMatch) {
          blocoTabela = tableMatch[1];
      } else {
          // Fallback caso não encontre o rodapé exato
          const fallbackMatch = fullText.match(/(?:VALOR|DESCRIÇÃO DO PRODUTO)\b\s*(.+)/i);
          if (fallbackMatch) blocoTabela = fallbackMatch[1];
      }

      if (blocoTabela) {
          // Limpa cabeçalhos perdidos no meio do bloco
          blocoTabela = blocoTabela.replace(/VARIAÇÃO|QTD|CÓDIGO \(SKU\)|Nº|DESCRIÇÃO DO PRODUTO|VALOR/gi, '').trim();

          // Regex que pega [Numero] [Nome] [Qtd] [Preço]
          const itemRegex = /(?:^|\s)(\d+)\s+(.+?)\s+(\d+)\s+([\d.,]+[.,]\d{2})(?=\s|$|\s\d+\s)/g;
          let m;
          let encontrou = false;
          
          while ((m = itemRegex.exec(blocoTabela)) !== null) {
              encontrou = true;
              let n = m[1];
              let rawDesc = m[2].trim();
              let qtd = m[3];
              let val = m[4];
              let desc = rawDesc;
              let vari = "-";
              
              // Separa a cor/variação do título principal
              const varMatch = rawDesc.match(/(.*?)\s+([A-Za-z0-9À-ÿ/\s-]+,[A-Za-z0-9À-ÿ/\s-]+)$/);
              if (varMatch) {
                  desc = varMatch[1].trim();
                  vari = varMatch[2].trim();
              } else {
                  const colorMatch = rawDesc.match(/(.*?)\s+((?:Bege|Preto|Branco|Azul|Verde|Vermelho|Rosa|Cinza|Amarelo|Lilás|Roxo|Laranja|Marrom|Sortido).*?)$/i);
                  if(colorMatch) {
                      desc = colorMatch[1].trim();
                      vari = colorMatch[2].trim();
                  }
              }
              
              val = val.replace('.', ',');
              if (!val.includes(',')) val += ',00';
              if (!val.includes('R$')) val = 'R$ ' + val;
              
              prods.push({ n, desc, var: vari, qtd, val });
          }

          if (!encontrou) {
              // Se a formatação do PDF falhar, pega o bloco inteiro e não o perde!
              prods.push({ n: '1', desc: blocoTabela.substring(0, 150), var: '-', qtd: totalQtd, val: totalVal });
          }
      } else {
          prods.push({ n: '1', desc: 'Produtos conforme declaração', var: '-', qtd: totalQtd, val: totalVal });
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

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf") { setStatus({ msg: "Selecione um arquivo PDF.", type: "error" }); return; }
    setFile(f);
    setStatus({ msg: "Lendo PDF…", type: "loading" });
    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      
      let rawLines: string[] = [];
      
      for(let i=1; i<=pdf.numPages; i++){
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        
        let acc = '';
        tc.items.forEach((item: any) => {
            if(item.hasEOL){
                rawLines.push((acc + item.str).trim());
                acc = '';
            } else {
                acc += item.str;
            }
        });
        if(acc.trim()) rawLines.push(acc.trim());
      }

      // O PURIFICADOR: Remove os avisos gigantes que vêm no PDF e arruínam a tabela
      const cleanLines = rawLines.filter(l => {
          const up = l.toUpperCase();
          return !(
              up.includes('IMPORTANTE: INFORMAMOS') || 
              up.includes('NÃO GUARDA POSSE') || 
              up.includes('CONTEÚDOS CONTIDOS NESTE') || 
              up.includes('O A PESSOA IDENTIFICADA') || 
              up.includes('SÓ SE LIMITA À PUBLICAÇÃO') ||
              up.includes('RESPONSÁVEL PELO BEM ENVIADO') ||
              up.includes('DECLARO QUE NÃO ME ENQUADRO') ||
              up.includes('RISCO O TRANSPORTE AÉREO')
          );
      });

      const d = parse(cleanLines);
      setData(d);
      setStatus({ msg: `✓ ${d.rastreio || "Etiqueta"} extraído com sucesso!`, type: "success" });
    } catch (e: any) {
      setStatus({ msg: "Erro ao ler PDF: " + e.message, type: "error" });
    }
  }, []);

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

  const reset = () => { setFile(null); setData(null); setStatus(null); if (inputRef.current) inputRef.current.value = ""; };

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }, [handleFile]);
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);

  const dropBorder = data ? "border-success" : dragging ? "border-primary" : "border-border";
  const dropBg = data ? "bg-success/5" : dragging ? "bg-primary/5" : "bg-muted/30";

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Tag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Etiquetas Shopee</h1>
            <p className="text-xs font-bold text-green-500">Página 2 Extraída com Sucesso V5</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="space-y-4">
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
              </
