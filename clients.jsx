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

export function Clientes({ clients, setClients, orders }) {
  const [selectedId, setSelectedId] = useState(clients[0]?.id || null);
  const [query, setQuery] = useState("");
  const [clientModal, setClientModal] = useState(null);
  const [vehicleModal, setVehicleModal] = useState(null);
  const emptyClient = { name: "", doc: "", phone: "", whats: true, address: "", notes: "" };
  const emptyVehicle = { brand: "", model: "", year: "", color: "", plate: "", km: "", notes: "" };
  const [cForm, setCForm] = useState(emptyClient);
  const [vForm, setVForm] = useState(emptyVehicle);

  const selected = clients.find(c => c.id === selectedId) || clients[0];
  const filtered = clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  const totalSpent = (client) => orders.filter(o => o.clientId === client.id).reduce((s, o) => s + (Number(o.value) || 0) * (1 - (Number(o.discount) || 0) / 100), 0);

  const openNewClient = () => { setCForm(emptyClient); setClientModal("new"); };
  const openEditClient = (c) => { setCForm({ name: c.name, doc: c.doc, phone: c.phone, whats: c.whats, address: c.address, notes: c.notes || "" }); setClientModal(c); };
  const saveClient = () => {
    if (!cForm.name) return;
    if (clientModal === "new") {
      const nc = { id: uid(), ...cForm, lastVisit: todayISO(), vehicles: [] };
      setClients(prev => [nc, ...prev]);
      setSelectedId(nc.id);
    } else {
      setClients(prev => prev.map(c => c.id === clientModal.id ? { ...c, ...cForm } : c));
    }
    setClientModal(null);
  };

  const openNewVehicle = () => { setVForm(emptyVehicle); setVehicleModal("new"); };
  const openEditVehicle = (v) => { setVForm({ brand: v.brand, model: v.model, year: v.year, color: v.color, plate: v.plate, km: v.km, notes: v.notes || "" }); setVehicleModal(v); };
  const saveVehicle = () => {
    if (!vForm.brand || !vForm.plate) return;
    const clean = { ...vForm, year: Number(vForm.year) || "", km: Number(vForm.km) || 0 };
    if (vehicleModal === "new") {
      setClients(prev => prev.map(c => c.id === selected.id ? { ...c, vehicles: [...c.vehicles, { id: uid(), ...clean }] } : c));
    } else {
      setClients(prev => prev.map(c => c.id === selected.id ? { ...c, vehicles: c.vehicles.map(v => v.id === vehicleModal.id ? { ...v, ...clean } : v) } : c));
    }
    setVehicleModal(null);
  };
  const deleteVehicle = (vid) => setClients(prev => prev.map(c => c.id === selected.id ? { ...c, vehicles: c.vehicles.filter(v => v.id !== vid) } : c));

  if (!selected) return (
    <div className="page">
      <PageHeader title="Clientes" subtitle="Nenhum cliente cadastrado ainda." action={<PrimaryButton icon={Plus} onClick={openNewClient}>Novo Cliente</PrimaryButton>} />
      {clientModal && <ClientForm cForm={cForm} setCForm={setCForm} onClose={() => setClientModal(null)} onSave={saveClient} isEdit={clientModal !== "new"} />}
    </div>
  );

  return (
    <div className="page">
      <PageHeader title="Clientes" subtitle={`${clients.length} clientes cadastrados`} action={<PrimaryButton icon={Plus} onClick={openNewClient}>Novo Cliente</PrimaryButton>} />
      <div className="split">
        <Card className="list-col">
          <div className="search-box"><Search size={15} /><input placeholder="Buscar cliente…" value={query} onChange={e => setQuery(e.target.value)} /></div>
          {filtered.map(c => (
            <button key={c.id} className={`client-row ${selected.id === c.id ? "active" : ""}`} onClick={() => setSelectedId(c.id)}>
              <Avatar name={c.name} />
              <div className="client-row-info"><b>{c.name}</b><span className="muted">{c.vehicles[0] ? `${c.vehicles[0].brand} ${c.vehicles[0].model} · ${c.vehicles[0].plate}` : "Sem veículo"}</span></div>
              <ChevronRight size={15} className="muted" />
            </button>
          ))}
        </Card>
        <Card className="detail-col">
          <div className="detail-head">
            <Avatar name={selected.name} size={54} />
            <div><h2>{selected.name}</h2><span className="muted">{selected.doc || "Sem documento"}</span></div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selected.phone && <GhostButton icon={MessageCircle} onClick={() => window.open(waLink(selected.phone, `Olá ${selected.name.split(" ")[0]}, tudo bem? Aqui é da equipe.`), "_blank")}>WhatsApp</GhostButton>}
              <GhostButton icon={PenIcon} onClick={() => openEditClient(selected)}>Editar</GhostButton>
              <GhostButton icon={Trash2} danger onClick={() => { setClients(prev => prev.filter(c => c.id !== selected.id)); setSelectedId(null); }}>Excluir</GhostButton>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><Phone size={14} /><span>{selected.phone || "—"}</span></div>
            <div className="detail-item"><MapPin size={14} /><span>{selected.address || "—"}</span></div>
            <div className="detail-item"><DollarSign size={14} /><span>Total gasto: <b>{money(totalSpent(selected))}</b></span></div>
            <div className="detail-item"><Clock size={14} /><span>Última visita: {selected.lastVisit ? new Date(selected.lastVisit).toLocaleDateString("pt-BR") : "—"}</span></div>
          </div>
          <div className="card-head" style={{ marginTop: 6 }}><h3>Veículos</h3><GhostButton icon={Plus} onClick={openNewVehicle}>Adicionar</GhostButton></div>
          {selected.vehicles.length ? selected.vehicles.map(v => (
            <div key={v.id} className="vehicle-card">
              <div className="vehicle-icon"><Car size={18} /></div>
              <div className="vehicle-info"><b>{v.brand} {v.model} · {v.year}</b><span className="muted">{v.color} · Placa {v.plate} · {(v.km || 0).toLocaleString("pt-BR")} km</span></div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <IconBtn icon={PenIcon} title="Editar veículo" onClick={() => openEditVehicle(v)} />
                <IconBtn icon={Trash2} title="Excluir veículo" onClick={() => deleteVehicle(v.id)} />
              </div>
            </div>
          )) : <span className="muted" style={{ fontSize: 12 }}>Nenhum veículo cadastrado.</span>}
          <div className="card-head" style={{ marginTop: 18 }}><h3>Histórico de serviços</h3></div>
          {orders.filter(o => o.clientId === selected.id).length ? orders.filter(o => o.clientId === selected.id).map(o => (
            <div key={o.id} className="mini-row"><span>{o.serviceName}</span><b>{money(o.value)}</b></div>
          )) : <span className="muted" style={{ fontSize: 12 }}>Nenhuma OS registrada ainda.</span>}
        </Card>
      </div>
      {clientModal && <ClientForm cForm={cForm} setCForm={setCForm} onClose={() => setClientModal(null)} onSave={saveClient} isEdit={clientModal !== "new"} />}
      {vehicleModal && (
        <Modal title={vehicleModal === "new" ? `Novo veículo — ${selected.name}` : `Editar veículo — ${selected.name}`} onClose={() => setVehicleModal(null)} footer={<PrimaryButton onClick={saveVehicle}>Salvar veículo</PrimaryButton>}>
          <div className="form-grid-2">
            <Field label="Marca"><input value={vForm.brand} onChange={e => setVForm({ ...vForm, brand: e.target.value })} /></Field>
            <Field label="Modelo"><input value={vForm.model} onChange={e => setVForm({ ...vForm, model: e.target.value })} /></Field>
            <Field label="Ano"><input type="number" value={vForm.year} onChange={e => setVForm({ ...vForm, year: e.target.value })} /></Field>
            <Field label="Cor"><input value={vForm.color} onChange={e => setVForm({ ...vForm, color: e.target.value })} /></Field>
            <Field label="Placa"><input value={vForm.plate} onChange={e => setVForm({ ...vForm, plate: e.target.value.toUpperCase() })} /></Field>
            <Field label="Quilometragem"><input type="number" value={vForm.km} onChange={e => setVForm({ ...vForm, km: e.target.value })} /></Field>
          </div>
          <Field label="Observações"><textarea rows={2} value={vForm.notes} onChange={e => setVForm({ ...vForm, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

export function ClientForm({ cForm, setCForm, onClose, onSave, isEdit }) {
  return (
    <Modal title={isEdit ? "Editar Cliente" : "Novo Cliente"} onClose={onClose} footer={<PrimaryButton onClick={onSave}>{isEdit ? "Salvar alterações" : "Salvar cliente"}</PrimaryButton>}>
      <Field label="Nome completo"><input value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })} /></Field>
      <div className="form-grid-2">
        <Field label="CPF/CNPJ"><input value={cForm.doc} onChange={e => setCForm({ ...cForm, doc: e.target.value })} /></Field>
        <Field label="Telefone / WhatsApp"><input value={cForm.phone} onChange={e => setCForm({ ...cForm, phone: e.target.value })} placeholder="11999998888" /></Field>
      </div>
      <Field label="Endereço"><input value={cForm.address} onChange={e => setCForm({ ...cForm, address: e.target.value })} /></Field>
      <Field label="Observações"><textarea rows={2} value={cForm.notes} onChange={e => setCForm({ ...cForm, notes: e.target.value })} /></Field>
    </Modal>
  );
}

/* ---------------------------------------------------------------------- */
/* ORDENS DE SERVIÇO                                                        */
/* ---------------------------------------------------------------------- */
