export const DEFAULT_BRAND = {
  name: "ClubOS",
  suffix: "by Car Club",
  mark: "C",
  accent: "#FF6A00",
};
export const PALETTE = { bg: "#111111", surface: "#1A1A1C", surfaceAlt: "#202022", border: "rgba(255,255,255,0.08)", white: "#FFFFFF", textDim: "#9A9AA0", success: "#30D158", warning: "#FFD60A", danger: "#FF453A" };

export const STATUS_FLOW = ["Recebido", "Em Processo", "Finalizado", "Entregue"];
export const APPT_STATUS = ["Agendado", "Confirmado", "Em andamento", "Finalizado", "Cancelado"];
export const STATUS_COLOR = {
  "Agendado": "#9A9AA0", "Confirmado": "#30D158", "Em andamento": "#FF6A00", "Finalizado": "#3B82F6",
  "Cancelado": "#FF453A", "Entregue": "#30D158", "Recebido": "#9A9AA0", "Em Processo": "#FF6A00",
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const money = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const onlyDigits = (s) => (s || "").replace(/\D/g, "");
export const waLink = (phone, text) => `https://wa.me/55${onlyDigits(phone)}?text=${encodeURIComponent(text)}`;
export const parseDurationMin = (str) => {
  if (!str) return 60;
  const s = String(str).toLowerCase();
  let mins = 0;
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*h/);
  const m = s.match(/(\d+)\s*(?:min|m(?!\w))/);
  if (h) mins += parseFloat(h[1].replace(",", ".")) * 60;
  if (m) mins += parseInt(m[1]);
  if (!h && !m) { const n = parseInt(s); if (!isNaN(n)) mins = n; }
  return mins || 60;
};
export const addMinutesToTime = (time, mins) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
export const addDays = (iso, n) => { const d = new Date(iso + "T00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const addMonths = (iso, n) => { const d = new Date(iso + "T00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
export const startOfWeek = (iso) => { const d = new Date(iso + "T00:00"); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); };
export const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const monthLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/* ---------------------------------------------------------------------- */
/* FINANCEIRO — regras centrais (usadas em Financeiro, Dashboard e         */
/* Relatórios, para garantir que os números batem em todo o sistema)       */
/* ---------------------------------------------------------------------- */
export const KIND_OPTIONS_BY_TYPE = {
  entrada: [
    { v: "avulso", l: "Recebimento avulso (já recebido)" },
    { v: "a_receber", l: "Conta a receber" },
  ],
  saida: [
    { v: "avulso", l: "Pagamento avulso (já pago)" },
    { v: "a_pagar", l: "Conta a pagar" },
  ],
};
export const entryRealizedAmount = (f) => {
  const value = Number(f.value) || 0;
  if (f.kind === "avulso") return value;
  return Math.min(Number(f.settledAmount) || 0, value);
};
export const entryStatus = (f) => {
  if (f.kind === "avulso") return "pago";
  const settled = Number(f.settledAmount) || 0;
  const value = Number(f.value) || 0;
  if (value > 0 && settled >= value) return "pago";
  if (settled > 0) return "parcial";
  if (f.date < todayISO()) return "atrasado";
  return "em_aberto";
};
export const ENTRY_STATUS_LABEL = { em_aberto: "Em aberto", parcial: "Parcial", pago: "Pago", atrasado: "Atrasado" };
export const ENTRY_STATUS_COLOR = { em_aberto: "#9A9AA0", parcial: "#FFD60A", pago: "#30D158", atrasado: "#FF453A" };
export const realizedRevenue = (orders, financial, dateFilter) => {
  const ordersRevenue = orders.filter(o => !dateFilter || dateFilter(o.createdAt)).reduce((s, o) => s + (Number(o.value) || 0) * (1 - (Number(o.discount) || 0) / 100), 0);
  const financeEntradas = financial.filter(f => f.type === "entrada" && (!dateFilter || dateFilter(f.date))).reduce((s, f) => s + entryRealizedAmount(f), 0);
  return ordersRevenue + financeEntradas;
};
export const realizedExpenses = (financial, dateFilter) =>
  financial.filter(f => f.type === "saida" && (!dateFilter || dateFilter(f.date))).reduce((s, f) => s + entryRealizedAmount(f), 0);

/* ---------------------------------------------------------------------- */
/* IMPRESSÃO DA OS — notinha (térmica) e folha A4                          */
/* ---------------------------------------------------------------------- */
export function openPrintWindow(html) {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) { alert("Seu navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}
export function orderItemsRows(order) {
  return order.items?.length ? order.items : [{ name: order.serviceName, price: order.value }];
}
export function orderTechs(order) {
  return order.techs?.length ? order.techs : (order.tech ? [order.tech] : []);
}
export function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function buildReceiptHTML(order, client, brand) {
  const rows = orderItemsRows(order).map(i => `<div class="row"><span>${escapeHtml(i.name)}</span><span>${money(i.price)}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${order.code}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; width: 72mm; margin: 0; padding: 0; color: #000; font-size: 12px; line-height: 1.45; }
  .center { text-align: center; }
  .b { font-weight: bold; }
  .big { font-size: 15px; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .muted { color: #444; font-size: 11px; }
</style></head>
<body>
  <div class="center b big">${escapeHtml(brand.name)}</div>
  <div class="center muted">${escapeHtml(brand.suffix)}</div>
  <div class="line"></div>
  <div class="row"><span>OS</span><span class="b">${escapeHtml(order.code || order.id)}</span></div>
  <div class="row"><span>Data</span><span>${new Date(order.createdAt + "T00:00").toLocaleDateString("pt-BR")}</span></div>
  <div class="line"></div>
  <div><span class="b">Cliente:</span> ${escapeHtml(order.clientName)}</div>
  ${client?.phone ? `<div><span class="b">Telefone:</span> ${escapeHtml(client.phone)}</div>` : ""}
  <div><span class="b">Veículo:</span> ${escapeHtml(order.vehicleLabel)}</div>
  <div class="line"></div>
  <div class="b">Serviços</div>
  ${rows}
  <div class="line"></div>
  ${order.discount ? `<div class="row"><span>Desconto</span><span>${order.discount}%</span></div>` : ""}
  <div class="row big b"><span>TOTAL</span><span>${money(order.value)}</span></div>
  <div class="line"></div>
  <div><span class="b">Responsável:</span> ${escapeHtml(orderTechs(order).join(", ") || "—")}</div>
  <div><span class="b">Status:</span> ${escapeHtml(order.status)}</div>
  ${order.notes ? `<div class="line"></div><div class="muted">${escapeHtml(order.notes)}</div>` : ""}
  <div class="line"></div>
  <div class="center">Obrigado pela preferência!</div>
  <div class="center muted">${escapeHtml(order.code || order.id)}</div>
</body></html>`;
}
export function buildA4HTML(order, client, brand) {
  const rows = orderItemsRows(order).map(i => `<tr><td>${escapeHtml(i.name)}</td><td class="right">${money(i.price)}</td></tr>`).join("");
  const subtotal = orderItemsRows(order).reduce((s, i) => s + (Number(i.price) || 0), 0);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${order.code}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #111; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #FF6A00; padding-bottom: 16px; margin-bottom: 24px; }
  .brand b { font-size: 22px; letter-spacing: -0.5px; }
  .brand span { display: block; color: #666; font-size: 12px; }
  .osnum { text-align: right; }
  .osnum b { font-size: 20px; }
  .osnum span { display: block; color: #666; font-size: 12px; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin: 0 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; color: #888; text-transform: uppercase; padding: 6px 0; border-bottom: 1px solid #ddd; }
  td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
  .right { text-align: right; }
  .totals { display: flex; justify-content: flex-end; margin-top: 10px; }
  .totals table { width: 260px; }
  .totals td { border: none; padding: 4px 0; }
  .totals .grand td { font-size: 17px; font-weight: 700; border-top: 2px solid #111; padding-top: 8px; }
  .sign { margin-top: 60px; display: flex; gap: 40px; }
  .sign div { flex: 1; text-align: center; }
  .sign .line { border-top: 1px solid #111; margin-bottom: 6px; height: 40px; }
  .status-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; background: #FF6A0022; color: #FF6A00; font-size: 12px; font-weight: 700; }
</style></head>
<body>
  <div class="head">
    <div class="brand"><b>${escapeHtml(brand.name)}</b><span>${escapeHtml(brand.suffix)}</span></div>
    <div class="osnum"><b>${escapeHtml(order.code || order.id)}</b><span>${new Date(order.createdAt + "T00:00").toLocaleDateString("pt-BR")}</span></div>
  </div>

  <div class="section grid2">
    <div><h3>Cliente</h3>${escapeHtml(order.clientName)}<br/>${client?.phone ? escapeHtml(client.phone) + "<br/>" : ""}${client?.doc ? escapeHtml(client.doc) : ""}</div>
    <div><h3>Veículo</h3>${escapeHtml(order.vehicleLabel)}</div>
  </div>

  <div class="section">
    <h3>Serviços realizados</h3>
    <table><thead><tr><th>Descrição</th><th class="right">Valor</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <table>
        <tr><td>Subtotal</td><td class="right">${money(subtotal)}</td></tr>
        ${order.discount ? `<tr><td>Desconto</td><td class="right">-${order.discount}%</td></tr>` : ""}
        <tr class="grand"><td>Total</td><td class="right">${money(order.value)}</td></tr>
      </table>
    </div>
  </div>

  <div class="section grid2">
    <div><h3>Responsável</h3>${escapeHtml(orderTechs(order).join(", ") || "—")}</div>
    <div><h3>Status</h3><span class="status-pill">${escapeHtml(order.status)}</span></div>
  </div>

  ${order.notes ? `<div class="section"><h3>Observações</h3>${escapeHtml(order.notes)}</div>` : ""}

  <div class="sign">
    <div><div class="line"></div>Assinatura do cliente</div>
    <div><div class="line"></div>Responsável técnico</div>
  </div>
</body></html>`;
}

/* ---------------------------------------------------------------------- */
/* UI PRIMITIVOS                                                            */
/* ---------------------------------------------------------------------- */
