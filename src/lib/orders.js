import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
const storePath = path.join(dataDirectory, "orders.json");
const memoryStore =
  globalThis.__ghostmgmOrdersStore ||
  (globalThis.__ghostmgmOrdersStore = { orders: [] });

function useMemoryStore() {
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
}

async function readStore() {
  if (useMemoryStore()) {
    return { orders: [...memoryStore.orders] };
  }

  await mkdir(dataDirectory, { recursive: true });

  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    const initialStore = { orders: [] };
    await writeStore(initialStore);
    return initialStore;
  }
}

async function writeStore(store) {
  if (useMemoryStore()) {
    memoryStore.orders = Array.isArray(store.orders) ? [...store.orders] : [];
    return;
  }

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function savePendingOrder(order) {
  const store = await readStore();
  const orders = store.orders.filter((item) => item.id !== order.id);

  orders.push({
    ...order,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  await writeStore({ ...store, orders });
}

export async function findOrder(orderId) {
  const store = await readStore();
  return store.orders.find((order) => order.id === orderId);
}

export async function confirmOrder(orderId, confirmation) {
  const store = await readStore();
  const orderIndex = store.orders.findIndex((order) => order.id === orderId);

  if (orderIndex === -1) {
    return null;
  }

  const confirmedOrder = {
    ...store.orders[orderIndex],
    ...confirmation,
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  };

  store.orders[orderIndex] = confirmedOrder;
  await writeStore(store);

  return confirmedOrder;
}
