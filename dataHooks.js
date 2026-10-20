import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, COMPANY_ID } from "../supabaseClient";

export function useSupabaseCollection(table, mapToJs, mapToDb, orderBy = "created_at") {
  const [data, setData] = useState([]);
  const [ready, setReady] = useState(false);
  const prevRef = useRef([]);

  const fetchAll = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from(table)
      .select("*")
      .eq("company_id", COMPANY_ID)
      .order(orderBy, { ascending: false });
    if (!error && rows) {
      const mapped = rows.map(mapToJs);
      prevRef.current = mapped;
      setData(mapped);
    }
    setReady(true);
  }, [table]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`rt-${table}-${COMPANY_ID}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `company_id=eq.${COMPANY_ID}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const setSynced = useCallback(async (updater) => {
    const prev = prevRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    setData(next);
    prevRef.current = next;

    const prevIds = new Set(prev.map((x) => x.id));
    const nextIds = new Set(next.map((x) => x.id));

    const toDelete = prev.filter((x) => !nextIds.has(x.id));
    await Promise.all(toDelete.map((item) => supabase.from(table).delete().eq("id", item.id)));

    for (const item of next) {
      const isNew = !prevIds.has(item.id);
      const prevItem = prev.find((p) => p.id === item.id);
      const changed = isNew || JSON.stringify(prevItem) !== JSON.stringify(item);
      if (!changed) continue;
      const row = mapToDb(item);
      if (isNew) {
        const { id, ...rest } = row;
        const { data: inserted, error } = await supabase.from(table).insert({ ...rest, company_id: COMPANY_ID }).select().single();
        if (!error && inserted) {
          const fresh = mapToJs(inserted);
          setData((cur) => cur.map((x) => (x.id === item.id ? fresh : x)));
          prevRef.current = prevRef.current.map((x) => (x.id === item.id ? fresh : x));
        }
      } else {
        await supabase.from(table).update(row).eq("id", item.id);
      }
    }
  }, [table, mapToDb, mapToJs]);

  return [data, setSynced, ready];
}

