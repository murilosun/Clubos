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

export function Agenda({ appointments, setAppointments, clients, services, employees }) {
  const empty = { time: "08:00", clientName: "", serviceIds: [], pickService: "", techs: [], pickTech: "", status: "Agendado", repeat: "none", repeatCount: 4 };
  const [view, setView] = useState("dia"); // dia | semana | mes
  const [refDate, setRefDate] = useState(todayISO());
  const [modal, setModal] = useState(null); // null | "new" | appointment being edited
  const [dragId, setDragId] = useState(null);
  const [form, setForm] = useState(empty);
  const hours = Array.from({ length: 13 }, (_, i) => 7 + i); // 07:00–19:00
  const calHours = Array.from({ length: CAL_HOUR_END - CAL_HOUR_START + 1 }, (_, i) => CAL_HOUR_START + i);
  const calHeight = calHours.length * CAL_ROW_H;

  const openNew = (dateForNew, timeForNew) => { setForm({ ...empty, date: dateForNew || refDate, time: timeForNew || empty.time }); setModal("new"); };
  const openEdit = (a) => { setForm({ time: a.time, clientName: a.clientName, serviceIds: (a.serviceIds?.length ? a.serviceIds : (a.serviceId ? [a.serviceId] : [])), pickService: "", techs: a.techs || [], pickTech: "", status: a.status, date: a.date, repeat: "none", repeatCount: 4 }); setModal(a); };

  const addService = () => {
    if (!form.pickService || form.serviceIds.includes(form.pickService)) return;
    setForm({ ...form, serviceIds: [...form.serviceIds, form.pickService], pickService: "" });
  };
  const removeService = (id) => setForm({ ...form, serviceIds: form.serviceIds.filter(sid => sid !== id) });
  const addTech = () => {
    if (!form.pickTech || form.techs.includes(form.pickTech)) return;
    setForm({ ...form, techs: [...form.techs, form.pickTech], pickTech: "" });
  };
  const removeTech = (name) => setForm({ ...form, techs: form.techs.filter(t => t !== name) });

  const save = () => {
    if (!form.clientName || !form.serviceIds.length) return;
    const names = form.serviceIds.map(id => services.find(s => s.id === id)?.name).filter(Boolean).join(" + ");
    const baseDate = form.date || refDate;
    const payload = { time: form.time, clientName: form.clientName, status: form.status, serviceIds: form.serviceIds, serviceId: form.serviceIds[0], service: names, techs: form.techs };

    if (modal === "new") {
      if (form.repeat === "none") {
        setAppointments(prev => [...prev, { id: uid(), ...payload, date: baseDate, recurrenceGroup: null }]);
      } else {
        const group = uid();
        const count = Math.max(1, Math.min(52, Number(form.repeatCount) || 1));
        const news = Array.from({ length: count }, (_, i) => ({
          id: uid(), ...payload,
          date: form.repeat === "weekly" ? addDays(baseDate, 7 * i) : addMonths(baseDate, i),
          recurrenceGroup: group,
        }));
        setAppointments(prev => [...prev, ...news]);
      }
    } else {
      setAppointments(prev => prev.map(a => a.id === modal.id ? { ...a, ...payload, date: baseDate } : a));
    }
    setModal(null);
  };
  const moveTo = (hour, date) => {
    if (!dragId) return;
    setAppointments(prev => prev.map(a => a.id === dragId ? { ...a, time: `${String(hour).padStart(2, "0")}:00`, date } : a));
    setDragId(null);
  };
  const moveToDay = (date) => {
    if (!dragId) return;
    setAppointments(prev => prev.map(a => a.id === dragId ? { ...a, date } : a));
    setDragId(null);
  };
  const removeAppt = (id) => setAppointments(prev => prev.filter(a => a.id !== id));

  const goPrev = () => setRefDate(d => view === "dia" ? addDays(d, -1) : view === "semana" ? addDays(d, -7) : addMonths(d, -1));
  const goNext = () => setRefDate(d => view === "dia" ? addDays(d, 1) : view === "semana" ? addDays(d, 7) : addMonths(d, 1));
  const goToday = () => setRefDate(todayISO());

  const label = useMemo(() => {
    const d = new Date(refDate + "T00:00");
    if (view === "dia") return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    if (view === "semana") { const s = startOfWeek(refDate); const e = addDays(s, 6); const sd = new Date(s + "T00:00"), ed = new Date(e + "T00:00"); return `${sd.getDate()} — ${ed.getDate()} de ${monthLabels[ed.getMonth()]}`; }
    return `${monthLabels[d.getMonth()]} de ${d.getFullYear()}`;
  }, [refDate, view]);

  const apptFor = (dateIso) => appointments.filter(a => a.date === dateIso).sort((a, b) => a.time.localeCompare(b.time));

  const apptServiceIds = (appt) => appt.serviceIds?.length ? appt.serviceIds : (appt.serviceId ? [appt.serviceId] : []);
  const apptDuration = (appt) => apptServiceIds(appt).reduce((sum, id) => sum + parseDurationMin(services.find(s => s.id === id)?.time), 0);
  const timeToY = (time) => { const [h, m] = time.split(":").map(Number); return ((h - CAL_HOUR_START) + m / 60) * CAL_ROW_H; };

  const renderApptCard = (appt, compact = false) => {
    const dur = apptDuration(appt) || 60;
    const endTime = addMinutesToTime(appt.time, dur);
    return (
      <div key={appt.id} className={`slot-event ${compact ? "compact" : ""}`} style={{ borderColor: STATUS_COLOR[appt.status] }} draggable={!compact} onDragStart={() => setDragId(appt.id)} onClick={() => openEdit(appt)}>
        <div className="slot-event-top">
          <b>{appt.clientName}</b>
          {!compact && <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Badge text={appt.status} color={STATUS_COLOR[appt.status]} />
            <IconBtn icon={Trash2} title="Remover" onClick={(e) => { e.stopPropagation(); removeAppt(appt.id); }} />
          </div>}
        </div>
        <span className="muted">{appt.service || "Serviço"} · {appt.time}–{endTime}</span>
      </div>
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(refDate), i));

  return (
    <div className="page">
      <PageHeader title="Agenda" subtitle="Arraste um agendamento para outro horário, ou toque para editar." action={<PrimaryButton icon={Plus} onClick={() => openNew()}>Novo Agendamento</PrimaryButton>} />

      <div className="agenda-toolbar">
        <div className="segmented">
          {["dia", "semana", "mes"].map(v => (
            <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>{v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}</button>
          ))}
        </div>
        <div className="agenda-nav">
          <IconBtn icon={ChevronLeft} title="Anterior" onClick={goPrev} />
          <button className="agenda-label" onClick={goToday}>{label}</button>
          <IconBtn icon={ChevronRight} title="Próximo" onClick={goNext} />
        </div>
      </div>

      {view === "dia" && (
        <Card>
          <div className="day-grid">
            {hours.map(h => {
              const appt = apptFor(refDate).find(a => parseInt(a.time) === h);
              return (
                <div key={h} className="day-slot" onDragOver={(e) => e.preventDefault()} onDrop={() => moveTo(h, refDate)}>
                  <span className="slot-hour">{h}:00</span>
                  <div className="slot-track">{appt ? renderApptCard(appt) : <div className="slot-empty" onClick={() => openNew(refDate, `${String(h).padStart(2, "0")}:00`)} />}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "semana" && (
        <Card className="cal-week-card">
          <div className="cal-week">
            <div className="cal-week-head">
              <div className="cal-week-head-spacer" />
              {weekDays.map(dateIso => {
                const d = new Date(dateIso + "T00:00");
                const isToday = dateIso === todayISO();
                return (
                  <button key={dateIso} className="cal-week-daybtn" onClick={() => { setRefDate(dateIso); setView("dia"); }}>
                    <span className="cal-week-dow">{weekdayLabels[d.getDay()].slice(0, 3).toUpperCase()}</span>
                    <span className={`cal-week-daynum ${isToday ? "today" : ""}`}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <div className="cal-week-scroll">
              <div className="cal-week-hours">
                {calHours.map(h => <div key={h} className="cal-week-hourlabel" style={{ height: CAL_ROW_H }}>{h}:00</div>)}
              </div>
              {weekDays.map(dateIso => (
                <div
                  key={dateIso}
                  className="cal-week-daycol"
                  style={{ height: calHeight }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => moveToDay(dateIso)}
                  onClick={(e) => {
                    if (e.target.closest(".cal-week-event")) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const hour = CAL_HOUR_START + Math.floor((e.clientY - rect.top) / CAL_ROW_H);
                    openNew(dateIso, `${String(Math.min(CAL_HOUR_END, Math.max(CAL_HOUR_START, hour))).padStart(2, "0")}:00`);
                  }}
                >
                  {calHours.map(h => <div key={h} className="cal-week-hourline" style={{ top: (h - CAL_HOUR_START) * CAL_ROW_H }} />)}
                  {apptFor(dateIso).map(a => {
                    const top = timeToY(a.time);
                    const height = Math.max(26, (apptDuration(a) || 60) / 60 * CAL_ROW_H - 2);
                    return (
                      <div key={a.id} className="cal-week-event" draggable onDragStart={(e) => { e.stopPropagation(); setDragId(a.id); }}
                        style={{ top, height, borderColor: STATUS_COLOR[a.status], background: `${STATUS_COLOR[a.status]}26` }}
                        onClick={(e) => { e.stopPropagation(); openEdit(a); }}>
                        <b>{a.clientName}</b>
                        {height > 34 && <span>{a.service}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {view === "mes" && (
        <Card>
          <div className="month-weekdays">{weekdayLabels.map(w => <span key={w}>{w}</span>)}</div>
          <div className="month-grid">
            {(() => {
              const first = new Date(refDate + "T00:00"); first.setDate(1);
              const startIso = addDays(first.toISOString().slice(0, 10), -first.getDay());
              return Array.from({ length: 42 }, (_, i) => addDays(startIso, i)).map(dateIso => {
                const d = new Date(dateIso + "T00:00");
                const inMonth = d.getMonth() === first.getMonth();
                const isToday = dateIso === todayISO();
                const dayAppts = apptFor(dateIso);
                return (
                  <div key={dateIso} className={`month-cell ${inMonth ? "" : "dim"} ${isToday ? "today" : ""}`} onClick={() => { setRefDate(dateIso); setView("dia"); }}>
                    <span className="month-cell-num">{d.getDate()}</span>
                    {dayAppts.length > 0 && <span className="month-cell-badge">{dayAppts.length}</span>}
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      )}

      {modal && (
        <Modal title={modal === "new" ? "Novo Agendamento" : "Editar Agendamento"} onClose={() => setModal(null)} footer={<PrimaryButton onClick={save}>{modal === "new" ? "Salvar agendamento" : "Salvar alterações"}</PrimaryButton>}>
          <Field label="Cliente">
            <select value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}>
              <option value="">Selecione…</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Serviços">
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ flex: 1 }} value={form.pickService} onChange={e => setForm({ ...form, pickService: e.target.value })}>
                <option value="">Selecione um serviço…</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} · {s.time || "—"}{s.type === "assinatura" ? " (assinatura)" : ""}</option>)}
              </select>
              <GhostButton icon={Plus} onClick={addService}>Adicionar</GhostButton>
            </div>
          </Field>
          {form.serviceIds.length > 0 && (
            <div className="items-list">
              {form.serviceIds.map(id => {
                const s = services.find(sv => sv.id === id);
                return (
                  <div key={id} className="items-row">
                    <span>{s?.name || "Serviço"}</span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="muted">{s?.time || "—"}</span><IconBtn icon={X} title="Remover" onClick={() => removeService(id)} /></span>
                  </div>
                );
              })}
            </div>
          )}
          {form.serviceIds.length > 0 && (() => {
            const dur = form.serviceIds.reduce((sum, id) => sum + parseDurationMin(services.find(s => s.id === id)?.time), 0);
            return <p className="muted" style={{ fontSize: 12, margin: "-4px 0 12px" }}>Duração total estimada: {dur} min (termina às {addMinutesToTime(form.time, dur)})</p>;
          })()}
          <Field label="Funcionários">
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
          <div className="form-grid-2">
            <Field label="Data"><input type="date" value={form.date || refDate} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Horário"><input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {APPT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          {modal === "new" && (
            <>
              <Field label="Repetir agendamento">
                <div className="segmented full">
                  {[{ v: "none", l: "Não repete" }, { v: "weekly", l: "Toda semana" }, { v: "monthly", l: "Todo mês" }].map(o => (
                    <button key={o.v} className={form.repeat === o.v ? "active" : ""} onClick={() => setForm({ ...form, repeat: o.v })}>{o.l}</button>
                  ))}
                </div>
              </Field>
              {form.repeat !== "none" && (
                <Field label={`Quantas vezes (ex: plano de assinatura — ${form.repeat === "weekly" ? "semanas" : "meses"})`}>
                  <input type="number" min={1} max={52} value={form.repeatCount} onChange={e => setForm({ ...form, repeatCount: e.target.value })} />
                </Field>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* CLIENTES                                                                 */
/* ---------------------------------------------------------------------- */
