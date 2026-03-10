"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export function QuoteBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "quotes"), where("status", "==", "pending")),
      (snap) => setCount(snap.size)
    );
    return () => unsub();
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-auto bg-terracotta/80 text-cream text-xs font-medium px-1.5 py-0.5 rounded min-w-[1.25rem] text-center">
      {count}
    </span>
  );
}
