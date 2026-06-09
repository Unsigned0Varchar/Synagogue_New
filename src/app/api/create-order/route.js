import crypto from "node:crypto";
import Razorpay from "razorpay";
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

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const amount = ticket.price * quantity * 100;
    const hasGatewayKeys = Boolean(keyId && keySecret);
    let razorpayOrderId;
    let receipt;

    if (hasGatewayKeys) {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const order = await razorpay.orders.create({
        amount,
        currency: eventInfo.currency,
        receipt: `syn_${Date.now()}`,
        notes: {
          event: eventInfo.name,
          ticketId: ticket.id,
          ticketName: ticket.name,
          quantity: String(quantity),
          customerEmail: customer.email,
        },
      });

      razorpayOrderId = order.id;
      receipt = order.receipt;
    } else {
      razorpayOrderId = `order_demo_${crypto.randomBytes(8).toString("hex")}`;
      receipt = `syn_demo_${Date.now()}`;
    }

    await savePendingOrder({
      id: razorpayOrderId,
      receipt,
      mode: hasGatewayKeys ? "razorpay" : "demo",
      amount,
      currency: eventInfo.currency,
      ticketId: ticket.id,
      ticketName: ticket.name,
      entries: ticket.entries,
      quantity,
      customer,
    });

    return Response.json({
      orderId: razorpayOrderId,
      amount,
      currency: eventInfo.currency,
      keyId: keyId || "",
      mode: hasGatewayKeys ? "razorpay" : "demo",
      demo: !hasGatewayKeys,
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
