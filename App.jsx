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

import { supabase, COMPANY_ID } from "./supabaseClient";
import { useAuth } from "./lib/auth";
import { useSupabaseCollection, useClientsWithVehicles, ordersMap, appointmentsMap, servicesMap, productsMap, employeesMap, financialMap, stockMovementsMap } from "./lib/dataHooks";

import { DEFAULT_BRAND, PALETTE, STATUS_FLOW, APPT_STATUS, STATUS_COLOR, todayISO, money, uid, waLink, parseDurationMin, addMinutesToTime, addDays, addMonths, startOfWeek, weekdayLabels, monthLabels, KIND_OPTIONS_BY_TYPE, entryRealizedAmount, entryStatus, ENTRY_STATUS_LABEL, ENTRY_STATUS_COLOR, realizedRevenue, realizedExpenses, openPrintWindow, buildReceiptHTML, buildA4HTML } from "./lib/utils";
import { Card, Badge, KPI, Avatar, PrimaryButton, GhostButton, IconBtn, Field, Modal, PageHeader, Toast } from "./components/ui";

import { Dashboard } from "./screens/dashboard";
import { Agenda } from "./screens/agenda";
import { Clientes } from "./screens/clients";
import { OrdensServico } from "./screens/orders";
import { Financeiro } from "./screens/finance";
import { Estoque } from "./screens/inventory";
import { CRM, Servicos, Equipe } from "./screens/operations";
import { Relatorios, Configuracoes, Login } from "./screens/reports";

const NAV = [
  { key: "dashboard", label: "Início", icon: LayoutGrid },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "os", label: "Ordens de Serviço", icon: ClipboardList },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "estoque", label: "Estoque", icon: Package },
  { key: "crm", label: "CRM", icon: MessageCircle },
  { key: "servicos", label: "Serviços", icon: Wrench },
  { key: "equipe", label: "Equipe", icon: UserCog },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
  { key: "config", label: "Configurações", icon: Settings },
];

