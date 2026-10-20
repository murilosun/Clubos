import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutGrid, Calendar, Users, Car, ClipboardList, Wallet, Package,
  MessageCircle, Wrench, UserCog, BarChart3, Settings, Search, Bell,
  Plus, ChevronRight, ChevronLeft, X, Check, Clock, Trash2,
  TrendingUp, TrendingDown, DollarSign, Sparkles, AlertTriangle,
  Phone, MapPin, Star, LogOut, Menu, Loader2, ArrowRight, Pencil as PenIcon, Printer, Receipt, FileText
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import {
  DEFAULT_BRAND, PALETTE, STATUS_FLOW, APPT_STATUS, STATUS_COLOR, todayISO, money, uid, waLink,
  parseDurationMin, addMinutesToTime, addDays, addMonths, startOfWeek, weekdayLabels, monthLabels,
  KIND_OPTIONS_BY_TYPE, entryRealizedAmount, entryStatus, ENTRY_STATUS_LABEL, ENTRY_STATUS_COLOR,
  realizedRevenue, realizedExpenses, openPrintWindow, buildReceiptHTML, buildA4HTML,
  onlyDigits, orderItemsRows, orderTechs, escapeHtml
} from "../lib/utils";
import { Card, Badge, KPI, Avatar, PrimaryButton, GhostButton, IconBtn, Field, Modal, PageHeader, Toast } from "../components/ui";

