"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  ExternalLink,
  Truck,
  Navigation,
  RefreshCw,
  Clock,
  Check,
  X,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phone?: string;
}

interface OrderStop {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  eventDate: string;
  totalItems: number;
  status: string;
}

interface RouteStop {
  id: string;
  routeId: string;
  orderId: string;
  order: OrderStop;
  stopOrder: number;
  status: string;
  arrivedAt?: string;
  notes?: string;
}

interface DeliveryRoute {
  id: string;
  date: string;
  driverId: string;
  driver: Driver;
  status: string;
  notes?: string;
  startAddress?: string;
  stops: RouteStop[];
}

interface UnassignedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  eventDate: string;
  totalItems: number;
  status: string;
  driverId?: string | null;
}

function localDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMultiStopUrl(stops: RouteStop[], startAddress?: string | null): string {
  if (stops.length === 0) return "";
  const addresses = stops.map((s) => encodeURIComponent(s.order.deliveryAddress));
  if (startAddress) {
    const origin = encodeURIComponent(startAddress);
    const dest = addresses[addresses.length - 1];
    const wps = addresses.slice(0, -1);
    return `https://www.google.com/maps/dir/${origin}/${wps.join("/")}${wps.length ? "/" : ""}${dest}`;
  }
  if (addresses.length === 1) return `https://www.google.com/maps/search/?api=1&query=${addresses[0]}`;
  const origin = addresses[0];
  const dest = addresses[addresses.length - 1];
  const wps = addresses.slice(1, -1);
  return `https://www.google.com/maps/dir/${origin}/${wps.join("/")}${wps.length ? "/" : ""}${dest}`;
}

