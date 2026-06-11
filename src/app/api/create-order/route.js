import crypto from "node:crypto";
import { eventInfo, getTicketTier } from "@/lib/event";
import { savePendingOrder } from "@/lib/orders";

export const runtime = "nodejs";

function cleanText(value, fallback = "") {
  return String(value || fallback)
    .trim()
    .slice(0, 160);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^\+?[0-9\s-]{8,18}$/.test(value);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const ticket = getTicketTier(body.ticketId);
    const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 8);
    const customer = {
      name: cleanText(body.customer?.name),
      email: cleanText(body.customer?.email).toLowerCase(),
      phone: cleanText(body.customer?.phone),
    };

    if (!ticket) {
      return Response.json(
        { error: "Selected ticket is unavailable." },
        { status: 400 },
      );
    }

    if (
      !customer.name ||
      !isValidEmail(customer.email) ||
      !isValidPhone(customer.phone)
    ) {
      return Response.json(
        { error: "Enter a valid name, email, and phone number." },
        { status: 400 },
      );
    }

    const amountRupees = ticket.price * quantity;
    const amountPaise = amountRupees * 100;
    const txnid = `txn_${crypto.randomBytes(8).toString("hex")}`;
    const receipt = `syn_link_${Date.now()}`;

    await savePendingOrder({
      id: txnid,
      receipt,
      mode: "link",
      amount: amountPaise,
      currency: eventInfo.currency,
      ticketId: ticket.id,
      ticketName: ticket.name,
      entries: ticket.entries,
      quantity,
      customer,
    });

    return Response.json({
      orderId: txnid,
      amount: amountPaise,
      currency: eventInfo.currency,
      mode: "link",
      paymentLink: process.env.PAYMENT_LINK || "https://example.com/pay-here",
      ticket: {
        id: ticket.id,
        name: ticket.name,
        price: ticket.price,
      },
      quantity,
    });
  } catch (error) {
    console.error("create-order failed", error);
    return Response.json(
      { error: "Could not create the payment order." },
      { status: 500 },
    );
  }
}