export function Financeiro({ financial, setFinancial, orders, stockMovements, setStockMovements }) {
  const emptyForType = (type) => ({ type, desc: "", value: "", date: todayISO(), kind: KIND_OPTIONS_BY_TYPE[type][0].v, party: "" });
  const [tab, setTab] = useState("visao"); // visao | lancamentos
  const [modal, setModal] = useState(null); // null | "new" | entry being edited
  const [form, setForm] = useState(emptyForType("saida"));
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [periodMode, setPeriodMode] = useState("mes"); // mes | intervalo
  const [monthRef, setMonthRef] = useState(todayISO().slice(0, 7)); // "YYYY-MM"
  const [rangeFrom, setRangeFrom] = useState(addDays(todayISO(), -6));
  const [rangeTo, setRangeTo] = useState(todayISO());

  const monthLabel = useMemo(() => {
    const [y, m] = monthRef.split("-").map(Number);
    return `${monthLabels[m - 1]} de ${y}`;
  }, [monthRef]);
  const shiftMonth = (delta) => setMonthRef(prev => {
    const [y, m] = prev.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const inPeriod = (dateStr) => periodMode === "mes" ? dateStr.slice(0, 7) === monthRef : (dateStr >= rangeFrom && dateStr <= rangeTo);
  const periodLabel = periodMode === "mes" ? monthLabel : `${new Date(rangeFrom + "T00:00").toLocaleDateString("pt-BR")} até ${new Date(rangeTo + "T00:00").toLocaleDateString("pt-BR")}`;

  const entradasMes = realizedRevenue(orders, financial, inPeriod);
  const saidasMes = realizedExpenses(financial, inPeriod);
  const aPagar = financial.filter(f => f.kind === "a_pagar" && entryStatus(f) !== "pago" && inPeriod(f.date));
  const aReceber = financial.filter(f => f.kind === "a_receber" && entryStatus(f) !== "pago" && inPeriod(f.date));
  const contasPagas = financial.filter(f => (f.kind === "a_pagar" || f.kind === "a_receber") && entryStatus(f) === "pago" && f.kind !== "avulso" && inPeriod(f.date));
  const entriesOfMonth = financial.filter(f => inPeriod(f.date));
  const pendingReceivable = aReceber.reduce((s, f) => s + (Number(f.value) - entryRealizedAmount(f)), 0);

  const openNew = () => { setForm({ ...emptyForType("saida"), date: periodMode === "mes" ? `${monthRef}-01` : rangeTo }); setModal("new"); };
  const openEdit = (f) => { setForm({ type: f.type, desc: f.desc, value: f.value, date: f.date, kind: f.kind, party: f.party || "" }); setModal(f); };
  const changeType = (type) => setForm({ ...form, type, kind: KIND_OPTIONS_BY_TYPE[type][0].v });

  const save = () => {
    if (!form.desc || !form.value) return;
    if (modal === "new") {
      const isAvulso = form.kind === "avulso";
      setFinancial(prev => [{ id: uid(), ...form, value: Number(form.value), paid: isAvulso, settledAmount: isAvulso ? Number(form.value) : 0 }, ...prev]);
    } else {
      setFinancial(prev => prev.map(f => f.id === modal.id ? { ...f, ...form, value: Number(form.value) } : f));
    }
    setModal(null);
  };
  const removeEntry = (id) => {
    const linkedMovement = stockMovements?.find(m => m.financialEntryId === id);
    if (linkedMovement) setStockMovements(prev => prev.filter(m => m.id !== linkedMovement.id));
    setFinancial(prev => prev.filter(f => f.id !== id));
  };

  const openSettle = (f) => { setSettleTarget(f); setSettleAmount(String((Number(f.value) - entryRealizedAmount(f)).toFixed(2))); };
  const confirmSettle = () => {
    const add = Number(settleAmount) || 0;
    if (add <= 0) { setSettleTarget(null); return; }
    setFinancial(prev => prev.map(f => {
      if (f.id !== settleTarget.id) return f;
      const newSettled = Math.min(Number(f.value), (Number(f.settledAmount) || 0) + add);
      return { ...f, settledAmount: newSettled, paid: newSettled >= Number(f.value) };
    }));
    setSettleTarget(null);
  };

  const weekChart = useMemo(() => {
    const days = []; const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      days.push({ day: label.charAt(0).toUpperCase() + label.slice(1), value: realizedRevenue(orders, financial, (od) => od === iso) });
    }
    return days;
  }, [orders, financial]);

  return (
    <div className="page">
      <PageHeader title="Financeiro" subtitle="Fluxo de caixa, contas a pagar, a receber e pagas." action={<PrimaryButton icon={Plus} onClick={openNew}>Novo Lançamento</PrimaryButton>} />

      <div className="segmented" style={{ marginBottom: 16 }}>
        <button className={tab === "visao" ? "active" : ""} onClick={() => setTab("visao")}>Visão Geral</button>
        <button className={tab === "lancamentos" ? "active" : ""} onClick={() => setTab("lancamentos")}>Lançamentos</button>
      </div>

      {tab === "visao" ? (
        <>
          <div className="period-bar">
            <div className="segmented">
              <button className={periodMode === "mes" ? "active" : ""} onClick={() => setPeriodMode("mes")}>Mês</button>
              <button className={periodMode === "intervalo" ? "active" : ""} onClick={() => setPeriodMode("intervalo")}>Período personalizado</button>
            </div>
            {periodMode === "mes" ? (
              <div className="agenda-nav">
                <IconBtn icon={ChevronLeft} title="Mês anterior" onClick={() => shiftMonth(-1)} />
                <button className="agenda-label" onClick={() => setMonthRef(todayISO().slice(0, 7))}>{monthLabel}</button>
                <IconBtn icon={ChevronRight} title="Próximo mês" onClick={() => shiftMonth(1)} />
              </div>
            ) : (
              <div className="range-picker">
                <span className="muted">De</span><input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
                <span className="muted">até</span><input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} />
              </div>
            )}
          </div>

          <div className="kpi-grid four">
            <KPI label="Entradas do período" value={money(entradasMes)} icon={TrendingUp} />
            <KPI label="Saídas do período" value={money(saidasMes)} icon={TrendingDown} positive={false} />
            <KPI label="Lucro líquido" value={money(entradasMes - saidasMes)} icon={Wallet} />
            <KPI label="A receber (pendente)" value={money(pendingReceivable)} icon={DollarSign} />
          </div>
          <div className="dash-row">
            <Card className="chart-card">
              <div className="card-head"><h3>Fluxo de caixa</h3><span className="muted">Últimos 7 dias</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weekChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#9A9AA0", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#202022", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v) => [money(v), ""]} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="side-card">
              <div className="card-head"><h3>Contas a pagar</h3></div>
              {aPagar.length ? aPagar.map(f => (
                <div key={f.id} className="mini-row">
                  <span>{f.desc}{f.party ? ` · ${f.party}` : ""}</span>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Badge text={ENTRY_STATUS_LABEL[entryStatus(f)]} color={ENTRY_STATUS_COLOR[entryStatus(f)]} />
                    <b className="neg">{money(-(Number(f.value) - entryRealizedAmount(f)))}</b>
                    <IconBtn icon={Check} title="Registrar pagamento" onClick={() => openSettle(f)} />
                    <IconBtn icon={PenIcon} title="Editar" onClick={() => openEdit(f)} />
                  </span>
                </div>
              )) : <span className="muted" style={{ fontSize: 12 }}>Nenhuma conta pendente.</span>}
              <div className="card-head" style={{ marginTop: 16 }}><h3>Contas a receber</h3></div>
              {aReceber.length ? aReceber.map(f => (
                <div key={f.id} className="mini-row">
                  <span>{f.desc}{f.party ? ` · ${f.party}` : ""}</span>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Badge text={ENTRY_STATUS_LABEL[entryStatus(f)]} color={ENTRY_STATUS_COLOR[entryStatus(f)]} />
                    <b className="pos">{money(Number(f.value) - entryRealizedAmount(f))}</b>
                    <IconBtn icon={Check} title="Registrar recebimento" onClick={() => openSettle(f)} />
                    <IconBtn icon={PenIcon} title="Editar" onClick={() => openEdit(f)} />
                  </span>
                </div>
              )) : <span className="muted" style={{ fontSize: 12 }}>Nenhuma conta pendente.</span>}
              <div className="card-head" style={{ marginTop: 16 }}><h3>Contas pagas</h3></div>
              {contasPagas.length ? contasPagas.map(f => (
                <div key={f.id} className="mini-row"><span>{f.desc}</span><b className="muted">{money(f.value)}</b></div>
              )) : <span className="muted" style={{ fontSize: 12 }}>Nenhuma conta paga neste período.</span>}
            </Card>
          </div>

          <Card>
            <div className="card-head"><h3>Lançamentos — {periodLabel}</h3></div>
            {entriesOfMonth.length ? entriesOfMonth.slice().sort((a, b) => b.date.localeCompare(a.date)).map(f => (
              <div key={f.id} className="mini-row">
                <span>{new Date(f.date + "T00:00").toLocaleDateString("pt-BR")} · {f.desc}</span>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge text={ENTRY_STATUS_LABEL[entryStatus(f)]} color={ENTRY_STATUS_COLOR[entryStatus(f)]} />
                  <b className={f.type === "entrada" ? "pos" : "neg"}>{f.type === "entrada" ? money(f.value) : money(-f.value)}</b>
                  <IconBtn icon={PenIcon} title="Editar" onClick={() => openEdit(f)} />
                  <IconBtn icon={Trash2} title="Excluir" onClick={() => removeEntry(f.id)} />
                </span>
              </div>
            )) : <span className="muted" style={{ fontSize: 12 }}>Nenhum lançamento neste período.</span>}
          </Card>
        </>
      ) : (
        <LancamentosTable financial={financial} onEdit={openEdit} onDelete={removeEntry} onSettle={openSettle} />
      )}

      {modal && (
        <Modal title={modal === "new" ? "Novo Lançamento" : "Editar Lançamento"} onClose={() => setModal(null)} footer={<PrimaryButton onClick={save}>{modal === "new" ? "Salvar lançamento" : "Salvar alterações"}</PrimaryButton>}>
          <div className="segmented full" style={{ marginBottom: 14 }}>
            {["entrada", "saida"].map(t => <button key={t} className={form.type === t ? "active" : ""} onClick={() => changeType(t)}>{t === "entrada" ? "Entrada" : "Saída"}</button>)}
          </div>
          <Field label="Descrição"><input value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} /></Field>
          <div className="form-grid-2">
            <Field label="Valor (R$)"><input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></Field>
            <Field label="Data"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          <Field label="Cliente / Fornecedor (opcional)"><input value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} /></Field>
          <Field label="Categoria">
            <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
              {KIND_OPTIONS_BY_TYPE[form.type].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </Field>
          <p className="muted" style={{ fontSize: 11.5 }}>
            {form.type === "entrada" ? "Só aparecem categorias de entrada aqui — não é possível registrar uma saída como \"conta a receber\"." : "Só aparecem categorias de saída aqui — não é possível registrar uma entrada como \"conta a pagar\"."}
          </p>
        </Modal>
      )}

      {settleTarget && (
        <Modal title={settleTarget.type === "entrada" ? "Registrar recebimento" : "Registrar pagamento"} onClose={() => setSettleTarget(null)} footer={<PrimaryButton onClick={confirmSettle}>Confirmar</PrimaryButton>}>
          <div className="detail-item" style={{ marginBottom: 12 }}><span>{settleTarget.desc} — falta {money(Number(settleTarget.value) - entryRealizedAmount(settleTarget))} de {money(settleTarget.value)}</span></div>
          <Field label={settleTarget.type === "entrada" ? "Valor recebido agora (R$)" : "Valor pago agora (R$)"}>
            <input type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} autoFocus />
          </Field>
          <p className="muted" style={{ fontSize: 11.5 }}>Pode ser o valor total ou parcial — o status atualiza sozinho (Em aberto → Parcial → Pago).</p>
        </Modal>
      )}
    </div>
  );
}

