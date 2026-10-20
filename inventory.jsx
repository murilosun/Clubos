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

export function Estoque({ products, setProducts, stockMovements, setStockMovements, financial, setFinancial, employees }) {
  const [tab, setTab] = useState("produtos"); // produtos | movimentacoes
  const empty = { name: "", qty: "", min: "", unitCost: "", supplier: "" };
  const [modal, setModal] = useState(null); // null | "new" | product being edited
  const [form, setForm] = useState(empty);
  const lowCount = products.filter(p => p.qty <= p.min).length;

  const openNew = () => { setForm(empty); setModal("new"); };
  const openEdit = (p) => { setForm({ name: p.name, qty: p.qty, min: p.min, unitCost: p.unitCost, supplier: p.supplier }); setModal(p); };

  const save = () => {
    if (!form.name) return;
    const clean = { ...form, qty: Number(form.qty) || 0, min: Number(form.min) || 0, unitCost: Number(form.unitCost) || 0 };
    if (modal === "new") setProducts(prev => [{ id: uid(), ...clean }, ...prev]);
    else setProducts(prev => prev.map(p => p.id === modal.id ? { ...p, ...clean } : p));
    setModal(null);
  };
  const adjustQty = (product, delta) => {
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, qty: Math.max(0, p.qty + delta) } : p));
    setStockMovements(prev => [{ id: uid(), productId: product.id, productName: product.name, type: "ajuste", qty: delta, unitCost: product.unitCost, totalCost: 0, supplier: "", responsible: "", notes: "Ajuste rápido na tela de produtos", financialEntryId: null, createdAt: todayISO() }, ...prev]);
  };

  return (
    <div className="page">
      <PageHeader title="Estoque" subtitle="Produtos e histórico completo de movimentações." action={tab === "produtos" ? <PrimaryButton icon={Plus} onClick={openNew}>Novo Produto</PrimaryButton> : null} />

      <div className="segmented" style={{ marginBottom: 16 }}>
        <button className={tab === "produtos" ? "active" : ""} onClick={() => setTab("produtos")}>Produtos</button>
        <button className={tab === "movimentacoes" ? "active" : ""} onClick={() => setTab("movimentacoes")}>Movimentações</button>
      </div>

      {tab === "produtos" ? (
        <>
          <Card>
            <table className="co-table">
              <thead><tr><th>Produto</th><th>Quantidade</th><th>Valor médio</th><th>Fornecedor</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {products.map(p => {
                  const low = p.qty <= p.min;
                  return (
                    <tr key={p.id}>
                      <td><b>{p.name}</b></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <IconBtn icon={ChevronLeft} title="Diminuir" onClick={() => adjustQty(p, -1)} />
                          {p.qty} un.
                          <IconBtn icon={ChevronRight} title="Aumentar" onClick={() => adjustQty(p, 1)} />
                        </div>
                      </td>
                      <td>{money(p.unitCost)}</td>
                      <td>{p.supplier}</td>
                      <td>{low ? <Badge text="Estoque baixo" color={PALETTE.danger} /> : <Badge text="Normal" color={PALETTE.success} />}</td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <IconBtn icon={PenIcon} title="Editar" onClick={() => openEdit(p)} />
                        <IconBtn icon={Trash2} title="Excluir" onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          {lowCount > 0 && (
            <Card style={{ marginTop: 14, borderColor: `${PALETTE.danger}55` }}>
              <div className="alert-row"><AlertTriangle size={16} color={PALETTE.danger} /><span>{lowCount} produto(s) abaixo do estoque mínimo. Considere fazer um novo pedido.</span></div>
            </Card>
          )}
          {modal && (
            <Modal title={modal === "new" ? "Novo Produto" : "Editar Produto"} onClose={() => setModal(null)} footer={<PrimaryButton onClick={save}>{modal === "new" ? "Salvar produto" : "Salvar alterações"}</PrimaryButton>}>
              <Field label="Nome do produto"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
              <div className="form-grid-2">
                <Field label="Quantidade atual"><input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></Field>
                <Field label="Estoque mínimo"><input type="number" value={form.min} onChange={e => setForm({ ...form, min: e.target.value })} /></Field>
              </div>
              <div className="form-grid-2">
                <Field label="Valor de compra (R$)"><input type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} /></Field>
                <Field label="Fornecedor"><input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field>
              </div>
            </Modal>
          )}
        </>
      ) : (
        <Movimentacoes products={products} setProducts={setProducts} stockMovements={stockMovements} setStockMovements={setStockMovements} setFinancial={setFinancial} employees={employees} />
      )}
    </div>
  );
}

export function Movimentacoes({ products, setProducts, stockMovements, setStockMovements, setFinancial, employees }) {
  const emptyForm = { type: "entrada", productId: "", qty: "", unitCost: "", supplier: "", responsible: "", notes: "", date: todayISO() };
  const [modal, setModal] = useState(null); // null | "new" | movement being edited
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("todos");

  const openNew = () => { setForm(emptyForm); setModal("new"); };
  const openEdit = (m) => { setForm({ type: m.type, productId: m.productId || "", qty: m.qty, unitCost: m.unitCost, supplier: m.supplier, responsible: m.responsible, notes: m.notes, date: m.createdAt }); setModal(m); };

  const onPickProduct = (productId) => {
    const p = products.find(x => x.id === productId);
    setForm({ ...form, productId, unitCost: p ? p.unitCost : form.unitCost, supplier: p?.supplier || form.supplier });
  };

  const applyToProduct = (productId, delta) => setProducts(prev => prev.map(p => p.id === productId ? { ...p, qty: Math.max(0, p.qty + delta) } : p));

  const reverseMovement = (m) => {
    if (m.productId) applyToProduct(m.productId, -movementDelta(m));
    if (m.financialEntryId) setFinancial(prev => prev.filter(f => f.id !== m.financialEntryId));
  };

  const save = () => {
    const product = products.find(p => p.id === form.productId);
    if (!product || !form.qty) return;
    const qty = Math.abs(Number(form.qty)) || 0;
    const unitCost = Number(form.unitCost) || 0;
    const totalCost = qty * unitCost;

    if (modal !== "new") reverseMovement(modal); // desfaz o efeito antigo antes de reaplicar (edição segura)

    const movementId = modal !== "new" ? modal.id : uid();
    let financialEntryId = null;

    if (form.type === "entrada") {
      financialEntryId = uid();
      setFinancial(prev => [{
        id: financialEntryId, type: "saida", kind: "avulso",
        desc: `Compra de estoque — ${product.name}`, party: form.supplier || "",
        value: totalCost, date: form.date, paid: true, settledAmount: totalCost,
      }, ...prev]);
    }

    const movement = {
      id: movementId, productId: product.id, productName: product.name, type: form.type,
      qty, unitCost, totalCost, supplier: form.supplier, responsible: form.responsible,
      notes: form.notes, financialEntryId, createdAt: form.date,
    };
    applyToProduct(product.id, movementDelta(movement));

    if (modal === "new") setStockMovements(prev => [movement, ...prev]);
    else setStockMovements(prev => prev.map(m => m.id === movementId ? movement : m));

    setModal(null);
  };

  const removeMovement = (m) => {
    reverseMovement(m);
    setStockMovements(prev => prev.filter(x => x.id !== m.id));
  };

  const rows = useMemo(() => {
    let list = stockMovements;
    if (query.trim()) { const q = query.toLowerCase(); list = list.filter(m => m.productName.toLowerCase().includes(q) || (m.supplier || "").toLowerCase().includes(q) || (m.responsible || "").toLowerCase().includes(q)); }
    if (filterType !== "todos") list = list.filter(m => m.type === filterType);
    return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [stockMovements, query, filterType]);

  return (
    <div>
      <div className="lancamentos-filters">
        <div className="search-box" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <Search size={15} /><input placeholder="Buscar produto, fornecedor ou responsável…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
          <option value="ajuste">Ajuste</option>
          <option value="perda">Perda</option>
        </select>
        <PrimaryButton icon={Plus} onClick={openNew}>Nova Movimentação</PrimaryButton>
      </div>

      <Card style={{ overflowX: "auto" }}>
        <table className="co-table">
          <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Qtd.</th><th>Valor Unit.</th><th>Valor Total</th><th>Fornecedor</th><th>Responsável</th><th>Observação</th><th></th></tr></thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt + "T00:00").toLocaleDateString("pt-BR")}</td>
                <td><b>{m.productName}</b></td>
                <td><Badge text={STOCK_TYPE_LABEL[m.type]} color={STOCK_TYPE_COLOR[m.type]} /></td>
                <td>{m.type === "ajuste" ? (m.qty > 0 ? `+${m.qty}` : m.qty) : m.qty}</td>
                <td>{money(m.unitCost)}</td>
                <td>{money(m.totalCost)}</td>
                <td>{m.supplier || "—"}</td>
                <td>{m.responsible || "—"}</td>
                <td className="muted">{m.notes || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    {m.productId && <IconBtn icon={PenIcon} title="Editar" onClick={() => openEdit(m)} />}
                    <IconBtn icon={Trash2} title="Excluir" onClick={() => removeMovement(m)} />
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10}><span className="muted">Nenhuma movimentação registrada ainda.</span></td></tr>}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title={modal === "new" ? "Nova Movimentação" : "Editar Movimentação"} onClose={() => setModal(null)} footer={<PrimaryButton onClick={save}>{modal === "new" ? "Salvar movimentação" : "Salvar alterações"}</PrimaryButton>}>
          <Field label="Tipo">
            <div className="segmented full">
              {["entrada", "saida", "ajuste", "perda"].map(t => (
                <button key={t} className={form.type === t ? "active" : ""} onClick={() => setForm({ ...form, type: t })}>{STOCK_TYPE_LABEL[t]}</button>
              ))}
            </div>
          </Field>
          <Field label="Produto">
            <select value={form.productId} onChange={e => onPickProduct(e.target.value)}>
              <option value="">Selecione…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          {!products.length && <p className="muted" style={{ fontSize: 11.5 }}>Cadastre um produto na aba Produtos primeiro.</p>}
          <div className="form-grid-2">
            <Field label="Quantidade"><input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></Field>
            <Field label="Valor unitário (R$)"><input type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} /></Field>
          </div>
          <div className="form-grid-2">
            <Field label="Data"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Fornecedor"><input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field>
          </div>
          <Field label="Responsável">
            <select value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })}>
              <option value="">Selecione…</option>
              {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Observação"><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          {form.type === "entrada" && <p className="muted" style={{ fontSize: 11.5 }}>Isso vai criar automaticamente uma Saída no Financeiro (categoria "Compra de Estoque") no valor de {money((Number(form.qty) || 0) * (Number(form.unitCost) || 0))}.</p>}
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* CRM                                                                      */
/* ---------------------------------------------------------------------- */
