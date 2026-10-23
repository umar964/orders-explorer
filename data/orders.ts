export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderRegion =
  | "NORTH"
  | "SOUTH"
  | "EAST"
  | "WEST"
  | "CENTRAL"
  | "NORTHEAST";

export type Order = {
  id: string;
  customerName: string;
  email: string;
  product: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  paymentMethod: string;
  region: OrderRegion;
  channel: string;
  priority: "High" | "Normal" | "Low" | "None";
  orderDate: string;
  createdAtTimestamp: number;
  deliveryDate?: string;
  updatedAtTimestamp: number | null;
  notes: string;
  currency: string;
};

type RawOrder = {
  id: string;
  schemaVersion: number;
  customerName?: string;
  customer_name?: string;
  customerEmail?: string;
  status?: string;
  amount: number | string;
  currency?: string;
  createdAt: string | number;
  updatedAt?: string | null;
  region?: string;
  channel?: string;
  priority?: number;
  paymentMethod?: string;
  itemCount?: number;
  notes?: string | null;
};

import rawOrders from "./orders.json";

function parseDate(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    // Epoch seconds, not milliseconds.
    return value * 1000;
  }

  const dateOnlyMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (dateOnlyMatch) {
    const [, day, month, year] = dateOnlyMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  // Timestamps without a timezone are explicitly UTC in this dataset.
  const normalizedValue =
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !/(Z|[+-]\d{2}:\d{2})$/i.test(value)
      ? `${value}Z`
      : value;

  const timestamp = Date.parse(normalizedValue);

  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeStatus(value: string | undefined): OrderStatus {
  const normalized = (value ?? "").trim().toLowerCase();

  const validStatuses: OrderStatus[] = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  return validStatuses.includes(normalized as OrderStatus)
    ? (normalized as OrderStatus)
    : "pending";
}

function normalizeRegion(value: string | undefined): OrderRegion {
  const normalized = (value ?? "").trim().toUpperCase();

  const validRegions: OrderRegion[] = [
    "NORTH",
    "SOUTH",
    "EAST",
    "WEST",
    "CENTRAL",
    "NORTHEAST",
  ];

  return validRegions.includes(normalized as OrderRegion)
    ? (normalized as OrderRegion)
    : "CENTRAL";
}

function normalizeOrder(raw: RawOrder): Order {
  const createdAtTimestamp = parseDate(raw.createdAt) ?? 0;
  const updatedAtTimestamp = parseDate(raw.updatedAt);

  const amountValue = Number(raw.amount);
  const amount =
    Number.isFinite(amountValue) && raw.schemaVersion === 1
      ? amountValue / 100
      : Number.isFinite(amountValue)
        ? amountValue
        : 0;

  const priority =
    raw.priority === undefined
      ? "None"
      : raw.priority === 1
        ? "High"
        : raw.priority === 2
          ? "Normal"
          : raw.priority === 3
            ? "Low"
            : "None";

  return {
    id: raw.id,
    customerName: (raw.customerName ?? raw.customer_name ?? "").trim(),
    email: (raw.customerEmail ?? "").trim(),
    product: "—",
    quantity: raw.itemCount ?? 0,
    amount,
    status: normalizeStatus(raw.status),
    paymentMethod: (raw.paymentMethod ?? "").trim().toLowerCase(),
    region: normalizeRegion(raw.region),
    channel: (raw.channel ?? "").trim().toLowerCase(),
    priority,
    orderDate: new Date(createdAtTimestamp).toISOString(),
    createdAtTimestamp,
    deliveryDate: undefined,
    updatedAtTimestamp,
    notes: raw.notes ?? "",
    currency: (raw.currency ?? "INR").trim(),
  };
}

function deduplicateOrders(records: RawOrder[]): RawOrder[] {
  const selected = new Map<string, { order: RawOrder; index: number }>();

  records.forEach((order, index) => {
    const existing = selected.get(order.id);

    if (!existing) {
      selected.set(order.id, { order, index });
      return;
    }

    const currentUpdatedAt = parseDate(order.updatedAt);
    const existingUpdatedAt = parseDate(existing.order.updatedAt);

    const shouldReplace =
      currentUpdatedAt !== null && existingUpdatedAt === null
        ? true
        : currentUpdatedAt !== null && existingUpdatedAt !== null
          ? currentUpdatedAt > existingUpdatedAt
          : currentUpdatedAt === null &&
            existingUpdatedAt === null &&
            index > existing.index;

    if (shouldReplace) {
      selected.set(order.id, { order, index });
    }
  });

  return [...selected.values()]
    .sort((a, b) => a.index - b.index)
    .map(({ order }) => order);
}

const sourceOrders = rawOrders as RawOrder[];

export const orders: Order[] = deduplicateOrders(sourceOrders).map(normalizeOrder);

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const ORDER_REGIONS: OrderRegion[] = [
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "CENTRAL",
  "NORTHEAST",
];

export const ORDER_PRIORITIES = ["High", "Normal", "Low", "None"] as const;

export const formatOrderAmount = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const formatOrderDate = (timestamp: number | null): string =>
  timestamp === null
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(timestamp);