import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireMasterAdminSales } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type AddItemInput = {
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice?: number;
};

type UpdateItemInput = {
  id: string;
  quantity?: number;
  unitPrice?: number;
};

type PatchBody = {
  status?: string;
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  eventDate?: string;
  guestCount?: number;
  eventDetails?: string;
  addItems?: AddItemInput[];
  removeItems?: string[];
  updateItems?: UpdateItemInput[];
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  couponId?: string;
};

const ORDER_FIELD_MAP: Record<string, string> = {
  customerName: "clientName",
  customerEmail: "clientEmail",
  eventDate: "deliveryDate",
};

async function getOrderWithItems(orderId: string) {
  const orderRef = adminDb.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return null;

  const itemsSnap = await orderRef.collection("items").get();
  const items = itemsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      itemId: data.itemId ?? data.productId ?? "",
      name: data.name ?? data.productName ?? "",
      category: data.category ?? "",
      quantity: data.quantity ?? 1,
      unitPrice: data.unitPrice ?? 0,
      subtotal: data.subtotal ?? (data.unitPrice ?? 0) * (data.quantity ?? 1),
    };
  });

  const orderData = orderSnap.data()!;
  const createdAt = orderData.createdAt?.toDate?.();
  const updatedAt = orderData.updatedAt?.toDate?.();

  return {
    id: orderSnap.id,
    ...orderData,
    createdAt,
    updatedAt,
    items,
  };
}

/** GET /api/orders/[id] - Get order with items (MASTER/ADMIN/SALES) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMasterAdminSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const order = await getOrderWithItems(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    console.error("GET /api/orders/[id]:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

/** PATCH /api/orders/[id] - Full order editing (MASTER/ADMIN/SALES) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let sessionUser;
  try {
    sessionUser = await requireMasterAdminSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: orderId } = await params;
    const body = (await request.json()) as PatchBody;

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;
    const orderUpdates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    const directFields = [
      "status",
      "notes",
      "customerName",
      "customerEmail",
      "customerPhone",
      "deliveryAddress",
      "eventDate",
      "guestCount",
      "eventDetails",
      "discountType",
      "discountValue",
      "discountAmount",
      "couponId",
    ] as const;

    for (const key of directFields) {
      const val = body[key];
      if (val === undefined) continue;

      const firestoreKey = ORDER_FIELD_MAP[key] ?? key;
      const oldVal = orderData[firestoreKey] ?? orderData[key];
      const newVal = typeof val === "number" ? val : String(val);

      if (oldVal !== newVal) {
        orderUpdates[firestoreKey] = newVal;
        await logAudit({
          entity: "Order",
          entityId: orderId,
          action: "UPDATE",
          userId: sessionUser.uid,
          userEmail: sessionUser.email,
          oldValue: oldVal,
          newValue: newVal,
          field: firestoreKey,
        });
      }
    }

    const itemsRef = orderRef.collection("items");

    if (Array.isArray(body.removeItems) && body.removeItems.length > 0) {
      const existingSnap = await itemsRef.get();
      const existingIds = new Set(existingSnap.docs.map((d) => d.id));

      for (const itemId of body.removeItems) {
        if (!existingIds.has(itemId)) {
          return NextResponse.json(
            { error: `OrderItem ${itemId} does not belong to this order` },
            { status: 400 }
          );
        }

        const itemDoc = await itemsRef.doc(itemId).get();
        if (itemDoc.exists) {
          const itemData = itemDoc.data()!;
          await logAudit({
            entity: "OrderItem",
            entityId: itemId,
            action: "DELETE",
            userId: sessionUser.uid,
            userEmail: sessionUser.email,
            oldValue: itemData,
            newValue: null,
          });
          await itemsRef.doc(itemId).delete();
        }
      }
    }

    if (Array.isArray(body.updateItems) && body.updateItems.length > 0) {
      const existingSnap = await itemsRef.get();
      const existingIds = new Set(existingSnap.docs.map((d) => d.id));

      for (const upd of body.updateItems) {
        if (!existingIds.has(upd.id)) {
          return NextResponse.json(
            { error: `OrderItem ${upd.id} does not belong to this order` },
            { status: 400 }
          );
        }

        const itemRef = itemsRef.doc(upd.id);
        const itemSnap = await itemRef.get();
        if (!itemSnap.exists) continue;

        const itemData = itemSnap.data()!;
        const itemUpdates: Record<string, unknown> = {};

        if (upd.quantity !== undefined) {
          const oldQty = itemData.quantity ?? 1;
          itemUpdates.quantity = upd.quantity;
          await logAudit({
            entity: "OrderItem",
            entityId: upd.id,
            action: "UPDATE",
            userId: sessionUser.uid,
            userEmail: sessionUser.email,
            oldValue: { quantity: oldQty },
            newValue: { quantity: upd.quantity },
            field: "quantity",
          });
        }
        if (upd.unitPrice !== undefined) {
          itemUpdates.unitPrice = upd.unitPrice;
          const qty = (itemUpdates.quantity ?? itemData.quantity ?? 1) as number;
          itemUpdates.subtotal = upd.unitPrice * qty;
          await logAudit({
            entity: "OrderItem",
            entityId: upd.id,
            action: "UPDATE",
            userId: sessionUser.uid,
            userEmail: sessionUser.email,
            oldValue: { unitPrice: itemData.unitPrice },
            newValue: { unitPrice: upd.unitPrice },
            field: "unitPrice",
          });
        }

        if (Object.keys(itemUpdates).length > 0) {
          await itemRef.update(itemUpdates);
        }
      }
    }

    if (Array.isArray(body.addItems) && body.addItems.length > 0) {
      for (const item of body.addItems) {
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const unitPrice = Number(item.unitPrice) || 0;
        const subtotal = unitPrice * quantity;

        const newItemRef = itemsRef.doc();
        const newItem = {
          itemId: item.itemId ?? "",
          name: item.name ?? "",
          category: item.category ?? "",
          quantity,
          unitPrice,
          subtotal,
          productId: item.itemId ?? "",
          productName: item.name ?? "",
        };

        await newItemRef.set(newItem);

        await logAudit({
          entity: "OrderItem",
          entityId: newItemRef.id,
          action: "CREATE",
          userId: sessionUser.uid,
          userEmail: sessionUser.email,
          oldValue: null,
          newValue: newItem,
        });
      }
    }

    if (
      body.removeItems?.length ||
      body.updateItems?.length ||
      body.addItems?.length
    ) {
      const itemsSnap = await itemsRef.get();
      const totalItems = itemsSnap.docs.reduce(
        (sum, d) => sum + ((d.data().quantity as number) ?? 1),
        0
      );
      orderUpdates.totalItems = totalItems;
    }

    if (Object.keys(orderUpdates).length > 1) {
      await orderRef.update(orderUpdates);
    }

    const updatedOrder = await getOrderWithItems(orderId);
    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error("PATCH /api/orders/[id]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update order" },
      { status: 500 }
    );
  }
}
