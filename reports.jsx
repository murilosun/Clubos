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

export function Relatorios({ orders, clients, products, financial }) {
  const [rangeFrom, setRangeFrom] = useState(addDays(todayISO(), -29));
  const [rangeTo, setRangeTo] = useState(todayISO());
  const netOrder = (o) => (Number(o.value) || 0) * (1 - (Number(o.discount) || 0) / 100);

  const ordersInRange = orders.filter(o => o.createdAt >= rangeFrom && o.createdAt <= rangeTo);
  const inRangeFilter = (d) => d >= rangeFrom && d <= rangeTo;

  const byService = {};
  ordersInRange.forEach(o => { byService[o.serviceName] = (byService[o.serviceName] || 0) + 1; });
  const recurring = clients.filter(c => orders.filter(o => o.clientId === c.id).length > 1);

  const totalRevenue = realizedRevenue(orders, financial, inRangeFilter);
  const ticketMedio = ordersInRange.length ? totalRevenue / ordersInRange.length : 0;
  const totalDespesas = realizedExpenses(financial, inRangeFilter);

  const revenueByMonth = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const revenue = realizedRevenue(orders, financial, (od) => od.slice(0, 7) === key);
      const despesas = realizedExpenses(financial, (fd) => fd.slice(0, 7) === key);
      months.push({ mes: monthLabels[d.getMonth()].slice(0, 3), faturamento: revenue, despesas });
    }
    return months;
  }, [orders, financial]);

  const byStatus = useMemo(() => STATUS_FLOW.map(s => ({ status: s, qtd: ordersInRange.filter(o => o.status === s).length })), [ordersInRange]);

  const serviceRevenue = useMemo(() => {
    const map = {};
    ordersInRange.forEach(o => { map[o.serviceName] = (map[o.serviceName] || 0) + netOrder(o); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [ordersInRange]);

  const topClients = useMemo(() => {
    return clients.map(c => ({ name: c.name.split(" ")[0], value: ordersInRange.filter(o => o.clientId === c.id).reduce((s, o) => s + netOrder(o), 0) }))
      .filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [clients, ordersInRange]);

  const exportCsv = (filename, rows) => {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };
  const reports = [
    { title: "Lucro e faturamento (período)", rows: [["Data", "Cliente", "Serviço", "Valor"], ...ordersInRange.map(o => [o.createdAt, o.clientName, o.serviceName, o.value])] },
    { title: "Serviços vendidos (período)", rows: [["Serviço", "Quantidade"], ...Object.entries(byService)] },
    { title: "Clientes recorrentes", rows: [["Cliente", "Nº de OS"], ...recurring.map(c => [c.name, orders.filter(o => o.clientId === c.id).length])] },
    { title: "Estoque de produtos", rows: [["Produto", "Quantidade", "Fornecedor"], ...products.map(p => [p.name, p.qty, p.supplier])] },
  ];

  return (
    <div className="page">
      <PageHeader title="Relatórios" subtitle="Visão geral do negócio, com base nos dados reais do sistema." />

      <div className="range-picker" style={{ marginBottom: 16 }}>
        <span className="muted">Período: de</span><input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
        <span className="muted">até</span><input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} />
      </div>

      <div className="kpi-grid four">
        <KPI label="Faturamento no período" value={money(totalRevenue)} icon={DollarSign} />
        <KPI label="Ticket médio" value={money(ticketMedio)} icon={Star} />
        <KPI label="Despesas no período" value={money(totalDespesas)} icon={TrendingDown} positive={false} />
        <KPI label="Ordens de serviço" value={String(ordersInRange.length)} icon={ClipboardList} />
      </div>

      <div className="dash-row">
        <Card className="chart-card">
          <div className="card-head"><h3>Faturamento x Despesas</h3><span className="muted">Últimos 6 meses</span></div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={revenueByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "#9A9AA0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#202022", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#FF6A00" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#FF453A" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="side-card">
          <div className="card-head"><h3>OS por etapa</h3></div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byStatus} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="status" tick={{ fill: "#9A9AA0", fontSize: 11.5 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: "#202022", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="qtd" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="dash-row">
        <Card className="side-card">
          <div className="card-head"><h3>Faturamento por serviço</h3></div>
          {serviceRevenue.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={serviceRevenue} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                  {serviceRevenue.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#202022", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <span className="muted" style={{ fontSize: 12 }}>Sem dados suficientes ainda.</span>}
        </Card>
        <Card className="chart-card">
          <div className="card-head"><h3>Top 5 clientes por faturamento</h3></div>
          {topClients.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topClients} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9A9AA0", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#202022", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v) => money(v)} />
                <Bar dataKey="value" fill="#5AC8FA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <span className="muted" style={{ fontSize: 12 }}>Sem dados suficientes ainda.</span>}
        </Card>
      </div>

      <Card>
        <div className="card-head"><h3>Exportar dados</h3><span className="muted">CSV, compatível com Excel</span></div>
        <div className="report-grid">
          {reports.map(r => (
            <div key={r.title} className="report-export-row">
              <span>{r.title}</span>
              <GhostButton onClick={() => exportCsv(`${r.title}.csv`, r.rows)}>Exportar</GhostButton>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* CONFIGURAÇÕES                                                            */
/* ---------------------------------------------------------------------- */
export function Configuracoes({ brand, currentUser, onSignOut }) {
  const [form, setForm] = useState(brand);
  const [teamUsers, setTeamUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("app_users").select("*").then(({ data }) => setTeamUsers(data || []));
  }, []);

  const save = async () => {
    await supabase.from("companies").update({ name: form.name, suffix: form.suffix, mark: form.mark, accent: form.accent }).eq("id", COMPANY_ID);
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  const saveEditedUser = async () => {
    await supabase.from("app_users").update({ name: editingUser.name, role: editingUser.role }).eq("id", editingUser.id);
    setTeamUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  return (
    <div className="page">
      <PageHeader title="Configurações" subtitle="Identidade do sistema e pessoas com acesso." action={<PrimaryButton icon={Check} onClick={save}>Salvar alterações</PrimaryButton>} />
      <Toast text={saved ? "Alterações salvas" : ""} />
      <Card style={{ marginBottom: 14 }}>
        <div className="card-head"><h3>Identidade</h3></div>
        <div className="form-grid-2">
          <Field label="Nome do sistema"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Subtítulo"><input value={form.suffix} onChange={e => setForm({ ...form, suffix: e.target.value })} /></Field>
          <Field label="Inicial do logo"><input maxLength={2} value={form.mark} onChange={e => setForm({ ...form, mark: e.target.value.toUpperCase() })} /></Field>
          <Field label="Cor de destaque"><input type="color" value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })} style={{ height: 38, padding: 4 }} /></Field>
        </div>
      </Card>
      <Card>
        <div className="card-head"><h3>Pessoas com acesso</h3></div>
        {teamUsers.map(u => (
          <div key={u.id} className="employee-row">
            <Avatar name={u.name} size={38} />
            <div className="client-row-info" style={{ minWidth: 180 }}><b>{u.name}</b><span className="muted">{u.email}</span></div>
            <Badge text={u.role} color={PALETTE.warning} />
            <IconBtn icon={PenIcon} title="Editar" onClick={() => setEditingUser({ ...u })} />
          </div>
        ))}
        <p className="muted" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.5 }}>
          Pra dar acesso a mais alguém, peça pra essa pessoa abrir o app e usar "Criar acesso" na tela de login — ela aparece aqui automaticamente.
          Quando o sistema virar multiempresa, cada empresa passa a ter sua própria lista de usuários e seus próprios dados isolados.
        </p>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <div className="card-head"><h3>Sua conta</h3></div>
        <div className="detail-item"><Users size={14} /><span>{currentUser?.name} · {currentUser?.email}</span></div>
        <GhostButton icon={LogOut} onClick={onSignOut} style={{ marginTop: 12 }}>Sair</GhostButton>
      </Card>

      {editingUser && (
        <Modal title="Editar acesso" onClose={() => setEditingUser(null)} footer={<PrimaryButton onClick={saveEditedUser}>Salvar alterações</PrimaryButton>}>
          <Field label="Nome"><input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} /></Field>
          <Field label="Papel">
            <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
              <option value="Administrador">Administrador</option>
              <option value="Funcionário">Funcionário</option>
            </select>
          </Field>
          <p className="muted" style={{ fontSize: 11.5 }}>E-mail e senha não podem ser trocados por aqui — quem quiser trocar a própria senha faz isso pela tela de login do Supabase (em breve direto no app).</p>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* LOGIN                                                                    */
/* ---------------------------------------------------------------------- */
export function Login({ brand, auth }) {
  const [mode, setMode] = useState("entrar"); // entrar | criar
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Administrador");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(""); setInfo(""); setBusy(true);
    const em = email.trim().toLowerCase();
    const pw = password.trim();
    if (!em || !pw) { setError("Preencha e-mail e senha."); setBusy(false); return; }

    if (mode === "entrar") {
      const err = await auth.signIn(em, pw);
      if (err) setError("E-mail ou senha incorretos.");
    } else {
      if (!name.trim()) { setError("Digite seu nome."); setBusy(false); return; }
      if (pw.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); setBusy(false); return; }
      const { error: err, needsConfirmation } = await auth.signUp(em, pw, name.trim(), role);
      if (err) setError(err.message === "User already registered" ? "Esse e-mail já tem conta — clique em Entrar." : "Não foi possível criar a conta. Tente novamente.");
      else if (needsConfirmation) setInfo("Conta criada! Verifique seu e-mail para confirmar o acesso antes de entrar.");
    }
    setBusy(false);
  };
  const onKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="logo-mark">{brand.mark}</div>
        <h1>{brand.name}</h1>
        <span className="muted">{brand.suffix}</span>

        <div className="segmented full" style={{ marginTop: 18 }}>
          <button className={mode === "entrar" ? "active" : ""} onClick={() => { setMode("entrar"); setError(""); setInfo(""); }}>Entrar</button>
          <button className={mode === "criar" ? "active" : ""} onClick={() => { setMode("criar"); setError(""); setInfo(""); }}>Criar acesso</button>
        </div>

        {mode === "criar" && (
          <div className="login-field"><label>Seu nome</label><input value={name} onChange={e => setName(e.target.value)} /></div>
        )}
        <div className="login-field"><label>E-mail</label><input autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey} /></div>
        <div className="login-field"><label>Senha</label><input type="password" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey} /></div>
        {mode === "criar" && (
          <div className="login-field">
            <label>Papel</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="Administrador">Administrador</option>
              <option value="Funcionário">Funcionário</option>
            </select>
          </div>
        )}

        {error && <span style={{ color: PALETTE.danger, fontSize: 12, marginTop: 10 }}>{error}</span>}
        {info && <span style={{ color: PALETTE.success, fontSize: 12, marginTop: 10 }}>{info}</span>}

        <PrimaryButton onClick={submit} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
          {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar minha conta"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* APP SHELL                                                                */
/* ---------------------------------------------------------------------- */