export default function ClubOSApp() {
  const auth = useAuth();
  const [brand, setBrandState] = useState(DEFAULT_BRAND);

  useEffect(() => {
    supabase.from("companies").select("*").eq("id", COMPANY_ID).single().then(({ data }) => {
      if (data) setBrandState({ name: data.name, suffix: data.suffix, mark: data.mark, accent: data.accent });
    });
  }, [auth.session]);

  const [clients, setClients, clientsReady] = useClientsWithVehicles();
  const [orders, setOrders, ordersReady] = useSupabaseCollection("orders", ordersMap.toJs, ordersMap.toDb, "created_at");
  const [appointments, setAppointments, apptsReady] = useSupabaseCollection("appointments", appointmentsMap.toJs, appointmentsMap.toDb, "date");
  const [services, setServices, servicesReady] = useSupabaseCollection("services", servicesMap.toJs, servicesMap.toDb);
  const [products, setProducts, productsReady] = useSupabaseCollection("products", productsMap.toJs, productsMap.toDb);
  const [employees, setEmployees, employeesReady] = useSupabaseCollection("employees", employeesMap.toJs, employeesMap.toDb);
  const [financial, setFinancial, financialReady] = useSupabaseCollection("financial_entries", financialMap.toJs, financialMap.toDb, "date");
  const [stockMovements, setStockMovements, stockMovementsReady] = useSupabaseCollection("stock_movements", stockMovementsMap.toJs, stockMovementsMap.toDb, "created_at");

  const allReady = !auth.loading && auth.session && auth.profile && clientsReady && ordersReady && apptsReady && servicesReady && productsReady && employeesReady && financialReady && stockMovementsReady;
  const authedUser = auth.profile;

  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = useMemo(() => {
    const today = todayISO();
    const list = [];
    products.filter(p => p.qty <= p.min).forEach(p => list.push({ id: `stock-${p.id}`, icon: AlertTriangle, color: PALETTE.danger, text: `Estoque baixo: ${p.name} (${p.qty} un.)`, page: "estoque" }));
    financial.filter(f => f.kind === "a_pagar" && entryStatus(f) !== "pago" && f.date <= today).forEach(f => list.push({ id: `pay-${f.id}`, icon: Wallet, color: PALETTE.danger, text: `Conta a pagar: ${f.desc} — ${money(f.value)}`, page: "financeiro" }));
    appointments.filter(a => a.date === today && !["Finalizado", "Cancelado"].includes(a.status)).forEach(a => list.push({ id: `appt-${a.id}`, icon: Calendar, color: PALETTE.warning, text: `Hoje ${a.time} — ${a.clientName} (${a.service})`, page: "agenda" }));
    clients.forEach(c => {
      const days = c.lastVisit ? Math.floor((Date.now() - new Date(c.lastVisit).getTime()) / 86400000) : 9999;
      if (days >= 90) list.push({ id: `crm-${c.id}`, icon: MessageCircle, color: PALETTE.warning, text: `${c.name} sem visitar há ${days} dias`, page: "crm" });
    });
    return list.slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, financial, appointments, clients]);

  const visibleNav = authedUser?.role === "Administrador" ? NAV : NAV.filter(n => ["dashboard", "agenda", "clientes", "os", "servicos"].includes(n.key));

  const PAGES = {
    dashboard: <Dashboard orders={orders} appointments={appointments} financial={financial} clients={clients} user={authedUser} setPage={setPage} />,
    agenda: <Agenda appointments={appointments} setAppointments={setAppointments} clients={clients} services={services} employees={employees} />,
    clientes: <Clientes clients={clients} setClients={setClients} orders={orders} />,
    os: <OrdensServico orders={orders} setOrders={setOrders} clients={clients} setClients={setClients} services={services} employees={employees} brand={brand} />,
    financeiro: <Financeiro financial={financial} setFinancial={setFinancial} orders={orders} stockMovements={stockMovements} setStockMovements={setStockMovements} />,
    estoque: <Estoque products={products} setProducts={setProducts} stockMovements={stockMovements} setStockMovements={setStockMovements} financial={financial} setFinancial={setFinancial} employees={employees} />,
    crm: <CRM clients={clients} setClients={setClients} />,
    servicos: <Servicos services={services} setServices={setServices} />,
    equipe: <Equipe employees={employees} setEmployees={setEmployees} orders={orders} />,
    relatorios: <Relatorios orders={orders} clients={clients} products={products} financial={financial} />,
    config: <Configuracoes brand={brand} currentUser={authedUser} onSignOut={auth.signOut} />,
  };

  return (
    <div className="co-root">
      <style>{`
        .co-root, .co-root * { box-sizing: border-box; }
        .co-root {
          --bg:${PALETTE.bg}; --surface:${PALETTE.surface}; --surface-alt:${PALETTE.surfaceAlt};
          --border:${PALETTE.border}; --accent:${brand.accent}; --accent-soft:${brand.accent}24;
          --white:${PALETTE.white}; --dim:${PALETTE.textDim};
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
          background: var(--bg); color: var(--white);
          width: 100vw; min-height: 100vh; overflow-x: hidden;
          display: flex; position: relative; -webkit-font-smoothing: antialiased;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .splash { width:100%; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color: var(--dim); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-screen { width:100%; min-height:100vh; display:flex; align-items:center; justify-content:center; background: radial-gradient(circle at 50% 0%, #1c1c1e 0%, #111111 70%); }
        .login-card { width: 340px; background: var(--surface); border:1px solid var(--border); border-radius:20px; padding: 36px 30px; display:flex; flex-direction:column; align-items:center; text-align:center; }
        .logo-mark { width:52px; height:52px; border-radius:14px; background: var(--accent); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:22px; margin-bottom:14px; box-shadow: 0 8px 24px var(--accent-soft); }
        .login-card h1 { font-size:22px; font-weight:800; margin:0; letter-spacing:-0.5px; }
        .login-field { width:100%; text-align:left; margin-top:16px; }
        .login-field label { font-size:12px; color:var(--dim); display:block; margin-bottom:6px; }
        .login-field input { width:100%; background:var(--surface-alt); border:1px solid var(--border); border-radius:10px; padding:10px 12px; color:var(--white); font-size:13.5px; outline:none; }
        .login-field input:focus { border-color: var(--accent); }

        .sidebar { width: ${collapsed ? "72px" : "232px"}; transition: width .25s ease; background: var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; padding: 18px 12px; flex-shrink:0; }
        .sidebar-brand { display:flex; align-items:center; gap:10px; padding: 4px 8px 20px; }
        .sidebar-brand .logo-mark { width:32px; height:32px; font-size:15px; border-radius:9px; margin:0; flex-shrink:0; }
        .sidebar-brand-text { display:flex; flex-direction:column; line-height:1.1; overflow:hidden; white-space:nowrap; }
        .sidebar-brand-text b { font-size:14.5px; font-weight:800; letter-spacing:-0.3px; }
        .sidebar-brand-text span { font-size:10px; color:var(--dim); }
        .nav-item { display:flex; align-items:center; gap:12px; padding:9px 10px; border-radius:10px; color:var(--dim); background:none; border:none; cursor:pointer; font-size:13.5px; font-weight:500; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-align:left; }
        .nav-item svg { flex-shrink:0; }
        .nav-item:hover { background: var(--surface-alt); color: var(--white); }
        .nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight:600; }
        .sidebar-foot { margin-top:auto; display:flex; flex-direction:column; gap:2px; }

        .main { flex:1; display:flex; flex-direction:column; min-width:0; background: var(--bg); }
        .topbar { height:60px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding: 0 22px; flex-shrink:0; }
        .topbar-search { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:7px 12px; width:260px; color:var(--dim); }
        .topbar-search input { background:none; border:none; outline:none; color:var(--white); font-size:13px; width:100%; }
        .topbar-actions { display:flex; align-items:center; gap:14px; }
        .dropdown-wrap { position: relative; }
        .dropdown-veil { position: fixed; inset: 0; z-index: 60; }
        .co-dropdown { position:absolute; top:42px; right:0; width:300px; max-width: calc(100vw - 28px); max-height:360px; overflow-y:auto; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:8px; z-index:81; box-shadow:0 16px 40px rgba(0,0,0,.5); }
        .co-dropdown-head { font-size:11px; font-weight:700; color:var(--dim); text-transform:uppercase; letter-spacing:.03em; padding:8px 10px 6px; }
        .co-dropdown-item { display:flex; align-items:center; gap:9px; width:100%; text-align:left; background:none; border:none; color:var(--white); font-size:12.5px; padding:9px 10px; border-radius:9px; cursor:pointer; }
        .co-dropdown-item:hover { background:var(--surface-alt); }
        .co-dropdown-empty { padding:14px 10px; font-size:12px; color:var(--dim); }
        .co-dropdown-profile { display:flex; align-items:center; gap:10px; padding:6px 4px 10px; }
        .notif-dot { position:absolute; top:-4px; right:-4px; background:var(--accent); color:#fff; font-size:9px; font-weight:800; min-width:15px; height:15px; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 3px; }
        .avatar-btn { background:none; border:none; padding:0; cursor:pointer; border-radius:50%; }
        .content-scroll { flex:1; overflow-y:auto; padding: 24px 28px 40px; }

        .co-card { background: var(--surface); border:1px solid var(--border); border-radius:16px; padding:18px; }
        .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:22px; gap:14px; flex-wrap:wrap; }
        .page-header h1 { font-size:22px; font-weight:800; letter-spacing:-0.5px; margin:0 0 4px; }
        .page-header p { margin:0; color:var(--dim); font-size:13px; }
        .muted { color: var(--dim); }
        .card-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .card-head h3 { font-size:14.5px; font-weight:700; margin:0; }

        .co-btn-primary { background:var(--accent); color:#fff; border:none; border-radius:11px; padding:10px 16px; font-size:13.5px; font-weight:600; display:flex; align-items:center; gap:7px; cursor:pointer; box-shadow: 0 6px 18px var(--accent-soft); transition: transform .15s ease, filter .15s ease; }
        .co-btn-primary:hover { filter:brightness(1.08); transform: translateY(-1px); }
        .co-btn-ghost { background:var(--surface-alt); color:var(--white); border:1px solid var(--border); border-radius:10px; padding:8px 13px; font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; }
        .co-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
        .co-icon-btn { width:30px; height:30px; border-radius:9px; background:var(--surface-alt); border:1px solid var(--border); color:var(--white); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
        .co-icon-btn:hover { border-color:var(--accent); color:var(--accent); }

        .co-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:4px 9px; border-radius:20px; border:1px solid; white-space:nowrap; }
        .co-dot { width:6px; height:6px; border-radius:50%; }
        .co-avatar { border-radius:50%; background: var(--surface-alt); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--accent); flex-shrink:0; }
        .co-toast { position:fixed; top:18px; right:18px; background:var(--accent); color:#fff; padding:9px 16px; border-radius:10px; font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:8px; z-index:80; box-shadow:0 8px 20px rgba(0,0,0,.4); }

        .field { display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--dim); margin-bottom:12px; }
        .field input, .field select, .field textarea { background:var(--surface-alt); border:1px solid var(--border); border-radius:10px; padding:9px 11px; color:var(--white); font-size:13px; outline:none; font-family:inherit; }
        .field input:focus, .field select:focus, .field textarea:focus { border-color:var(--accent); }
        .form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .items-list { background:var(--surface-alt); border:1px solid var(--border); border-radius:10px; padding:4px 10px; margin-bottom:12px; }
        .items-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; font-size:12.5px; border-bottom:1px solid var(--border); }
        .items-row:last-child { border-bottom:none; }

        .kpi-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-bottom:18px; }
        .kpi-grid.four { grid-template-columns: repeat(4, 1fr); }
        .kpi-top { display:flex; align-items:center; justify-content:space-between; }
        .kpi-label { font-size:12px; color:var(--dim); font-weight:500; }
        .kpi-icon { width:26px; height:26px; border-radius:8px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; }
        .kpi-value { font-size:23px; font-weight:800; margin-top:10px; letter-spacing:-0.5px; }
        .kpi-delta { font-size:11.5px; font-weight:600; display:flex; align-items:center; gap:4px; margin-top:6px; }
        .kpi-delta.up { color: var(--success); } .kpi-delta.down { color: var(--danger); }

        .dash-row { display:grid; grid-template-columns: 1.6fr 1fr; gap:14px; margin-bottom:14px; align-items:start; }
        .cash-row { display:flex; justify-content:space-between; font-size:13px; padding:6px 0; }
        .cash-row.total b { color: var(--accent); font-size:16px; }
        .cash-divider { height:1px; background:var(--border); margin:6px 0; }
        .pos { color: var(--success); } .neg { color: var(--danger); }
        .mini-row { display:flex; justify-content:space-between; align-items:center; font-size:12.5px; padding:7px 0; border-bottom:1px solid var(--border); }
        .mini-row:last-child { border-bottom:none; }

        .appt-list { display:flex; flex-direction:column; gap:2px; }
        .appt-item { display:flex; align-items:center; gap:12px; padding:10px 4px; border-bottom:1px solid var(--border); }
        .appt-item:last-child { border-bottom:none; }
        .appt-time { font-size:12.5px; font-weight:700; color:var(--dim); width:44px; }
        .appt-info { flex:1; display:flex; flex-direction:column; }
        .appt-info span { font-size:12px; }

        .segmented { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:3px; }
        .segmented.full { width:100%; }
        .segmented button { background:none; border:none; color:var(--dim); font-size:12.5px; font-weight:600; padding:7px 14px; border-radius:8px; cursor:pointer; flex:1; }
        .segmented button.active { background:var(--accent); color:#fff; }
        .day-grid { display:flex; flex-direction:column; }
        .day-slot { display:flex; gap:14px; padding:8px 0; border-bottom:1px solid var(--border); }
        .day-slot:last-child { border-bottom:none; }
        .slot-hour { width:44px; font-size:12px; color:var(--dim); padding-top:6px; flex-shrink:0; }
        .slot-track { flex:1; }
        .slot-empty { height:24px; cursor:pointer; }
        .slot-event { background:var(--surface-alt); border-left:3px solid; border-radius:8px; padding:8px 12px; cursor:grab; }
        .slot-event-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; gap:8px; }
        .slot-event span { font-size:12px; }
        .slot-event.compact { padding:6px 8px; margin-bottom:6px; cursor:pointer; }
        .slot-event.compact b { font-size:11.5px; }
        .slot-event.compact .slot-event-top { margin-bottom:0; }

        .agenda-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
        .agenda-nav { display:flex; align-items:center; gap:10px; }
        .agenda-label { background:none; border:none; color:var(--white); font-size:13.5px; font-weight:700; cursor:pointer; text-transform:capitalize; }
        .agenda-label:hover { color:var(--accent); }
        .period-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
        .range-picker { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:6px 10px; flex-wrap:wrap; }
        .range-picker input[type="date"] { background:var(--surface-alt); border:1px solid var(--border); border-radius:8px; padding:6px 8px; color:var(--white); font-size:12.5px; }

        .cal-week-card { padding: 0; overflow: hidden; }
        .cal-week { display: flex; flex-direction: column; }
        .cal-week-head { display: grid; grid-template-columns: 44px repeat(7, minmax(84px, 1fr)); border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 2; }
        .cal-week-head-spacer { border-right: 1px solid var(--border); }
        .cal-week-daybtn { background: none; border: none; border-right: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; cursor: pointer; }
        .cal-week-daybtn:last-child { border-right: none; }
        .cal-week-dow { font-size: 10.5px; color: var(--dim); font-weight: 700; letter-spacing: .02em; }
        .cal-week-daynum { font-size: 16px; font-weight: 700; color: var(--white); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .cal-week-daynum.today { background: var(--accent); color: #fff; }
        .cal-week-scroll { display: grid; grid-template-columns: 44px repeat(7, minmax(84px, 1fr)); overflow-x: auto; max-height: 560px; overflow-y: auto; }
        .cal-week-hours { display: flex; flex-direction: column; border-right: 1px solid var(--border); }
        .cal-week-hourlabel { font-size: 10.5px; color: var(--dim); padding-right: 6px; text-align: right; box-sizing: border-box; border-top: 1px solid var(--border); margin-top: -1px; }
        .cal-week-daycol { position: relative; border-right: 1px solid var(--border); cursor: pointer; }
        .cal-week-daycol:last-child { border-right: none; }
        .cal-week-hourline { position: absolute; left: 0; right: 0; border-top: 1px solid var(--border); }
        .cal-week-event { position: absolute; left: 3px; right: 3px; background: var(--surface-alt); border-left: 3px solid; border-radius: 6px; padding: 3px 6px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; gap: 0; }
        .cal-week-event b { font-size: 10.5px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-week-event span { font-size: 9.5px; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .month-weekdays { display:grid; grid-template-columns: repeat(7,1fr); text-align:center; font-size:11px; color:var(--dim); font-weight:700; margin-bottom:8px; }
        .month-grid { display:grid; grid-template-columns: repeat(7,1fr); gap:4px; }
        .month-cell { aspect-ratio:1; border-radius:10px; background:var(--surface-alt); border:1px solid transparent; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; cursor:pointer; position:relative; }
        .month-cell:hover { border-color:var(--accent); }
        .month-cell.dim { opacity:0.35; }
        .month-cell.today .month-cell-num { color:var(--accent); font-weight:800; }
        .month-cell-num { font-size:13px; }
        .month-cell-badge { position:absolute; bottom:5px; background:var(--accent); color:#fff; font-size:9px; font-weight:800; min-width:15px; height:15px; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 3px; }

        .report-export-row { display:flex; align-items:center; justify-content:space-between; padding:10px 4px; border-bottom:1px solid var(--border); font-size:13px; }
        .report-export-row:last-child { border-bottom:none; }
        .lancamentos-filters { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; align-items:center; }
        .lancamentos-filters select { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:8px 10px; color:var(--white); font-size:12.5px; }

        .split { display:grid; grid-template-columns: 300px 1fr; gap:14px; align-items:start; }
        .search-box { display:flex; align-items:center; gap:8px; background:var(--surface-alt); border:1px solid var(--border); border-radius:10px; padding:8px 12px; margin-bottom:12px; color:var(--dim); }
        .search-box input { background:none; border:none; outline:none; color:var(--white); font-size:13px; width:100%; }
        .client-row { display:flex; align-items:center; gap:10px; width:100%; background:none; border:none; padding:9px; border-radius:11px; cursor:pointer; margin-bottom:2px; }
        .client-row:hover { background: var(--surface-alt); }
        .client-row.active { background: var(--accent-soft); }
        .client-row-info { flex:1; display:flex; flex-direction:column; text-align:left; overflow:hidden; }
        .client-row-info b { font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .client-row-info span { font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .detail-head { display:flex; align-items:center; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
        .detail-head h2 { font-size:18px; margin:0; font-weight:800; }
        .detail-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:18px; }
        .detail-item { display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--white); }
        .detail-item svg { color:var(--dim); flex-shrink:0; }
        .vehicle-card { display:flex; align-items:center; gap:12px; background:var(--surface-alt); border:1px solid var(--border); border-radius:12px; padding:10px 12px; margin-bottom:8px; }
        .vehicle-icon { width:34px; height:34px; border-radius:9px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .vehicle-info { display:flex; flex-direction:column; }
        .vehicle-info b { font-size:13px; } .vehicle-info span { font-size:11.5px; }

        .kanban { display:grid; grid-template-columns: repeat(4, minmax(180px,1fr)); gap:12px; overflow-x:auto; padding-bottom:8px; }
        .kanban-col-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .kanban-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px; margin-bottom:9px; cursor:pointer; display:flex; flex-direction:column; gap:2px; }
        .kanban-card:hover { border-color: var(--accent); }
        .kanban-card-top { display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; }
        .kanban-card b { font-size:12.5px; }
        .kanban-card span { font-size:11.5px; }
        .kanban-card-foot { display:flex; justify-content:space-between; margin-top:6px; font-size:12px; }
        .os-detail { display:flex; flex-direction:column; gap:9px; }
        .status-track { display:flex; align-items:center; margin-top:18px; }
        .status-node { width:22px; height:22px; border-radius:50%; background:var(--surface-alt); border:1px solid var(--border); color:var(--dim); font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .status-node.done { background:var(--accent); border-color:var(--accent); color:#fff; }
        .status-line { flex:1; height:2px; background:var(--border); }
        .status-line.done { background:var(--accent); }

        .co-table { width:100%; border-collapse:collapse; }
        .co-table th { text-align:left; font-size:11px; color:var(--dim); font-weight:600; padding:8px 10px; border-bottom:1px solid var(--border); }
        .co-table td { padding:12px 10px; font-size:13px; border-bottom:1px solid var(--border); }
        .co-table tr:last-child td { border-bottom:none; }
        .alert-row { display:flex; align-items:center; gap:10px; font-size:12.5px; }

        .crm-windows { display:grid; grid-template-columns: repeat(5,1fr); gap:12px; margin-bottom:14px; }
        .crm-window-card { display:flex; flex-direction:column; gap:6px; }
        .crm-window-card b { font-size:22px; font-weight:800; }
        .crm-row { display:flex; align-items:center; gap:12px; padding:10px 4px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
        .crm-row:last-child { border-bottom:none; }

        .service-grid { display:grid; grid-template-columns: repeat(3,1fr); gap:14px; }
        .service-card { display:flex; flex-direction:column; gap:8px; }
        .service-icon { width:32px; height:32px; border-radius:9px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; }
        .service-meta { display:flex; gap:12px; font-size:11.5px; color:var(--dim); }
        .service-meta span { display:flex; align-items:center; gap:4px; }
        .service-price { font-size:18px; font-weight:800; color:var(--accent); margin-top:4px; }

        .employee-row { display:flex; align-items:center; gap:14px; padding:12px 4px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
        .employee-row:last-child { border-bottom:none; }
        .goal-bar { flex:1; min-width: 80px; height:7px; border-radius:5px; background:var(--surface-alt); overflow:hidden; }
        .goal-fill { height:100%; background:var(--accent); border-radius:5px; }

        .report-grid { display:grid; grid-template-columns: repeat(2,1fr); gap:14px; }
        .report-card { display:flex; flex-direction:column; gap:10px; }
        .report-card svg { color: var(--accent); }
        .report-actions { display:flex; gap:8px; margin-top:4px; }

        .co-modal-veil { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:50; backdrop-filter: blur(4px); padding: 20px; }
        .co-modal { background:var(--surface); border:1px solid var(--border); border-radius:18px; max-height:85vh; overflow-y:auto; width:100%; }
        .co-modal-head { display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--surface); }
        .co-modal-head h3 { margin:0; font-size:15px; font-weight:700; }
        .co-modal-body { padding:18px; }
        .co-modal-foot { padding: 0 18px 18px; }

        ::-webkit-scrollbar { width:8px; height:8px; }
        ::-webkit-scrollbar-thumb { background: var(--surface-alt); border-radius:8px; }

        /* ================= MOBILE / PWA ================= */
        @media (max-width: 820px) {
          .co-root { flex-direction: column; }
          .sidebar {
            position: fixed; left:0; right:0; bottom:0; top:auto; width:100% !important;
            height: auto; flex-direction: row; align-items: stretch; justify-content:flex-start;
            padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); gap:0;
            border-right:none; border-top:1px solid var(--border); z-index: 70;
            overflow-x: auto; overflow-y: hidden;
          }
          .sidebar-brand, .sidebar-foot { display: none; }
          .nav-item { flex-direction: column; gap: 3px; font-size: 9.5px; padding: 7px 4px; min-width: 58px; flex-shrink:0; text-align:center; margin-bottom:0; border-radius: 10px; }
          .nav-item span, .nav-item { white-space: nowrap; }
          .main { padding-bottom: 0; }
          .content-scroll { padding: 16px 14px 90px; }
          .topbar { padding: 0 14px; height: 54px; }
          .topbar-search { display: none; }
          .page-header h1 { font-size: 19px; }
          .page-header { margin-bottom: 16px; }

          .kpi-grid, .kpi-grid.four { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .kpi-value { font-size: 19px; }
          .dash-row { grid-template-columns: 1fr; }
          .form-grid-2 { grid-template-columns: 1fr; }
          .detail-grid { grid-template-columns: 1fr; }
          .split { grid-template-columns: 1fr; }
          .service-grid { grid-template-columns: repeat(2, 1fr); }
          .report-grid { grid-template-columns: 1fr; }
          .crm-windows { grid-template-columns: repeat(3, 1fr); }
          .employee-row, .crm-row { flex-wrap: wrap; }
          .goal-bar { min-width: 100%; order: 3; }

          .kanban { grid-template-columns: repeat(4, minmax(78vw, 1fr)); scroll-snap-type: x mandatory; }
          .kanban-col { scroll-snap-align: start; }
          .cal-week-scroll { max-height: none; }
          .cal-week-head, .cal-week-scroll { grid-template-columns: 36px repeat(7, minmax(64px, 1fr)); }
          .cal-week-dow { font-size: 9px; }
          .cal-week-daynum { font-size: 13px; width: 24px; height: 24px; }
          .cal-week-hourlabel { font-size: 9px; }
          .cal-week-event b { font-size: 9.5px; }
          .cal-week-event span { font-size: 8.5px; }
          .month-cell-num { font-size: 11px; }

          .co-icon-btn { width: 34px; height: 34px; }
          .co-btn-primary, .co-btn-ghost { padding: 10px 14px; }
          .login-card { width: 100%; max-width: 340px; }

          .co-dropdown { position: fixed; top: 60px; left: 12px; right: 12px; width: auto; max-width: none; }
          .topbar-actions { position: relative; }

          .co-modal-veil { align-items: center; padding: 12px; }
          .co-modal { max-height: 88vh; border-radius: 20px; display: flex; flex-direction: column; }
          .co-modal-body { overflow-y: auto; flex: 1; }
          .co-modal-foot { position: sticky; bottom: 0; background: var(--surface); border-top: 1px solid var(--border); padding: 12px 18px; margin-top: 0; }
        }
        @media (max-width: 420px) {
          .kpi-grid, .kpi-grid.four { grid-template-columns: 1fr 1fr; }
          .crm-windows { grid-template-columns: repeat(2, 1fr); }
          .service-grid { grid-template-columns: 1fr; }
          .nav-item { min-width: 52px; }
        }
      `}</style>

      {auth.loading ? (
        <div className="splash"><Loader2 size={22} className="spin" /><span>Carregando…</span></div>
      ) : !auth.session ? (
        <Login brand={brand} auth={auth} />
      ) : !allReady ? (
        <div className="splash"><Loader2 size={22} className="spin" /><span>Carregando dados…</span></div>
      ) : (
        <>
          <div className="sidebar">
            <div className="sidebar-brand">
              <div className="logo-mark">{brand.mark}</div>
              {!collapsed && <div className="sidebar-brand-text"><b>{brand.name}</b><span>{brand.suffix}</span></div>}
            </div>
            {visibleNav.map(n => (
              <button key={n.key} className={`nav-item ${page === n.key ? "active" : ""}`} onClick={() => setPage(n.key)}>
                <n.icon size={17} strokeWidth={2} />{!collapsed && n.label}
              </button>
            ))}
            <div className="sidebar-foot">
              <button className="nav-item" onClick={() => setCollapsed(!collapsed)}><Menu size={17} strokeWidth={2} />{!collapsed && "Recolher menu"}</button>
              <button className="nav-item" onClick={() => auth.signOut()}><LogOut size={17} strokeWidth={2} />{!collapsed && "Sair"}</button>
            </div>
          </div>
          <div className="main">
            <div className="topbar">
              <div className="topbar-search"><Search size={14} /><input placeholder="Buscar cliente, veículo, OS…" /></div>
              <div className="topbar-actions">
                <div className="dropdown-wrap">
                  <button className="co-icon-btn" style={{ position: "relative" }} onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}>
                    <Bell size={16} />
                    {notifications.length > 0 && <span className="notif-dot">{notifications.length > 9 ? "9+" : notifications.length}</span>}
                  </button>
                  {showNotif && (
                    <>
                      <div className="dropdown-veil" onClick={() => setShowNotif(false)} />
                      <div className="co-dropdown">
                        <div className="co-dropdown-head">Notificações</div>
                        {notifications.length ? notifications.map(n => (
                          <button key={n.id} className="co-dropdown-item" onClick={() => { setPage(n.page); setShowNotif(false); }}>
                            <n.icon size={14} color={n.color} /><span>{n.text}</span>
                          </button>
                        )) : <div className="co-dropdown-empty">Tudo em dia por aqui.</div>}
                      </div>
                    </>
                  )}
                </div>
                <IconBtn icon={Settings} title="Configurações" onClick={() => setPage("config")} />
                <div className="dropdown-wrap">
                  <button className="avatar-btn" onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}>
                    <Avatar name={authedUser.name} size={32} />
                  </button>
                  {showProfile && (
                    <>
                      <div className="dropdown-veil" onClick={() => setShowProfile(false)} />
                      <div className="co-dropdown" style={{ width: 220 }}>
                        <div className="co-dropdown-profile">
                          <Avatar name={authedUser.name} size={38} />
                          <div><b>{authedUser.name}</b><span className="muted" style={{ display: "block", fontSize: 11 }}>{authedUser.email}</span></div>
                        </div>
                        <Badge text={authedUser.role} color={PALETTE.warning} />
                        <button className="co-dropdown-item" style={{ marginTop: 10 }} onClick={() => { setPage("config"); setShowProfile(false); }}><Settings size={14} /><span>Configurações</span></button>
                        <button className="co-dropdown-item" onClick={() => auth.signOut()}><LogOut size={14} /><span>Sair</span></button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="content-scroll">{PAGES[page]}</div>
          </div>
        </>
      )}
    </div>
  );
}
