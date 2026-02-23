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
  // Destinatário — 5 campos separados
  destNome: string;
  destRua: string;      // renomeado de destEnd → destRua
  destBairro: string;
  destCidade: string;
  destUf: string;
  destCep: string;
  // Remetente
  remNome: string;
  remEnd: string;
  remCidade: string;
  remUf: string;
  remCep: string;
  // Produtos
  prods: ProdItem[];
  totalQtd: number;
  totalVal: string;
}

// Estrutura interna para passar as páginas separadas ao parser
interface PageData {
  // Página 2: itens com texto + coordenada X (para separar REM/DEST)
  page2Items: Array<{ text: string; x: number; y: number }>;
  // Todas as linhas (página 1 + 2) para extrair rastreio, contrato, idPedido, bairro, produtos
  allLines: string[];
  // Texto completo para regex gerais
  fullText: string;
}

type Fmt = "t" | "a";
type Status = { msg: string; type: "info" | "loading" | "success" | "error" } | null;

/* ───── label CSS (pixel-perfect) ───── */
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
  // Destinatário — 5 linhas exatas
  dest: { padding: "5px 6px 3px", borderBottom: "1px solid #ccc" },
  dnome: { fontSize: 10.5, fontWeight: 700, lineHeight: 1.2 },
  drua: { fontSize: 8, marginTop: 2 },
  dbairro: { fontSize: 7.5, color: "#333", marginTop: 1 },
  dciduf: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 },
  dcid: { fontSize: 9, fontWeight: 700 },
  dcep: { fontSize: 9, fontWeight: 700, fontFamily: "monospace" },
  duf: { fontSize: 7.5, marginTop: 1, color: "#333" },
  bccep: { padding: "3px 6px 2px", borderBottom: "1px solid #000" },
  // Remetente — 2 linhas de endereço
  rem: { padding: "5px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #000" },
  rnome: { fontSize: 9.5, fontWeight: 700 },
  rend: { fontSize: 7.5, marginTop: 2, lineHeight: 1.4 },
  rcep: { fontSize: 7.5, marginTop: 1 },
  // Tabela de produtos
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
function fmtCep(s: string): string {
  if (!s) return "";
  s = s.replace(/\D/g, "");
  if (s.length !== 8) return s;
  return s.substring(0, 5) + "-" + s.substring(5);
}

/**
 * Gera o nome do arquivo no formato:
 * primeiroNomeDestinatario_palavra1_palavra2_palavra3.pdf
 * Ex: "vania_short_infantil_menina.pdf"
 */
function buildFileName(destNome: string, prodDesc: string, fmt: Fmt): string {
  const stopwords = new Set(["de", "da", "do", "das", "dos", "e", "para", "com", "em", "a", "o", "um", "uma"]);

  const slugify = (str: string): string =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");

  // Primeiro nome do destinatário
  const primeiroNome = slugify(destNome.split(/\s+/)[0] || "destinatario");

  // Até 3 palavras relevantes do produto (sem stopwords)
  const palavrasProd = prodDesc
    .split(/\s+/)
    .map((w) => w.toLowerCase().trim())
    .filter((w) => w.length > 1 && !stopwords.has(w))
    .slice(0, 3)
    .map(slugify)
    .filter(Boolean);

  const sufixo = fmt === "a" ? "_A4" : "";
  return `${primeiroNome}_${palavrasProd.join("_")}${sufixo}.pdf`;
}

