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

export function CRM({ clients, setClients }) {
  const windows = [15, 30, 60, 90, 180];
  const daysSince = (dateStr) => dateStr ? Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) : 9999;
  const bucketOf = (days) => { for (let i = windows.length - 1; i >= 0; i--) if (days >= windows[i]) return windows[i]; return null; };
  const queue = clients.map(c => ({ ...c, days: daysSince(c.lastVisit), bucket: bucketOf(daysSince(c.lastVisit)) })).filter(c => c.bucket);
  const markContacted = (id) => setClients(prev => prev.map(c => c.id === id ? { ...c, lastVisit: todayISO() } : c));

  return (
    <div className="page">
      <PageHeader title="CRM" subtitle="Clientes prontos para receber um contato de retorno." />
      <div className="crm-windows">
        {windows.map(w => <Card key={w} className="crm-window-card"><span className="muted">{w}+ dias sem visita</span><b>{queue.filter(c => c.bucket === w).length}</b></Card>)}
      </div>
      <Card>
        <div className="card-head"><h3>Fila de contato</h3></div>
        {queue.length ? queue.sort((a, b) => b.days - a.days).map(c => (
          <div key={c.id} className="crm-row">
            <Avatar name={c.name} />
            <div className="client-row-info"><b>{c.name}</b><span className="muted">{c.days} dias sem visitar · {c.phone || "sem telefone"}</span></div>
            <div style={{ display: "flex", gap: 8 }}>
              {c.phone && <GhostButton icon={MessageCircle} onClick={() => window.open(waLink(c.phone, `Olá ${c.name.split(" ")[0]}, faz um tempinho que você não vem aqui! Que tal agendar uma nova lavagem ou revisão do vitrificado? 🚗✨`), "_blank")}>Enviar WhatsApp</GhostButton>}
              <GhostButton icon={Check} onClick={() => markContacted(c.id)}>Marcar contatado</GhostButton>
            </div>
          </div>
        )) : <span className="muted" style={{ fontSize: 12 }}>Nenhum cliente na fila de contato agora.</span>}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SERVIÇOS                                                                 */
/* ---------------------------------------------------------------------- */
export function Servicos({ services, setServices }) {
  const empty = { name: "", time: "", price: "", commission: "", type: "avulso" };
  const [modal, setModal] = useState(null); // null | "new" | service being edited
  const [form, setForm] = useState(empty);
  const openNew = () => { setForm(empty); setModal("new"); };
  const openEdit = (s) => { setForm({ name: s.name, time: s.time, price: s.price, commission: s.commission, type: s.type || "avulso" }); setModal(s); };
  const save = () => {
    if (!form.name) return;
    const clean = { ...form, price: Number(form.price) || 0, commission: Number(form.commission) || 0 };
    if (modal === "new") setServices(prev => [{ id: uid(), ...clean }, ...prev]);
    else setServices(prev => prev.map(s => s.id === modal.id ? { ...s, ...clean } : s));
    setModal(null);
  };
  return (
    <div className="page">
      <PageHeader title="Serviços" subtitle="Catálogo de serviços avulsos e planos de assinatura." action={<PrimaryButton icon={Plus} onClick={openNew}>Novo Serviço</PrimaryButton>} />
      <div className="service-grid">
        {services.map(s => (
          <Card key={s.id} className="service-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="service-icon"><Sparkles size={17} /></div>
              <div style={{ display: "flex", gap: 4 }}>
                <IconBtn icon={PenIcon} title="Editar" onClick={() => openEdit(s)} />
                <IconBtn icon={Trash2} title="Excluir" onClick={() => setServices(prev => prev.filter(x => x.id !== s.id))} />
              </div>
            </div>
            <b>{s.name}</b>
            {s.type === "assinatura" && <Badge text="Assinatura" color={PALETTE.warning} />}
            <div className="service-meta"><span><Clock size={12} /> {s.time || "—"}</span><span>Comissão {s.commission}%</span></div>
            <div className="service-price">{money(s.price)}</div>
          </Card>
        ))}
      </div>
      {modal && (
        <Modal title={modal === "new" ? "Novo Serviço" : "Editar Serviço"} onClose={() => setModal(null)} footer={<PrimaryButton onClick={save}>{modal === "new" ? "Salvar serviço" : "Salvar alterações"}</PrimaryButton>}>
          <Field label="Tipo">
            <div className="segmented full">
              {[{ v: "avulso", l: "Avulso" }, { v: "assinatura", l: "Plano de Assinatura" }].map(o => (
                <button key={o.v} className={form.type === o.v ? "active" : ""} onClick={() => setForm({ ...form, type: o.v })}>{o.l}</button>
              ))}
            </div>
          </Field>
          <Field label="Nome do serviço"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="form-grid-2">
            <Field label="Tempo médio"><input value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="Ex: 1h30" /></Field>
            <Field label="Valor (R$)"><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></Field>
          </div>
          <Field label="Comissão (%)"><input type="number" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* EQUIPE                                                                   */
/* ---------------------------------------------------------------------- */
export function Equipe({ employees, setEmployees, orders }) {
  const empty = { name: "", role: "", commission: "", goal: "" };
  const [modal, setModal] = useState(null); // null | "new" | employee being edited
  const [form, setForm] = useState(empty);
  const monthStart = todayISO().slice(0, 7);
  const servicesDone = (name) => orders.filter(o => (o.techs?.length ? o.techs.includes(name) : o.tech === name) && o.createdAt.slice(0, 7) === monthStart).length;

  const openNew = () => { setForm(empty); setModal("new"); };
  const openEdit = (e) => { setForm({ name: e.name, role: e.role, commission: e.commission, goal: e.goal }); setModal(e); };
  const save = () => {
    if (!form.name) return;
    const clean = { ...form, commission: Number(form.commission) || 0, goal: Number(form.goal) || 1 };
    if (modal === "new") setEmployees(prev => [{ id: uid(), ...clean }, ...prev]);
    else setEmployees(prev => prev.map(e => e.id === modal.id ? { ...e, ...clean } : e));
    setModal(null);
  };

  return (
    <div className="page">
      <PageHeader title="Equipe" subtitle="Produtividade, comissões e metas do time." action={<PrimaryButton icon={Plus} onClick={openNew}>Novo Funcionário</PrimaryButton>} />
      <Card>
        {employees.map(e => {
          const done = servicesDone(e.name);
          const pct = Math.min(100, Math.round((done / (e.goal || 1)) * 100));
          return (
            <div key={e.id} className="employee-row">
              <Avatar name={e.name} size={40} />
              <div className="client-row-info" style={{ minWidth: 180 }}><b>{e.name}</b><span className="muted">{e.role} · Comissão {e.commission}%</span></div>
              <div className="goal-bar"><div className="goal-fill" style={{ width: `${pct}%` }} /></div>
              <span className="muted" style={{ width: 100, textAlign: "right" }}>{done}/{e.goal} serviços</span>
              <IconBtn icon={PenIcon} title="Editar" onClick={() => openEdit(e)} />
              <IconBtn icon={Trash2} title="Excluir" onClick={() => setEmployees(prev => prev.filter(x => x.id !== e.id))} />
            </div>
          );
        })}
      </Card>
      {modal && (
        <Modal title={modal === "new" ? "Novo Funcionário" : "Editar Funcionário"} onClose={() => setModal(null)} footer={<PrimaryButton onClick={save}>{modal === "new" ? "Salvar funcionário" : "Salvar alterações"}</PrimaryButton>}>
          <Field label="Nome"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Cargo"><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></Field>
          <div className="form-grid-2">
            <Field label="Comissão (%)"><input type="number" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} /></Field>
            <Field label="Meta mensal (serviços)"><input type="number" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* RELATÓRIOS                                                              */
/* ---------------------------------------------------------------------- */
const PIE_COLORS = ["#FF6A00", "#FFD60A", "#30D158", "#5AC8FA", "#BF5AF2", "#FF453A"];