export function LancamentosTable({ financial, onEdit, onDelete, onSettle }) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const KIND_LABEL = { avulso: "Avulso", a_pagar: "Conta a pagar", a_receber: "Conta a receber" };

  const rows = useMemo(() => {
    let list = financial.map(f => ({ ...f, status: entryStatus(f) }));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(f => f.desc.toLowerCase().includes(q) || (f.party || "").toLowerCase().includes(q));
    }
    if (filterType !== "todos") list = list.filter(f => f.type === filterType);
    if (filterStatus !== "todos") list = list.filter(f => f.status === filterStatus);
    list.sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (sortBy === "value") { av = Number(av); bv = Number(bv); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [financial, query, filterType, filterStatus, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };
  const SortHeader = ({ col, children }) => (
    <th onClick={() => toggleSort(col)} style={{ cursor: "pointer", userSelect: "none" }}>
      {children} {sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div>
      <div className="lancamentos-filters">
        <div className="search-box" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <Search size={15} /><input placeholder="Buscar por descrição ou cliente/fornecedor…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="em_aberto">Em aberto</option>
          <option value="parcial">Parcial</option>
          <option value="pago">Pago</option>
          <option value="atrasado">Atrasado</option>
        </select>
      </div>
      <Card style={{ overflowX: "auto" }}>
        <table className="co-table">
          <thead>
            <tr>
              <SortHeader col="date">Data</SortHeader>
              <SortHeader col="type">Tipo</SortHeader>
              <th>Categoria</th>
              <SortHeader col="desc">Descrição</SortHeader>
              <th>Cliente/Fornecedor</th>
              <SortHeader col="value">Valor</SortHeader>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(f => (
              <tr key={f.id}>
                <td>{new Date(f.date + "T00:00").toLocaleDateString("pt-BR")}</td>
                <td><Badge text={f.type === "entrada" ? "Entrada" : "Saída"} color={f.type === "entrada" ? PALETTE.success : PALETTE.danger} /></td>
                <td>{KIND_LABEL[f.kind]}</td>
                <td><b>{f.desc}</b></td>
                <td>{f.party || "—"}</td>
                <td className={f.type === "entrada" ? "pos" : "neg"}>{f.type === "entrada" ? money(f.value) : money(-f.value)}</td>
                <td><Badge text={ENTRY_STATUS_LABEL[f.status]} color={ENTRY_STATUS_COLOR[f.status]} /></td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    {f.status !== "pago" && <IconBtn icon={Check} title="Registrar quitação" onClick={() => onSettle(f)} />}
                    <IconBtn icon={PenIcon} title="Editar" onClick={() => onEdit(f)} />
                    <IconBtn icon={Trash2} title="Excluir" onClick={() => onDelete(f.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8}><span className="muted">Nenhum lançamento encontrado.</span></td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* ESTOQUE                                                                  */
/* ---------------------------------------------------------------------- */
const STOCK_TYPE_LABEL = { entrada: "Entrada (compra)", saida: "Saída (uso)", ajuste: "Ajuste", perda: "Perda" };
const STOCK_TYPE_COLOR = { entrada: "#30D158", saida: "#5AC8FA", ajuste: "#FFD60A", perda: "#FF453A" };
const movementDelta = (m) => (m.type === "entrada" ? Number(m.qty) : (m.type === "saida" || m.type === "perda") ? -Number(m.qty) : Number(m.qty));
