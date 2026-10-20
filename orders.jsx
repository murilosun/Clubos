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

export function OrdensServico({ orders, setOrders, clients, setClients, services, employees, brand }) {
  const [showNew, setShowNew] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);
  const [editingOS, setEditingOS] = useState(false);
  const [eForm, setEForm] = useState({});
  const [dragId, setDragId] = useState(null);
  const [filterDate, setFilterDate] = useState(null); // null = mostrar todas
  const emptyForm = { clientId: "", vehicleId: "", items: [], pickService: "", value: "", discount: 0, techs: [], pickTech: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const selClient = clients.find(c => c.id === form.clientId);
  const itemsTotal = (items) => items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const visibleOrders = filterDate ? orders.filter(o => o.createdAt === filterDate) : orders;
  const dateLabel = (iso) => { const d = new Date(iso + "T00:00"); return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); };

  const addItem = () => {
    const s = services.find(sv => sv.id === form.pickService);
    if (!s) return;
    const items = [...form.items, { serviceId: s.id, name: s.name, price: s.price }];
    setForm({ ...form, items, pickService: "", value: itemsTotal(items) });
  };
  const removeItem = (idx) => {
    const items = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items, value: itemsTotal(items) });
  };
  const addTech = () => {
    if (!form.pickTech || form.techs.includes(form.pickTech)) return;
    setForm({ ...form, techs: [...form.techs, form.pickTech], pickTech: "" });
  };
  const removeTech = (name) => setForm({ ...form, techs: form.techs.filter(t => t !== name) });

  const save = () => {
    const client = clients.find(c => c.id === form.clientId);
    const vehicle = client?.vehicles.find(v => v.id === form.vehicleId);
    if (!client || !form.items.length) return;
    const today = todayISO();
    const newOrder = {
      id: uid(), code: `OS-${1000 + orders.length + Math.floor(Math.random() * 90)}`,
      clientId: client.id, clientName: client.name,
      vehicleLabel: vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : "Sem veículo",
      serviceName: form.items.map(i => i.name).join(" + "), items: form.items,
      value: Number(form.value) || itemsTotal(form.items), discount: Number(form.discount) || 0,
      techs: form.techs, tech: form.techs[0] || "", notes: form.notes, status: "Recebido", createdAt: today,
    };
    setOrders(prev => [newOrder, ...prev]);
    // atualiza a última visita do cliente automaticamente
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, lastVisit: today } : c));
    setShowNew(false);
    setForm(emptyForm);
  };

  const advanceStatus = (order, dir = 1) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[Math.min(STATUS_FLOW.length - 1, Math.max(0, idx + dir))];
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    setOpenOrder(prev => prev && prev.id === order.id ? { ...prev, status: next } : prev);
  };
  const dropOnColumn = (status) => {
    if (!dragId) return;
    setOrders(prev => prev.map(o => o.id === dragId ? { ...o, status } : o));
    setDragId(null);
  };

  const startEditOS = (order) => {
    setEForm({ serviceName: order.serviceName, vehicleLabel: order.vehicleLabel, value: order.value, discount: order.discount, techs: order.techs?.length ? order.techs : (order.tech ? [order.tech] : []), pickTech: "", notes: order.notes || "" });
    setEditingOS(true);
  };
  const saveEditOS = (order) => {
    const updated = { ...order, ...eForm, tech: eForm.techs[0] || "", value: Number(eForm.value) || 0, discount: Number(eForm.discount) || 0 };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    setOpenOrder(updated);
    setEditingOS(false);
  };

  return (
    <div className="page">
      <PageHeader title="Ordens de Serviço" subtitle="Arraste o card entre as colunas para mudar o status." action={<PrimaryButton icon={Plus} onClick={() => setShowNew(true)}>Nova OS</PrimaryButton>} />

      <div className="agenda-toolbar">
        <div className="agenda-nav">
          <IconBtn icon={ChevronLeft} title="Dia anterior" onClick={() => setFilterDate(addDays(filterDate || todayISO(), -1))} />
          <button className="agenda-label" onClick={() => setFilterDate(todayISO())}>{filterDate ? `Dia ${dateLabel(filterDate)}` : "Todas as datas"}</button>
          <IconBtn icon={ChevronRight} title="Próximo dia" onClick={() => setFilterDate(addDays(filterDate || todayISO(), 1))} />
        </div>
        {filterDate && <GhostButton onClick={() => setFilterDate(null)}>Ver todas</GhostButton>}
      </div>

      <div className="kanban">
        {STATUS_FLOW.map(status => (
          <div key={status} className="kanban-col" onDragOver={(e) => e.preventDefault()} onDrop={() => dropOnColumn(status)}>
            <div className="kanban-col-head"><Badge text={status} color={STATUS_COLOR[status] || "#9A9AA0"} /><span className="muted">{visibleOrders.filter(o => o.status === status).length}</span></div>
            {visibleOrders.filter(o => o.status === status).map(o => (
              <div key={o.id} className="kanban-card" draggable onDragStart={() => setDragId(o.id)} onClick={() => { setOpenOrder(o); setEditingOS(false); }}>
                <div className="kanban-card-top"><span className="muted">{o.code || o.id}</span></div>
                <b>{o.clientName}</b><span className="muted">{o.vehicleLabel}</span>
                <div className="kanban-card-foot"><span>{o.serviceName}</span><b>{money(o.value)}</b></div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {openOrder && (() => {
        const order = orders.find(o => o.id === openOrder.id) || openOrder;
        const client = clients.find(c => c.id === order.clientId);
        return (
          <Modal title={order.code || order.id} onClose={() => { setOpenOrder(null); setEditingOS(false); }} width={560}>
            {editingOS ? (
              <div className="os-detail">
                <Field label="Serviço"><input value={eForm.serviceName} onChange={e => setEForm({ ...eForm, serviceName: e.target.value })} /></Field>
                <Field label="Veículo"><input value={eForm.vehicleLabel} onChange={e => setEForm({ ...eForm, vehicleLabel: e.target.value })} /></Field>
                <div className="form-grid-2">
                  <Field label="Valor (R$)"><input type="number" value={eForm.value} onChange={e => setEForm({ ...eForm, value: e.target.value })} /></Field>
                  <Field label="Desconto (%)"><input type="number" value={eForm.discount} onChange={e => setEForm({ ...eForm, discount: e.target.value })} /></Field>
                </div>
                <Field label="Funcionários responsáveis">
                  <div style={{ display: "flex", gap: 8 }}>
                    <select style={{ flex: 1 }} value={eForm.pickTech} onChange={e => setEForm({ ...eForm, pickTech: e.target.value })}>
                      <option value="">Selecione…</option>
                      {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                    </select>
                    <GhostButton icon={Plus} onClick={() => { if (eForm.pickTech && !eForm.techs.includes(eForm.pickTech)) setEForm({ ...eForm, techs: [...eForm.techs, eForm.pickTech], pickTech: "" }); }}>Adicionar</GhostButton>
                  </div>
                </Field>
                {eForm.techs?.length > 0 && (
                  <div className="items-list">
                    {eForm.techs.map(name => (
                      <div key={name} className="items-row"><span>{name}</span><IconBtn icon={X} title="Remover" onClick={() => setEForm({ ...eForm, techs: eForm.techs.filter(t => t !== name) })} /></div>
                    ))}
                  </div>
                )}
                <Field label="Observações"><textarea rows={2} value={eForm.notes} onChange={e => setEForm({ ...eForm, notes: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <PrimaryButton onClick={() => saveEditOS(order)}>Salvar alterações</PrimaryButton>
                  <GhostButton onClick={() => setEditingOS(false)}>Cancelar</GhostButton>
                </div>
              </div>
            ) : (
              <div className="os-detail">
                <div className="detail-item"><Users size={14} /><span>{order.clientName}</span></div>
                <div className="detail-item"><Car size={14} /><span>{order.vehicleLabel}</span></div>
                <div className="detail-item"><Wrench size={14} /><span>{order.serviceName}</span></div>
                <div className="detail-item"><UserCog size={14} /><span>Responsáveis: {(order.techs?.length ? order.techs : (order.tech ? [order.tech] : [])).join(", ") || "—"}</span></div>
                <div className="detail-item"><DollarSign size={14} /><span>Valor: <b>{money(order.value)}</b>{order.discount ? ` (desconto ${order.discount}%)` : ""}</span></div>

                <div className="status-track">
                  {STATUS_FLOW.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={`status-node ${STATUS_FLOW.indexOf(order.status) >= i ? "done" : ""}`}>{STATUS_FLOW.indexOf(order.status) > i ? <Check size={11} /> : i + 1}</div>
                      {i < STATUS_FLOW.length - 1 && <div className={`status-line ${STATUS_FLOW.indexOf(order.status) > i ? "done" : ""}`} />}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <GhostButton icon={ChevronLeft} onClick={() => advanceStatus(order, -1)}>Voltar etapa</GhostButton>
                  <GhostButton icon={ArrowRight} onClick={() => advanceStatus(order, 1)}>Avançar etapa</GhostButton>
                  <GhostButton icon={PenIcon} onClick={() => startEditOS(order)}>Editar OS</GhostButton>
                  {client?.phone && order.status === "Entregue" && (
                    <GhostButton icon={MessageCircle} onClick={() => window.open(waLink(client.phone, `Olá ${client.name.split(" ")[0]}, seu veículo está pronto para retirada! 🚗✨`), "_blank")}>Avisar veículo pronto</GhostButton>
                  )}
                  <GhostButton icon={Trash2} danger onClick={() => { setOrders(prev => prev.filter(o => o.id !== order.id)); setOpenOrder(null); }}>Excluir OS</GhostButton>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <GhostButton icon={Receipt} onClick={() => openPrintWindow(buildReceiptHTML(order, client, brand))}>Imprimir Notinha</GhostButton>
                  <GhostButton icon={FileText} onClick={() => openPrintWindow(buildA4HTML(order, client, brand))}>Imprimir Folha A4</GhostButton>
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {showNew && (
        <Modal title="Nova Ordem de Serviço" onClose={() => setShowNew(false)} width={520} footer={<PrimaryButton onClick={save}>Criar OS</PrimaryButton>}>
          <Field label="Cliente">
            <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value, vehicleId: "" })}>
              <option value="">Selecione…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {selClient && (
            <Field label="Veículo">
              <select value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Selecione…</option>
                {selClient.vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.plate}</option>)}
              </select>
            </Field>
          )}
          <Field label="Serviços">
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ flex: 1 }} value={form.pickService} onChange={e => setForm({ ...form, pickService: e.target.value })}>
                <option value="">Selecione um serviço…</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — {money(s.price)}{s.type === "assinatura" ? " (assinatura)" : ""}</option>)}
              </select>
              <GhostButton icon={Plus} onClick={addItem}>Adicionar</GhostButton>
            </div>
          </Field>
          {form.items.length > 0 && (
            <div className="items-list">
              {form.items.map((it, idx) => (
                <div key={idx} className="items-row">
                  <span>{it.name}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}><b>{money(it.price)}</b><IconBtn icon={X} title="Remover" onClick={() => removeItem(idx)} /></span>
                </div>
              ))}
            </div>
          )}
          <div className="form-grid-2">
            <Field label="Valor total (R$)"><input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></Field>
            <Field label="Desconto (%)"><input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} /></Field>
          </div>
          <Field label="Funcionários responsáveis">
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ flex: 1 }} value={form.pickTech} onChange={e => setForm({ ...form, pickTech: e.target.value })}>
                <option value="">Selecione…</option>
                {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
              <GhostButton icon={Plus} onClick={addTech}>Adicionar</GhostButton>
            </div>
          </Field>
          {form.techs.length > 0 && (
            <div className="items-list">
              {form.techs.map(name => (
                <div key={name} className="items-row"><span>{name}</span><IconBtn icon={X} title="Remover" onClick={() => removeTech(name)} /></div>
              ))}
            </div>
          )}
          <Field label="Observações"><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* FINANCEIRO                                                              */
/* ---------------------------------------------------------------------- */