/* ───────────────────────────────────────────────────────────────
   PARSER V7 — Estratégia de 2 passagens

   PASSAGEM A (Página 2 / Declaração de Conteúdo):
     Usa coordenadas X dos itens do pdfjs para separar:
       • X < 300  →  lado do Remetente
       • X >= 300 →  lado do Destinatário
     Extrai: destNome, destRua, destCidade, destUf, destCep,
             remNome, remEnd (2 linhas juntas), remCep

   PASSAGEM B (allLines / fullText):
     Extrai: rastreio, contrato, idPedido, modal, destBairro,
             e todos os dados da tabela de produtos
─────────────────────────────────────────────────────────────── */
function parse(pageData: PageData): LabelData {
  const { page2Items, allLines, fullText } = pageData;

  /* ── Campos globais (fullText) ── */
  const rastreio = (fullText.match(/\b([A-Z]{2}\d{9}[A-Z]{2})\b/) || [])[1] || "";
  const contrato = (fullText.match(/Contrato:\s*(\d+)/i) || [])[1] || "";
  const modal = (fullText.match(/\b(SEDEX|PAC|MINI ENVIOS|SHOPEE XPRESS)\b/i) || ["SEDEX"])[0];
  const idPedido = (fullText.match(/ID\s*pedido[:\s]*([A-Z0-9]{8,})/i) || [])[1] || "";

  /* ══════════════════════════════════════════════════════
     PASSAGEM A — Página 2 com coordenadas X
  ══════════════════════════════════════════════════════ */
  // Separar itens por lado: X < 300 = remetente, X >= 300 = destinatário
  const remItems = page2Items.filter((i) => i.x < 300);
  const destItems = page2Items.filter((i) => i.x >= 300);

  /**
   * Dado um array de itens de um lado, encontra o valor logo
   * após o label (ex: "NOME:", "ENDEREÇO:", "MUNICÍPIO:", "CEP:", "UF:")
   * Retorna a string do próximo item não-label, ou "" se não encontrar.
   */
  const getAfterLabel = (
    items: Array<{ text: string; x: number; y: number }>,
    labelPattern: RegExp
  ): string => {
    for (let i = 0; i < items.length; i++) {
      if (labelPattern.test(items[i].text.trim())) {
        // Próximo item que não é outro label
        for (let j = i + 1; j < items.length; j++) {
          const t = items[j].text.trim();
          if (t && !/^(NOME|ENDEREÇO|MUNICÍPIO|UF|CEP|CPF|CNPJ|REMETENTE|DESTINATÁRIO):/i.test(t)) {
            return t;
          }
        }
      }
    }
    return "";
  };

  /**
   * Para ENDEREÇO do remetente precisamos de 2 linhas (a Av. vem quebrada).
   * Pega as 2 primeiras linhas de valor após o label ENDEREÇO: do lado esquerdo.
   */
  const getRemEnd = (items: Array<{ text: string; x: number; y: number }>): string => {
    for (let i = 0; i < items.length; i++) {
      if (/^ENDEREÇO:/i.test(items[i].text.trim())) {
        const lines: string[] = [];
        for (let j = i + 1; j < items.length && lines.length < 2; j++) {
          const t = items[j].text.trim();
          if (!t) continue;
          // Para quando encontrar outro label
          if (/^(NOME|MUNICÍPIO|UF|CEP|CPF|CNPJ|REMETENTE|DESTINATÁRIO):/i.test(t)) break;
          lines.push(t.replace(/,\s*$/, "").trim()); // remove vírgula final
        }
        // Junta as 2 linhas: "Avenida Edwilson José do Carmo, 92" + "Mongaguá, São Paulo"
        return lines.join(", ");
      }
    }
    return "";
  };

  // ── DESTINATÁRIO (lado direito, X >= 300) ──
  const destNome = getAfterLabel(destItems, /^NOME:/i) || "Nome não encontrado";

  // Rua do destinatário: vem como "Rua Santa Terezinha, 2359, Mongaguá,"
  // Precisamos só de "Rua Santa Terezinha, 2359" → pegar os 2 primeiros segmentos
  const destEndRaw = getAfterLabel(destItems, /^ENDEREÇO:/i);
  const destRuaPartes = destEndRaw.split(",").map((s) => s.trim().replace(/,$/, ""));
  const destRua =
    destRuaPartes.length >= 2
      ? `${destRuaPartes[0]}, ${destRuaPartes[1]}`
      : destEndRaw;

  const destCidade = getAfterLabel(destItems, /^MUNICÍPIO:/i);
  const destUf = getAfterLabel(destItems, /^UF:/i);
  const destCepRaw = getAfterLabel(destItems, /^CEP:/i);
  const destCep = fmtCep(destCepRaw);

  // ── REMETENTE (lado esquerdo, X < 300) ──
  const remNomeRaw = getAfterLabel(remItems, /^NOME:/i);
  const remNome = remNomeRaw || "VITTA@STORE";
  const remEnd = getRemEnd(remItems);
  const remCepRaw = getAfterLabel(remItems, /^CEP:/i);
  const remCep = fmtCep(remCepRaw);
  // Cidade e UF do remetente extraídas do campo MUNICÍPIO/UF da página 2 lado esquerdo
  const remCidade = getAfterLabel(remItems, /^MUNICÍPIO:/i) || "Mongaguá";
  const remUf = getAfterLabel(remItems, /^UF:/i) || "São Paulo";

  /* ══════════════════════════════════════════════════════
     PASSAGEM B — destBairro a partir de allLines (Página 1)
     
     Na Página 1 da etiqueta, o bairro aparece como uma linha
     separada entre a rua e a cidade, mas sem label.
     Estratégia: procurar linhas que não sejam nome, rua, cidade,
     UF, CEP, número puro, nem palavras-chave conhecidas.
  ══════════════════════════════════════════════════════ */
  let destBairro = "";

  // Lista de valores que já conhecemos para ignorar
  const knownValues = new Set(
    [destNome, destRua, destCidade, destUf, remNome, remEnd, remCidade, remUf, rastreio, contrato, idPedido]
      .map((v) => v.toLowerCase().trim())
      .filter(Boolean)
  );

  // Palavras/padrões que NÃO são bairro
  const notBairro = (line: string): boolean => {
    const t = line.trim();
    if (!t || t.length < 3) return true;
    const up = t.toUpperCase();
    if (/^\d+$/.test(t)) return true; // só números
    if (/^\d{5}-?\d{3}$/.test(t)) return true; // CEP
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(t)) return true; // rastreio
    if (/^[A-Z0-9]{8,}$/.test(t) && !/\s/.test(t)) return true; // ID alfanumérico
    if (up.includes("SHOPEE") || up.includes("SEDEX") || up.includes("PAC")) return true;
    if (up.includes("DESTINATÁRIO") || up.includes("REMETENTE") || up.includes("CONTRATO")) return true;
    if (up.includes("RECEBEDOR") || up.includes("ASSINATURA") || up.includes("DOCUMENTO")) return true;
    if (up.includes("ID PEDIDO") || up.includes("DECLARAÇÃO") || up.includes("IDENTIFICAÇÃO")) return true;
    if (knownValues.has(t.toLowerCase())) return true;
    // Linha que começa com "Rua", "Avenida", "Al.", "R." → é endereço, não bairro
    if (/^(rua|avenida|av\.|al\.|alameda|trav\.|travessa|r\.)\s/i.test(t)) return true;
    return false;
  };

  // Procura o bairro: linha que aparece DEPOIS da rua do destinatário nas allLines
  const ruaIdx = allLines.findIndex((l) =>
    l.toLowerCase().includes(destRuaPartes[0]?.toLowerCase() || "§§§")
  );

  if (ruaIdx !== -1) {
    for (let i = ruaIdx + 1; i < Math.min(ruaIdx + 6, allLines.length); i++) {
      const candidate = allLines[i].trim();
      if (!notBairro(candidate)) {
        destBairro = candidate;
        break;
      }
    }
  }

  // Fallback: scan geral em allLines
  if (!destBairro) {
    for (const line of allLines) {
      if (!notBairro(line)) {
        // Verifica se a linha não é cidade conhecida do destinatário ou remetente
        if (
          line.toLowerCase() !== destCidade.toLowerCase() &&
          line.toLowerCase() !== remCidade.toLowerCase()
        ) {
          destBairro = line.trim();
          break;
        }
      }
    }
  }

  /* ══════════════════════════════════════════════════════
     TABELA DE PRODUTOS — Página 2 (Declaração de Conteúdo)
     Lógica preservada da V6, com melhorias
  ══════════════════════════════════════════════════════ */
  let totalQtd = 1;
  let totalVal = "R$ 0,00";

  const tMatch =
    fullText.match(/Totais\s+(\d+)\s+([\d.,]+[.,]\d{2})/i) ||
    fullText.match(/Total\s*\((\d+)\s*itens\)/i);
  if (tMatch) {
    totalQtd = parseInt(tMatch[1]);
    if (tMatch[2]) totalVal = "R$ " + tMatch[2].replace(".", ",");
  } else {
    const valMatch = fullText.match(/R\$\s*([\d.,]+)/);
    if (valMatch) totalVal = "R$ " + valMatch[1];
  }

  const prods: ProdItem[] = [];

  const decIndex = fullText.toUpperCase().indexOf("DECLARAÇÃO DE CONTEÚDO");
  const searchArea = decIndex !== -1 ? fullText.slice(decIndex) : fullText;

  let blocoTabela = "";
  const tableMatch = searchArea.match(
    /(?:VALOR|DESCRIÇÃO DO PRODUTO|Conteúdo)\b\s*(.+?)\s*(?:Peso Total\b|Assinatura\b|Total\s*\(|Declaro\b)/is
  );
  if (tableMatch) {
    blocoTabela = tableMatch[1];
  } else {
    const fallbackMatch = searchArea.match(/(?:VALOR|DESCRIÇÃO DO PRODUTO|Conteúdo)\b\s*(.+)/is);
    if (fallbackMatch) blocoTabela = fallbackMatch[1];
  }

  if (blocoTabela) {
    blocoTabela = blocoTabela
      .replace(/VARIAÇÃO|QTD|CÓDIGO\s*\(SKU\)|Nº|DESCRIÇÃO DO PRODUTO|VALOR|Conteúdo|Item/gi, "")
      .trim();

    const itemRegex = /(?:^|\s)(\d+)\s+(.+?)\s+(\d+)\s+([\d.,]+[.,]\d{2})(?=\s|$|\s\d+\s)/g;
    let m;
    let encontrou = false;

    while ((m = itemRegex.exec(blocoTabela)) !== null) {
      encontrou = true;
      const n = m[1];
      const rawDesc = m[2].trim();
      let desc = rawDesc;
      let vari = "-";
      const qtd = m[3];
      let val = m[4];

      const varMatch = rawDesc.match(/(.*?)\s+([A-Za-z0-9À-ÿ/\s-]+,[A-Za-z0-9À-ÿ/\s-]+)$/);
      if (varMatch) {
        desc = varMatch[1].trim();
        vari = varMatch[2].trim();
      } else {
        const colorMatch = rawDesc.match(
          /(.*?)\s+((?:Bege|Preto|Branco|Azul|Verde|Vermelho|Rosa|Cinza|Amarelo|Lilás|Roxo|Laranja|Marrom|Sortido).*?)$/i
        );
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
      prods.push({ n: "1", desc: blocoTabela.substring(0, 150), var: "-", qtd: totalQtd, val: totalVal });
    }
  } else {
    prods.push({ n: "1", desc: "Produtos conforme declaração", var: "-", qtd: totalQtd, val: totalVal });
  }

  return {
    rastreio,
    contrato,
    idPedido,
    modal,
    destNome,
    destRua,
    destBairro,
    destCidade,
    destUf,
    destCep,
    remNome,
    remEnd,
    remCidade,
    remUf,
    remCep,
    prods,
    totalQtd,
    totalVal,
  };
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

  /* ── Gera barcodes/QRs sempre que data mudar ── */
  useEffect(() => {
    if (!data) return;

    // Barcode principal: código de rastreio SEDEX
    try {
      if (bcMainRef.current) {
        JsBarcode(bcMainRef.current, data.rastreio || "AD000000000BR", {
          format: "CODE128",
          displayValue: true,
          fontSize: 9,
          height: 34,
          margin: 3,
          lineColor: "#000",
          background: "#fff",
          textMargin: 2,
          font: "Courier New,monospace",
        });
        bcMainRef.current.setAttribute("width", "100%");
        bcMainRef.current.removeAttribute("height");
      }
    } catch (_) {}

    // Barcode CEP: CEP do destinatário
    try {
      const cepNum = (data.destCep || "00000000").replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
      if (bcCepRef.current)
        JsBarcode(bcCepRef.current, cepNum, {
          format: "CODE128",
          displayValue: false,
          height: 20,
          margin: 2,
          lineColor: "#000",
          background: "#fff",
        });
    } catch (_) {}

    // QR topo: ID do Pedido (fiel ao PDF original da Shopee)
    if (qrTopRef.current)
      QRCode.toCanvas(qrTopRef.current, data.idPedido || data.rastreio || "NOID", {
        width: 52,
        margin: 1,
        color: { dark: "#000", light: "#fff" },
      }).catch(() => {});

    // QR remetente: ID do Pedido (fiel ao PDF original da Shopee)
    if (qrRemRef.current)
      QRCode.toCanvas(qrRemRef.current, data.idPedido || data.rastreio || "NOID", {
        width: 42,
        margin: 1,
        color: { dark: "#000", light: "#fff" },
      }).catch(() => {});
  }, [data]);

  /* ── Leitura do PDF com separação por páginas ── */
  const handleFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf") {
      setStatus({ msg: "Selecione um arquivo PDF.", type: "error" });
      return;
    }
    setFile(f);
    setStatus({ msg: "Lendo PDF…", type: "loading" });

    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

      // Linhas de todas as páginas (para fullText, bairro, produtos)
      let allLines: string[] = [];
      // Itens da página 2 com coordenada X (para separação REM/DEST)
      let page2Items: Array<{ text: string; x: number; y: number }> = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const tc = await page.getTextContent();

        if (pageNum === 2) {
          // Página 2: salvar itens individuais COM coordenada X
          // transform[4] = x, transform[5] = y no espaço do PDF
          tc.items.forEach((item: any) => {
            const text = (item.str || "").trim();
            if (text) {
              const x = item.transform ? item.transform[4] : 0;
              const y = item.transform ? item.transform[5] : 0;
              page2Items.push({ text, x, y });
            }
          });
        }

        // Todas as páginas: reconstruir linhas via hasEOL
        let acc = "";
        tc.items.forEach((item: any) => {
          if (item.hasEOL) {
            const line = (acc + item.str).trim();
            if (line) allLines.push(line);
            acc = "";
          } else {
            acc += item.str;
          }
        });
        if (acc.trim()) allLines.push(acc.trim());
      }

      // Filtrar ruído legal da Shopee
      const noisePatterns = [
        "IMPORTANTE: INFORMAMOS",
        "NÃO GUARDA POSSE",
        "CONTEÚDOS CONTIDOS NESTE",
        "O A PESSOA IDENTIFICADA",
        "SÓ SE LIMITA À PUBLICAÇÃO",
        "RESPONSÁVEL PELO BEM ENVIADO",
        "DECLARO QUE NÃO ME ENQUADRO",
        "RISCO O TRANSPORTE AÉREO",
        "INICIEM NO EXTERIOR",
        "TERMOS DA LEI E A QUEM",
        "RESPONSABILIDADE PELA INFORMAÇÃO",
        "PENAL BRASILEIRO",
        "CORREIOS.COM.BR",
        "CONSTITUI CRIME",
        "LEI 8.137",
        "OBSERVAÇÃO:",
      ];
      const cleanLines = allLines.filter((l) => {
        const up = l.toUpperCase();
        return !noisePatterns.some((p) => up.includes(p));
      });

      const fullText = cleanLines.join(" ");
      const pageData: PageData = { page2Items, allLines: cleanLines, fullText };

      const d = parse(pageData);
      setData(d);
      setStatus({ msg: `✓ ${d.rastreio || "Etiqueta"} extraído com sucesso!`, type: "success" });
    } catch (e: any) {
      setStatus({ msg: "Erro ao ler PDF: " + e.message, type: "error" });
    }
  }, []);

  /* ── Exportar PDF ── */
  const gerar = useCallback(async () => {
    if (!data || busy || !etqRef.current) return;
    setBusy(true);
    setStatus({ msg: "Gerando imagem…", type: "loading" });
    try {
      await new Promise((r) => setTimeout(r, 600));
      const canvas = await html2canvas(etqRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#fff",
        logging: false,
        imageTimeout: 0,
      });
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

      // Nome do arquivo: primeiroNome_prod1_prod2_prod3.pdf
      const fname = buildFileName(
        data.destNome,
        data.prods[0]?.desc || "produto",
        fmt
      );

      pdf.save(fname);
      setStatus({ msg: `✓ ${fname} baixado!`, type: "success" });
      toast({ title: "Etiqueta exportada!", description: fname });
    } catch (e: any) {
      setStatus({ msg: "Erro: " + e.message, type: "error" });
    }
    setBusy(false);
  }, [data, busy, fmt]);

  const reset = () => {
    setFile(null);
    setData(null);
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);

  const dropBorder = data ? "border-success" : dragging ? "border-primary" : "border-border";
  const dropBg = data ? "bg-success/5" : dragging ? "bg-primary/5" : "bg-muted/30";

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho da página */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Tag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Etiquetas Shopee</h1>
            <p className="text-xs font-bold text-green-500">Parser V7 · Endereços Precisos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* ── Coluna esquerda: controles ── */}
          <div className="space-y-4">
            {/* Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" /> PDF da Shopee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onClick={() => inputRef.current?.click()}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dropBorder} ${dropBg}`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
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

            {/* Formato de exportação */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Printer className="h-4 w-4" /> Formato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {(["t", "a"] as Fmt[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFmt(f)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        fmt === f
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-sm font-bold block">
                        {f === "t" ? "🖨️ Térmica" : "📄 A4"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {f === "t" ? "100×150 mm" : "210×297 mm"}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Exportar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileDown className="h-4 w-4" /> Exportar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {status && (
                  <div
                    className={`rounded-lg px-3 py-2 text-xs font-mono flex items-center gap-2 border ${
                      status.type === "loading"
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : status.type === "success"
                        ? "bg-success/10 border-success/30 text-success"
                        : status.type === "error"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {status.type === "loading" && (
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    )}
                    {status.msg}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={gerar} disabled={!data || busy} className="flex-1 gap-2">
                    ⚡ Gerar PDF
                  </Button>
                  <Button variant="outline" onClick={reset} size="icon">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                {data && (
                  <p className="text-[10px] text-muted-foreground text-center font-mono">
                    💾 {buildFileName(data.destNome, data.prods[0]?.desc || "produto", fmt)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Dados extraídos */}
            {data && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Dados Extraídos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ["Rastreio", data.rastreio],
                        ["Modal", data.modal],
                        ["ID Pedido", data.idPedido],
                        ["CEP Dest.", data.destCep],
                        ["Destinatário", data.destNome],
                        ["Remetente", data.remNome],
                      ] as [string, string][]
                    ).map(([l, v]) => (
                      <div
                        key={l}
                        className={`rounded-lg bg-muted/40 px-2 py-1.5 ${
                          l === "Destinatário" || l === "Remetente" ? "col-span-2" : ""
                        }`}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {l}
                        </p>
                        <p className="text-xs font-semibold font-mono truncate">{v || "—"}</p>
                      </div>
                    ))}
                  </div>
                  <table className="w-full text-xs mt-2">
                    <thead>
                      <tr className="bg-primary/10">
                        <th className="p-1 text-left text-[9px] font-bold text-primary">#</th>
                        <th className="p-1 text-left text-[9px] font-bold text-primary">Descrição</th>
                        <th className="p-1 text-left text-[9px] font-bold text-primary">Var.</th>
                        <th className="p-1 text-left text-[9px] font-bold text-primary">Qtd</th>
                        <th className="p-1 text-left text-[9px] font-bold text-primary">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.prods.map((p, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="p-1">{p.n}</td>
                          <td
                            className="p-1 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap"
                            title={p.desc}
                          >
                            {p.desc}
                          </td>
                          <td className="p-1">{p.var}</td>
                          <td className="p-1">{p.qtd}</td>
                          <td className="p-1">{p.val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Coluna direita: preview da etiqueta ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Preview · Etiqueta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-center min-h-[200px] p-4 rounded-xl border border-border bg-[repeating-conic-gradient(rgba(0,0,0,.03)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] overflow-y-auto overflow-x-auto">
                {!data ? (
                  <div className="text-center text-muted-foreground pt-10">
                    <span className="text-4xl block mb-2">🏷️</span>
                    <p className="font-semibold">Carregue um PDF</p>
                  </div>
                ) : (
                  <div ref={etqRef} style={LS.root}>

                    {/* ── Cabeçalho Shopee ── */}
                    <div style={LS.hdr}>
                      <div style={LS.logo}>
                        <div style={LS.sico}>S</div>
                        <div>
                          <div style={LS.sname}>Shopee</div>
                          <div style={LS.idlbl}>ID pedido:</div>
                          <div style={LS.idval}>{data.idPedido || "—"}</div>
                        </div>
                      </div>
                      {/* QR topo = ID Pedido (fiel ao original) */}
                      <canvas ref={qrTopRef} />
                    </div>

                    {/* ── Rastreio + Barcode principal ── */}
                    <div style={LS.rastr}>
                      <div style={LS.contrato}>Contrato: {data.contrato}</div>
                      <div style={LS.modal}>{data.modal}</div>
                      <div style={LS.cod}>{data.rastreio}</div>
                      <div style={LS.bcMain}>
                        <svg ref={bcMainRef} />
                      </div>
                    </div>

                    {/* ── Recebedor / Assinatura / Documento ── */}
                    <div style={LS.receb}>
                      <div style={LS.row}>
                        <span>Recebedor:</span>
                        <div style={LS.ul} />
                      </div>
                      <div style={LS.row}>
                        <span>Assinatura:</span>
                        <div style={LS.ul} />
                      </div>
                      <div style={LS.row}>
                        <span>Documento:</span>
                        <div style={LS.ul} />
                      </div>
                    </div>

                    {/* ── DESTINATÁRIO — 5 linhas exatas ── */}
                    <div style={LS.tag}>DESTINATÁRIO</div>
                    <div style={LS.dest}>
                      {/* Linha 1: Nome */}
                      <div style={LS.dnome}>{data.destNome || "—"}</div>
                      {/* Linha 2: Rua e número */}
                      <div style={LS.drua}>{data.destRua || "—"}</div>
                      {/* Linha 3: Bairro */}
                      <div style={LS.dbairro}>{data.destBairro}</div>
                      {/* Linha 4: Cidade (esq) + CEP (dir) */}
                      <div style={LS.dciduf}>
                        <span style={LS.dcid}>{data.destCidade}</span>
                        <span style={LS.dcep}>{data.destCep}</span>
                      </div>
                      {/* Linha 5: UF */}
                      <div style={LS.duf}>{data.destUf}</div>
                    </div>

                    {/* ── Barcode CEP destinatário ── */}
                    <div style={LS.bccep}>
                      <svg ref={bcCepRef} style={{ display: "block", maxWidth: 155 }} />
                    </div>

                    {/* ── REMETENTE — 2 linhas limpas ── */}
                    <div style={LS.tag}>REMETENTE</div>
                    <div style={LS.rem}>
                      <div>
                        {/* Linha 1: Nome da loja */}
                        <div style={LS.rnome}>{data.remNome}</div>
                        {/* Linha 2: Endereço completo (Av. + cidade + estado) */}
                        <div style={LS.rend}>{data.remEnd}</div>
                        {/* Linha 3: CEP */}
                        <div style={LS.rcep}>CEP: {data.remCep}</div>
                      </div>
                      {/* QR remetente = ID Pedido (fiel ao original) */}
                      <canvas ref={qrRemRef} />
                    </div>

                    {/* ── Tabela de produtos ── */}
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
                            <td style={{ ...LS.btd, whiteSpace: "normal", wordBreak: "break-word" }}>
                              <strong>{p.desc}</strong>
                            </td>
                            <td style={LS.btd}>{p.var}</td>
                            <td style={{ ...LS.btd, textAlign: "center" }}>{p.qtd}</td>
                            <td style={{ ...LS.btd, textAlign: "right", fontWeight: 700 }}>{p.val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* ── Total ── */}
                    <div style={LS.btot}>
                      <span>Total ({Math.max(data.totalQtd, 1)} itens)</span>
                      <span>{data.totalVal}</span>
                    </div>

                    {/* ── Assinatura / Data ── */}
                    <div style={LS.assin}>
                      <div>
                        <div style={LS.aul} />
                        <span>Assinatura do Remetente/Declarante</span>
                      </div>
                      <div>
                        <div style={LS.dul} />
                        <span>Data: ___/___/______</span>
                      </div>
                    </div>

                    {/* ── Rodapé ── */}
                    <div style={LS.rod}>
                      Shopee não é proprietário nem responsável pelos bens entregues (art.261 CP).
                    </div>
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
