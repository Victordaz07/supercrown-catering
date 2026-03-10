"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Truck } from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { onAuthChange } from "@/lib/firebase/auth";
import { ConfirmDeliveryModal } from "@/components/driver/ConfirmDeliveryModal";

type DeliveryItem = { productName: string; quantity: number };
type Delivery = {
  id: string;
  orderId: string;
  deliveryDate: string;
  scheduledTime: string | null;
  status: string;
  clientName?: string;
  deliveryAddress?: string;
  items: DeliveryItem[];
};

export default function DriverPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<Delivery | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthChange(async (user) => {
      if (!user) return;
      setUserId(user.uid);
      setUserName(user.displayName || user.email || "Driver");
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const q = query(
      collection(db, "deliveries"),
      where("driverId", "==", userId),
      where("deliveryDate", "==", today)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list: Delivery[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        let clientName = "";
        let deliveryAddress = "";
        const items: DeliveryItem[] = [];

        if (data.orderId) {
          const orderSnap = await getDoc(doc(db, "orders", data.orderId));
          if (orderSnap.exists()) {
            const o = orderSnap.data()!;
            clientName = o.clientName || o.clientEmail || "";
            deliveryAddress = o.deliveryAddress || "";
            const quoteId = o.quoteId;
            if (quoteId) {
              const itemsSnap = await getDocs(
                collection(db, "quotes", quoteId, "items")
              );
              itemsSnap.docs.forEach((i) => {
                const idata = i.data();
                items.push({
                  productName: idata.productName || "Item",
                  quantity: idata.quantity || 1,
                });
              });
            }
          }
        }

        list.push({
          id: d.id,
          orderId: data.orderId,
          deliveryDate: data.deliveryDate,
          scheduledTime: data.scheduledTime ?? null,
          status: data.status ?? "pending",
          clientName,
          deliveryAddress,
          items,
        });
      }
      list.sort((a, b) => {
        const tA = a.scheduledTime || "23:59";
        const tB = b.scheduledTime || "23:59";
        return tA.localeCompare(tB);
      });
      setDeliveries(list);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-cream">
      <div className="p-4 pb-24">
        <h1 className="font-display text-2xl text-dark">
          {greeting}, {userName}
        </h1>
        <p className="text-muted text-sm mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p className="text-muted text-sm mt-1">{deliveries.length} deliveries today</p>

        {deliveries.length === 0 ? (
          <div className="mt-12 text-center py-12 bg-warm border border-stone/40 rounded-sm">
            <Truck className="w-12 h-12 text-stone mx-auto mb-3" />
            <p className="font-display text-dark">No deliveries scheduled for today</p>
            <p className="text-muted text-sm mt-1">Check back later</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {deliveries.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-stone/40 rounded-sm shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      d.status === "delivered"
                        ? "bg-olive/30 text-olive"
                        : d.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-stone/30 text-muted"
                    }`}
                  >
                    {d.status}
                  </span>
                  {d.scheduledTime && (
                    <span className="text-sm text-muted">{d.scheduledTime}</span>
                  )}
                </div>

                <p className="font-display text-lg text-dark mt-2">{d.clientName || "—"}</p>
                <p className="text-sm text-muted">{d.deliveryAddress || "—"}</p>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expandedId === d.id ? null : d.id)
                    }
                    className="flex items-center gap-1 text-muted text-sm hover:text-dark"
                  >
                    {d.items.length} items
                    {expandedId === d.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {expandedId === d.id && (
                    <ul className="mt-2 pl-4 space-y-1 text-sm text-muted">
                      {d.items.map((item, i) => (
                        <li key={i}>
                          {item.productName} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {d.deliveryAddress && (
                    <>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.deliveryAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone rounded-sm text-sm hover:bg-stone/10"
                      >
                        <MapPin className="w-4 h-4" />
                        Google Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?q=${encodeURIComponent(d.deliveryAddress)}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone rounded-sm text-sm hover:bg-stone/10"
                      >
                        <MapPin className="w-4 h-4" />
                        Waze
                      </a>
                    </>
                  )}
                </div>

                {d.status !== "delivered" && (
                  <button
                    onClick={() => setConfirmModal(d)}
                    className="w-full mt-4 py-3 bg-terracotta text-cream font-medium rounded-sm hover:bg-terracotta/90"
                  >
                    Confirm Delivery
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal && (
        <ConfirmDeliveryModal
          deliveryId={confirmModal.id}
          clientName={confirmModal.clientName || "Client"}
          onClose={() => setConfirmModal(null)}
          onSuccess={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
