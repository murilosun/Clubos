import React from "react";
import { Check, TrendingUp, TrendingDown, X } from "lucide-react";
import { PALETTE } from "../lib/utils";

export function Card({ children, style, className = "" }) { return <div className={`co-card ${className}`} style={style}>{children}</div>; }

export function Badge({ text, color }) {
  return <span className="co-badge" style={{ color, background: `${color}1F`, borderColor: `${color}40` }}><span className="co-dot" style={{ background: color }} />{text}</span>;
}

export function KPI({ label, value, delta, icon: Icon, positive = true }) {
  return (
    <Card className="kpi">
      <div className="kpi-top"><span className="kpi-label">{label}</span><div className="kpi-icon"><Icon size={15} strokeWidth={2} /></div></div>
      <div className="kpi-value">{value}</div>
      {delta && <div className={`kpi-delta ${positive ? "up" : "down"}`}>{positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {delta}</div>}
    </Card>
  );
}

export function Avatar({ name, size = 34 }) {
  const initials = (name || "?").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return <div className="co-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</div>;
}

export function PrimaryButton({ children, icon: Icon, onClick, style, type = "button" }) {
  return <button type={type} className="co-btn-primary" onClick={onClick} style={style}>{Icon && <Icon size={15} strokeWidth={2.4} />}{children}</button>;
}
export function GhostButton({ children, icon: Icon, onClick, danger, style }) {
  return <button type="button" className="co-btn-ghost" style={{ ...(danger ? { color: PALETTE.danger, borderColor: `${PALETTE.danger}55` } : null), ...style }} onClick={onClick}>{Icon && <Icon size={15} strokeWidth={2.2} />}{children}</button>;
}
export function IconBtn({ icon: Icon, onClick, title }) { return <button type="button" title={title} className="co-icon-btn" onClick={onClick}><Icon size={16} /></button>; }

export function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }

export function Modal({ title, onClose, children, width = 480, footer }) {
  return (
    <div className="co-modal-veil" onClick={onClose}>
      <div className="co-modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="co-modal-head"><h3>{title}</h3><IconBtn icon={X} onClick={onClose} /></div>
        <div className="co-modal-body">{children}</div>
        {footer && <div className="co-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function Toast({ text }) { return text ? <div className="co-toast"><Check size={14} />{text}</div> : null; }

/* ---------------------------------------------------------------------- */
/* DASHBOARD                                                                */
/* ---------------------------------------------------------------------- */
