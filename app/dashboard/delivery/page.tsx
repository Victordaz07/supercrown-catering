"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Phone,
  ChevronRight,
  Navigation,
  CheckCircle2,
  Truck,
  SkipForward,
  RefreshCw,
} from "lucide-react";

interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  eventDate: string;
  totalItems: number;
  status: string;
  items: Array<{ id: string; name: string; quantity: number }>;
}

interface RouteStop {
  id: string;
  routeId: string;
  orderId: string;
  order: OrderData;
  stopOrder: number;
  status: string;
  arrivedAt?: string;
  notes?: string;
}

interface DeliveryRoute {
  id: string;
  date: string;
  driverId: string;
  status: string;
  startAddress?: string;
  stops: RouteStop[];
}

function localDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function buildMultiStopUrl(stops: RouteStop[], startAddress?: string | null): string {
  if (stops.length === 0) return "";
  const addresses = stops.filter((s) => s.status !== "DELIVERED" && s.status !== "SKIPPED").map((s) => encodeURIComponent(s.order.deliveryAddress));
  if (addresses.length === 0) return "";
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

export default function DeliveryPage() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeekMonday(new Date());
      const weekEnd = addDays(weekStart, 6);
      const res = await fetch(
        `/api/routes?dateFrom=${localDateIso(weekStart)}&dateTo=${localDateIso(weekEnd)}`
      );
      if (res.ok) {
        const weeklyRoutes: DeliveryRoute[] = await res.json();
        setRoutes(weeklyRoutes);
      }
    } catch (e) {
      console.error("Failed to fetch route", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const updateStopStatus = async (routeId: string, stopId: string, status: string) => {
    setUpdating(stopId);
    try {
      const res = await fetch(`/api/routes/${routeId}/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchRoute();
    } catch (e) {
      console.error("Failed to update stop", e);
    } finally {
      setUpdating(null);
    }
  };

  const stopsForWeek = routes
    .flatMap((route) =>
      route.stops.map((stop) => ({
        ...stop,
        routeDate: route.date,
        routeStartAddress: route.startAddress ?? null,
      }))
    )
    .sort((a, b) => {
      const dateDiff = new Date(a.routeDate).getTime() - new Date(b.routeDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.stopOrder - b.stopOrder;
    });
  const totalStops = stopsForWeek.length;
  const completedStops = stopsForWeek.filter((s) => s.status === "DELIVERED" || s.status === "SKIPPED").length;
  const progressPct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
  const weekStart = startOfWeekMonday(new Date());
  const weekEnd = addDays(weekStart, 6);

  const statusColors: Record<string, string> = {
    PENDING: "border-gray-200 bg-white",
    EN_ROUTE: "border-blue-300 bg-blue-50",
    DELIVERED: "border-green-300 bg-green-50",
    SKIPPED: "border-red-200 bg-red-50",
  };

  const statusDot: Record<string, string> = {
    PENDING: "bg-gray-400",
    EN_ROUTE: "bg-blue-500",
    DELIVERED: "bg-green-500",
    SKIPPED: "bg-red-400",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl text-dark">This Week&apos;s Deliveries</h1>
        <button onClick={fetchRoute} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <p className="text-muted text-sm mb-6">
        {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
        {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading route...</div>
      ) : stopsForWeek.length === 0 ? (
        <div className="bg-warm border border-dashed border-stone rounded-lg p-12 text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-muted">No routes assigned for this week.</p>
          <p className="text-sm text-gray-400 mt-1">Contact your manager to get your route.</p>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Route Progress</span>
              <span className="text-sm text-gray-500">{completedStops} / {totalStops} stops</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#556B2F] h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs px-2 py-1 rounded-full bg-stone/20 text-muted">
                Weekly overview
              </span>
              {stopsForWeek.some((s) => s.status === "PENDING" || s.status === "EN_ROUTE") && (
                <a
                  href={buildMultiStopUrl(
                    stopsForWeek
                      .filter((s) => s.status === "PENDING" || s.status === "EN_ROUTE")
                      .map((s) => ({
                        ...s,
                        order: s.order,
                      })),
                    stopsForWeek[0]?.routeStartAddress
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-[#556B2F] text-white px-4 py-2 rounded-lg hover:bg-[#4a5d29] flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Start Route
                </a>
              )}
            </div>
          </div>

          {/* Stops */}
          <div className="space-y-3">
            {stopsForWeek.map((stop, idx) => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.order.deliveryAddress)}`;
              return (
                <div key={stop.id} className={`rounded-xl border-2 overflow-hidden shadow-sm transition-colors ${statusColors[stop.status]}`}>
                  {/* Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${stop.status === "DELIVERED" ? "bg-green-500" : stop.status === "SKIPPED" ? "bg-red-400" : stop.status === "EN_ROUTE" ? "bg-blue-500" : "bg-gray-400"}`}>
                          {stop.status === "DELIVERED" ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-dark">{stop.order.orderNumber}</span>
                          <span className={`w-2 h-2 rounded-full ${statusDot[stop.status]}`} />
                          <span className="text-xs text-gray-500">{stop.status}</span>
                        </div>
                        <p className="text-xs text-muted">
                          {new Date(stop.routeDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-dark">{stop.order.customerName}</p>
                        <p className="text-xs text-muted mt-0.5">{stop.order.totalItems} items</p>
                      </div>
                    </div>
                  </div>

                  {/* Address & Contact */}
                  <div className="border-t border-gray-200/50 p-4 bg-white/50">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone/30 hover:border-[#556B2F] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#556B2F]/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-[#556B2F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark truncate">{stop.order.deliveryAddress}</p>
                        <p className="text-xs text-[#556B2F]">Open in Google Maps</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted flex-shrink-0" />
                    </a>
                    {stop.order.customerPhone && (
                      <a href={`tel:${stop.order.customerPhone}`} className="flex items-center gap-2 mt-3 text-sm text-muted hover:text-[#556B2F]">
                        <Phone className="w-4 h-4" />
                        {stop.order.customerPhone}
                      </a>
                    )}
                  </div>

                  {/* Items */}
                  <details className="group">
                    <summary className="p-3 text-sm text-muted cursor-pointer list-none flex justify-between items-center hover:bg-white/50 border-t border-gray-200/50">
                      View items
                      <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-4 pb-3 pt-0">
                      <ul className="text-sm text-dark space-y-1">
                        {stop.order.items?.map((item) => (
                          <li key={item.id}>{item.name} × {item.quantity}</li>
                        ))}
                      </ul>
                    </div>
                  </details>

                  {/* Actions */}
                  {stop.status !== "DELIVERED" && stop.status !== "SKIPPED" && (
                    <div className="border-t border-gray-200/50 p-3 flex gap-2">
                      {stop.status === "PENDING" && (
                        <button
                          onClick={() => updateStopStatus(stop.routeId, stop.id, "EN_ROUTE")}
                          disabled={updating === stop.id}
                          className="flex-1 bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Navigation className="w-4 h-4" />
                          {updating === stop.id ? "Updating..." : "Mark En Route"}
                        </button>
                      )}
                      {stop.status === "EN_ROUTE" && (
                        <button
                          onClick={() => updateStopStatus(stop.routeId, stop.id, "DELIVERED")}
                          disabled={updating === stop.id}
                          className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {updating === stop.id ? "Updating..." : "Mark Delivered"}
                        </button>
                      )}
                      <button
                        onClick={() => updateStopStatus(stop.routeId, stop.id, "SKIPPED")}
                        disabled={updating === stop.id}
                        className="px-4 py-2.5 rounded-lg text-sm text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                      >
                        <SkipForward className="w-4 h-4" />
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