export default function RoutesPage() {
  const [date, setDate] = useState(() => localDateIso(new Date()));
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, routesRes, ordersRes] = await Promise.all([
        fetch("/api/users?role=DELIVERY"),
        fetch(`/api/routes?date=${date}`),
        fetch(`/api/orders?status=READY&date=${date}`),
      ]);

      if (driversRes.ok) {
        const d = await driversRes.json();
        setDrivers(Array.isArray(d) ? d : d.users || []);
      }

      if (routesRes.ok) {
        const r = await routesRes.json();
        setRoutes(r);
      }

      if (ordersRes.ok) {
        const allOrders: UnassignedOrder[] = await ordersRes.json();
        const assignedOrderIds = new Set<string>();
        routes.forEach((r) => r.stops.forEach((s) => assignedOrderIds.add(s.orderId)));
        setUnassigned(allOrders.filter((o) => !o.driverId && !assignedOrderIds.has(o.id)));
      }
    } catch (e) {
      console.error("Failed to fetch route data", e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (routes.length > 0) {
      const assignedIds = new Set<string>();
      routes.forEach((r) => r.stops.forEach((s) => assignedIds.add(s.orderId)));
      setUnassigned((prev) => prev.filter((o) => !assignedIds.has(o.id)));
    }
  }, [routes]);

  const assignToDriver = async (orderId: string, driverId: string) => {
    const existingRoute = routes.find((r) => r.driverId === driverId);
    if (existingRoute) {
      const maxOrder = existingRoute.stops.length > 0 ? Math.max(...existingRoute.stops.map((s) => s.stopOrder)) : -1;
      const res = await fetch(`/api/routes/${existingRoute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addStops: [{ orderId, stopOrder: maxOrder + 1 }] }),
      });
      if (res.ok) fetchData();
    } else {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, date, stops: [{ orderId, stopOrder: 0 }] }),
      });
      if (res.ok) fetchData();
    }
    setAssigning(null);
    setSelectedDriver("");
  };

  const removeStop = async (routeId: string, stopId: string) => {
    const res = await fetch(`/api/routes/${routeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeStops: [stopId] }),
    });
    if (res.ok) fetchData();
  };

  const moveStop = async (routeId: string, stops: RouteStop[], index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= stops.length) return;
    const reorder = stops.map((s, i) => {
      if (i === index) return { id: s.id, stopOrder: stops[newIndex].stopOrder };
      if (i === newIndex) return { id: s.id, stopOrder: stops[index].stopOrder };
      return { id: s.id, stopOrder: s.stopOrder };
    });
    const res = await fetch(`/api/routes/${routeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorderStops: reorder }),
    });
    if (res.ok) fetchData();
  };

  const deleteRoute = async (routeId: string) => {
    if (!confirm("Delete this route? All stops will be unassigned.")) return;
    const res = await fetch(`/api/routes/${routeId}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const createRouteForDriver = async (driverId: string) => {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, date, stops: [] }),
    });
    if (res.ok) fetchData();
  };

  const stopStatusColor: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    EN_ROUTE: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-green-100 text-green-700",
    SKIPPED: "bg-red-100 text-red-700",
  };

  const routeStatusBadge: Record<string, string> = {
    PLANNED: "bg-amber-100 text-amber-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#2C2C2C]">Route Management</h1>
          <p className="text-sm text-gray-500 mt-1">Assign orders to drivers and manage delivery routes</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={fetchData} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unassigned Orders */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-[#2C2C2C] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Unassigned Orders ({unassigned.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {unassigned.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">All orders assigned</div>
                ) : (
                  unassigned.map((order) => (
                    <div key={order.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{order.customerName}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {order.deliveryAddress}
                          </p>
                          <p className="text-xs text-gray-400">{order.totalItems} items</p>
                        </div>
                        {assigning === order.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={selectedDriver}
                              onChange={(e) => setSelectedDriver(e.target.value)}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="">Driver...</option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <button
                              disabled={!selectedDriver}
                              onClick={() => assignToDriver(order.id, selectedDriver)}
                              className="text-xs bg-[#556B2F] text-white px-2 py-1 rounded disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setAssigning(null); setSelectedDriver(""); }} className="text-xs text-gray-400 px-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigning(order.id)}
                            className="text-xs bg-[#556B2F] text-white px-3 py-1.5 rounded-lg hover:bg-[#4a5d29] flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Assign
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Driver Routes */}
          <div className="lg:col-span-2 space-y-6">
            {routes.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No routes for this date</p>
                <p className="text-sm text-gray-400 mt-1">Assign orders to drivers or create a new route below</p>
              </div>
            )}

            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#556B2F] text-white flex items-center justify-center font-bold text-sm">
                      {route.driver.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#2C2C2C]">{route.driver.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${routeStatusBadge[route.status] || "bg-gray-100"}`}>
                          {route.status}
                        </span>
                        <span className="text-xs text-gray-400">{route.stops.length} stops</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {route.stops.length > 0 && (
                      <a
                        href={buildMultiStopUrl(route.stops, route.startAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" /> Open Route
                      </a>
                    )}
                    <button
                      onClick={() => deleteRoute(route.id)}
                      className="text-xs text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {route.stops.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">No stops yet — assign orders from the left panel</div>
                  ) : (
                    route.stops.map((stop, idx) => (
                      <div key={stop.id} className="p-4 flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <div className="w-6 h-6 rounded-full bg-[#556B2F] text-white flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          {idx < route.stops.length - 1 && <div className="w-0.5 h-6 bg-gray-200" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{stop.order.orderNumber}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${stopStatusColor[stop.status] || "bg-gray-100"}`}>
                              {stop.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{stop.order.customerName}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{stop.order.deliveryAddress}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.order.deliveryAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                            title="Open in Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => moveStop(route.id, route.stops, idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveStop(route.id, route.stops, idx, 1)}
                            disabled={idx === route.stops.length - 1}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeStop(route.id, stop.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {/* Create Route for New Driver */}
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-3">Create Route for a Driver</h3>
              <div className="flex items-center gap-3">
                <select
                  id="new-route-driver"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  defaultValue=""
                >
                  <option value="" disabled>Select a driver...</option>
                  {drivers
                    .filter((d) => !routes.some((r) => r.driverId === d.id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    const sel = document.getElementById("new-route-driver") as HTMLSelectElement;
                    if (sel?.value) createRouteForDriver(sel.value);
                  }}
                  className="bg-[#556B2F] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a5d29] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Route
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
