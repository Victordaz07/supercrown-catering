import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  title: { fontSize: 24, marginBottom: 20 },
  row: { flexDirection: "row", marginBottom: 8 },
  label: { width: 150, fontSize: 10, color: "#666" },
  value: { flex: 1, fontSize: 10 },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f0f0", padding: 8 },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});

type OrderItem = { id: string; name: string; category: string; quantity: number };

export function InvoicePDF({
  invoiceNumber,
  orderNumber,
  customerName,
  customerEmail,
  deliveryAddress,
  eventDate,
  items,
  totalItems,
}: {
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  eventDate: Date;
  items: OrderItem[];
  totalItems: number;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>INVOICE {invoiceNumber}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Order:</Text>
          <Text style={styles.value}>{orderNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Customer:</Text>
          <Text style={styles.value}>{customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{customerEmail}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Delivery:</Text>
          <Text style={styles.value}>{deliveryAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{eventDate.toLocaleDateString()}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.value, { width: 200 }]}>Item</Text>
            <Text style={[styles.value, { width: 100 }]}>Category</Text>
            <Text style={[styles.value, { width: 80 }]}>Qty</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.value, { width: 200 }]}>{item.name}</Text>
              <Text style={[styles.value, { width: 100 }]}>{item.category}</Text>
              <Text style={[styles.value, { width: 80 }]}>{item.quantity}</Text>
            </View>
          ))}
        </View>
        <Text style={{ marginTop: 20, fontSize: 10 }}>Total items: {totalItems}</Text>
        <Text style={{ marginTop: 40, fontSize: 10, color: "#999" }}>
          Super Crown Catering — Thank you for your order
        </Text>
      </Page>
    </Document>
  );
}
