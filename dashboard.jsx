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

export function Dashboard({ orders, appointments, financial, clients, user, setPage }) {
  const today = todayISO();

  const now = new Date();
  const weekAgoIso = new Date(now); weekAgoIso.setDate(now.getDate() - 6);
  const weekAgo = weekAgoIso.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7);

  const revenueToday = realizedRevenue(orders, financial, (d) => d === today);
  const revenueWeek = realizedRevenue(orders, financial, (d) => d >= weekAgo);
  const revenueMonth = realizedRevenue(orders, financial, (d) => d.slice(0, 7) === monthStart);
  const ordersMonth = orders.filter(o => o.createdAt.slice(0, 7) === monthStart);
  const ticketMedio = ordersMonth.length ? revenueMonth / ordersMonth.length : 0;
  const saidasMonth = realizedExpenses(financial, (d) => d.slice(0, 7) === monthStart);
  const lucro = revenueMonth - saidasMonth;
  const carrosHoje = orders.filter(o => o.createdAt === today).length;

  const weekChart = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const value = realizedRevenue(orders, financial, (od) => od === iso);
      days.push({ day: label.charAt(0).toUpperCase() + label.slice(1), value });
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, financial]);

  const topServices = useMemo(() => {
    const map = {};
    orders.forEach(o => { map[o.serviceName] = (map[o.serviceName] || 0) + (Number(o.value) || 0) * (1 - (Number(o.discount) || 0) / 100); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [orders]);

  const nextAppts = appointments.filter(a => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const entradasHoje = revenueToday;
  const saidasHoje = realizedExpenses(financial, (d) => d === today);

  return (
    <div className="page">
      <PageHeader title={`Bom dia, ${user?.name || ""} 👋`} subtitle="Aqui está o resumo real da sua unidade, atualizado agora." action={<PrimaryButton icon={Plus} onClick={() => setPage("os")}>Nova Ordem de Serviço</PrimaryButton>} />
      <div className="kpi-grid">
        <KPI label="Faturamento do dia" value={money(revenueToday)} icon={DollarSign} />
        <KPI label="Faturamento da semana" value={money(revenueWeek)} icon={TrendingUp} />
        <KPI label="Faturamento do mês" value={money(revenueMonth)} icon={BarChart3} />
        <KPI label="Ticket médio" value={money(ticketMedio)} icon={Star} />
        <KPI label="Lucro do mês" value={money(lucro)} icon={Wallet} positive={lucro >= 0} />
        <KPI label="Carros atendidos hoje" value={String(carrosHoje)} icon={Car} />
      </div>
      <div className="dash-row">
        <Card className="chart-card">
          <div className="card-head"><h3>Crescimento da semana</h3><span className="muted">Faturamento diário</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weekChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#9A9AA0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#202022", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "#fff" }} formatter={(v) => [money(v), "Faturamento"]} />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="side-card">
          <div className="card-head"><h3>Caixa do dia</h3></div>
          <div className="cash-row"><span>Entradas</span><b className="pos">{money(entradasHoje)}</b></div>
          <div className="cash-row"><span>Saídas</span><b className="neg">{money(-saidasHoje)}</b></div>
          <div className="cash-divider" />
          <div className="cash-row total"><span>Saldo</span><b>{money(entradasHoje - saidasHoje)}</b></div>
          <div className="card-head" style={{ marginTop: 18 }}><h3>Serviços mais vendidos</h3></div>
          {topServices.length ? topServices.map(([name, val]) => <div key={name} className="mini-row"><span>{name}</span><b>{money(val)}</b></div>) : <span className="muted" style={{ fontSize: 12 }}>Sem vendas registradas ainda.</span>}
        </Card>
      </div>
      <Card>
        <div className="card-head"><h3>Próximos agendamentos</h3><span className="muted">Hoje</span></div>
        <div className="appt-list">
          {nextAppts.length ? nextAppts.map(a => (
            <div key={a.id} className="appt-item">
              <span className="appt-time">{a.time}</span><Avatar name={a.clientName} size={30} />
              <div className="appt-info"><b>{a.clientName}</b><span className="muted">{a.service}</span></div>
              <Badge text={a.status} color={STATUS_COLOR[a.status] || "#9A9AA0"} />
            </div>
          )) : <span className="muted" style={{ fontSize: 12 }}>Nenhum agendamento para hoje.</span>}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* AGENDA — dia / semana (grade real, tipo calendário de celular) / mês     */
/* ---------------------------------------------------------------------- */
const CAL_HOUR_START = 7, CAL_HOUR_END = 20, CAL_ROW_H = 52;