export function useClientsWithVehicles() {
  const [clients, setClients] = useState([]);
  const [ready, setReady] = useState(false);
  const prevRef = useRef([]);

  const fetchAll = useCallback(async () => {
    const [{ data: clientRows }, { data: vehicleRows }] = await Promise.all([
      supabase.from("clients").select("*").eq("company_id", COMPANY_ID).order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").eq("company_id", COMPANY_ID),
    ]);
    const mapped = (clientRows || []).map((c) => ({
      id: c.id, name: c.name, doc: c.doc || "", phone: c.phone || "", whats: c.whats,
      address: c.address || "", notes: c.notes || "", lastVisit: c.last_visit,
      vehicles: (vehicleRows || []).filter((v) => v.client_id === c.id).map((v) => ({
        id: v.id, brand: v.brand || "", model: v.model || "", year: v.year || "", color: v.color || "",
        plate: v.plate || "", km: v.km || 0, notes: v.notes || "",
      })),
    }));
    prevRef.current = mapped;
    setClients(mapped);
    setReady(true);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel(`rt-clients-${COMPANY_ID}`).on("postgres_changes", { event: "*", schema: "public", table: "clients", filter: `company_id=eq.${COMPANY_ID}` }, fetchAll).subscribe();
    const ch2 = supabase.channel(`rt-vehicles-${COMPANY_ID}`).on("postgres_changes", { event: "*", schema: "public", table: "vehicles", filter: `company_id=eq.${COMPANY_ID}` }, fetchAll).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [fetchAll]);

  const setSynced = useCallback(async (updater) => {
    const prev = prevRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    setClients(next);
    prevRef.current = next;

    const prevIds = new Set(prev.map((c) => c.id));
    const nextIds = new Set(next.map((c) => c.id));

    await Promise.all(prev.filter((c) => !nextIds.has(c.id)).map((c) => supabase.from("clients").delete().eq("id", c.id)));

    for (const client of next) {
      const isNewClient = !prevIds.has(client.id);
      const prevClient = prev.find((p) => p.id === client.id);
      const clientRow = { name: client.name, doc: client.doc, phone: client.phone, whats: client.whats, address: client.address, notes: client.notes, last_visit: client.lastVisit || null };

      let realClientId = client.id;
      const clientChanged = isNewClient || JSON.stringify({ ...prevClient, vehicles: undefined }) !== JSON.stringify({ ...client, vehicles: undefined });

      if (isNewClient) {
        const { data: inserted, error } = await supabase.from("clients").insert({ ...clientRow, company_id: COMPANY_ID }).select().single();
        if (!error && inserted) realClientId = inserted.id;
      } else if (clientChanged) {
        await supabase.from("clients").update(clientRow).eq("id", client.id);
      }

      const prevVehicles = prevClient?.vehicles || [];
      const prevVIds = new Set(prevVehicles.map((v) => v.id));
      const nextVIds = new Set(client.vehicles.map((v) => v.id));
      await Promise.all(prevVehicles.filter((v) => !nextVIds.has(v.id)).map((v) => supabase.from("vehicles").delete().eq("id", v.id)));

      for (const v of client.vehicles) {
        const isNewV = !prevVIds.has(v.id);
        const prevV = prevVehicles.find((p) => p.id === v.id);
        const vChanged = isNewV || JSON.stringify(prevV) !== JSON.stringify(v);
        if (!vChanged) continue;
        const vRow = { brand: v.brand, model: v.model, year: v.year || null, color: v.color, plate: v.plate, km: v.km || 0, notes: v.notes };
        if (isNewV) {
          await supabase.from("vehicles").insert({ ...vRow, client_id: realClientId, company_id: COMPANY_ID });
        } else {
          await supabase.from("vehicles").update(vRow).eq("id", v.id);
        }
      }
    }
    if (next.some((c) => !prevIds.has(c.id))) fetchAll();
  }, [fetchAll]);

  return [clients, setSynced, ready];
}

export const ordersMap = {
  toJs: (o) => ({ id: o.id, code: o.code, clientId: o.client_id, clientName: o.client_name, vehicleLabel: o.vehicle_label, serviceName: o.service_name, items: o.items || [], value: Number(o.value), discount: Number(o.discount), tech: o.tech || "", techs: o.techs || [], notes: o.notes || "", status: o.status, createdAt: o.created_at }),
  toDb: (o) => ({ code: o.code, client_id: o.clientId || null, client_name: o.clientName, vehicle_label: o.vehicleLabel, service_name: o.serviceName, items: o.items || [], value: o.value, discount: o.discount, tech: o.tech, techs: o.techs || [], notes: o.notes, status: o.status, created_at: o.createdAt }),
};
export const appointmentsMap = {
  toJs: (a) => ({ id: a.id, clientName: a.client_name, service: a.service, serviceId: a.service_id, serviceIds: a.service_ids || [], techs: a.techs || [], recurrenceGroup: a.recurrence_group, time: a.time, date: a.date, status: a.status }),
  toDb: (a) => ({ client_name: a.clientName, service: a.service, service_id: a.serviceId || null, service_ids: a.serviceIds || [], techs: a.techs || [], recurrence_group: a.recurrenceGroup || null, time: a.time, date: a.date, status: a.status }),
};
export const servicesMap = {
  toJs: (s) => ({ id: s.id, name: s.name, time: s.time_estimate || "", price: Number(s.price), commission: Number(s.commission), type: s.type || "avulso" }),
  toDb: (s) => ({ name: s.name, time_estimate: s.time, price: s.price, commission: s.commission, type: s.type || "avulso" }),
};
export const productsMap = {
  toJs: (p) => ({ id: p.id, name: p.name, qty: p.qty, min: p.min_qty, unitCost: Number(p.unit_cost), supplier: p.supplier || "" }),
  toDb: (p) => ({ name: p.name, qty: p.qty, min_qty: p.min, unit_cost: p.unitCost, supplier: p.supplier }),
};
export const employeesMap = {
  toJs: (e) => ({ id: e.id, name: e.name, role: e.role || "", commission: Number(e.commission), goal: e.goal }),
  toDb: (e) => ({ name: e.name, role: e.role, commission: e.commission, goal: e.goal }),
};
export const financialMap = {
  toJs: (f) => ({ id: f.id, type: f.type, kind: f.kind, desc: f.description, value: Number(f.value), date: f.date, paid: f.paid, settledAmount: Number(f.settled_amount) || 0, party: f.party || "" }),
  toDb: (f) => ({ type: f.type, kind: f.kind, description: f.desc, value: f.value, date: f.date, paid: f.paid, settled_amount: f.settledAmount || 0, party: f.party || null }),
};
export const stockMovementsMap = {
  toJs: (m) => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, qty: Number(m.qty), unitCost: Number(m.unit_cost), totalCost: Number(m.total_cost), supplier: m.supplier || "", responsible: m.responsible || "", notes: m.notes || "", financialEntryId: m.financial_entry_id, createdAt: m.created_at }),
  toDb: (m) => ({ product_id: m.productId || null, product_name: m.productName, type: m.type, qty: m.qty, unit_cost: m.unitCost, total_cost: m.totalCost, supplier: m.supplier, responsible: m.responsible, notes: m.notes, financial_entry_id: m.financialEntryId || null, created_at: m.createdAt }),
};
