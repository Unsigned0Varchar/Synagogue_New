import crypto from "node:crypto";
import { eventInfo, getTicketTier } from "@/lib/event";
import { confirmOrder } from "@/lib/orders";
import { sendTicketNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

function verifySignature(bodyText, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(bodyText);
  const expectedSignature = hmac.digest("hex");
  return expectedSignature === signature;
}

function normalizeOrder(order) {
  const resolvedTicket = order?.ticket || {};

  return {
    ...order,
    id: order?.id || order?.orderId || "",
    orderId: order?.orderId || order?.id || "",
    quantity: Number(order?.quantity || resolvedTicket?.quantity || 1),
    entries: Number(order?.entries || resolvedTicket?.entries || 1),
    ticketName:
      order?.ticketName ||
      resolvedTicket?.name ||
      order?.ticket?.ticketName ||
      "Ticket",
    customer: order?.customer || {},
    amount: Number(order?.amount || 0),
  };
}

function makeTickets(order) {
  const normalizedOrder = normalizeOrder(order);
  const ticketCount = normalizedOrder.quantity * (normalizedOrder.entries || 1);

  return Array.from({ length: ticketCount }, (_, index) => ({
    code: `SYN-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
    holder: normalizedOrder.customer?.name || "Guest",
    event: eventInfo.name,
    pass: normalizedOrder.ticketName,
  }));
}

export async function POST(request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret) {
      if (!signature || !verifySignature(bodyText, signature, secret)) {
        console.error("Razorpay webhook signature verification failed");
        return Response.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      console.warn("RAZORPAY_WEBHOOK_SECRET is not configured. Webhook signature check skipped.");
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;

    // Handle payment.captured event
    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const paymentId = payment.id;
      const email = payment.email || "";
      const phone = payment.contact || "";
      const amount = payment.amount; // in paise
      const notes = payment.notes || {};

      // Determine customer name from notes or fallback
      const name = notes.name || notes.Name || notes.customer_name || "Guest";
      const customer = { name, email, phone };

      // Determine the correct ticket tier based on payment button ID or payment amount
      const buttonId = notes.payment_button_id || "";
      
      let ticketTierId = "phase-one";
      
      if (buttonId === "pl_T0ML7d5gz0Wire") {
        ticketTierId = "executive-pass";
      } else if (buttonId === "pl_T0MNhMVBZQaRrU") {
        ticketTierId = "duo-pass";
      } else if (buttonId === "pl_T0MPeUHtjxCHUO" || buttonId === "pl_T0Jucz4a1gduAY") {
        ticketTierId = "phase-one";
      } else if (buttonId === "pl_T0JVtpF6YX3eqO") {
        // Fallback for old shared button ID based on amount
        const amountRupees = amount / 100;
        if (Math.abs(amountRupees - 899) < 10) {
          ticketTierId = "duo-pass";
        } else {
          ticketTierId = "executive-pass";
        }
      } else {
        // Fallback to price amount if buttonId is not in notes
        const amountRupees = amount / 100;
        if (Math.abs(amountRupees - 699) < 10) {
          ticketTierId = "executive-pass";
        } else if (Math.abs(amountRupees - 899) < 10) {
          ticketTierId = "duo-pass";
        }
      }

      const ticketTier = getTicketTier(ticketTierId) || {
        id: "phase-one",
        name: "YOKAI- Phase One",
        price: 1,
        entries: 1,
      };

      // Compute quantity based on payment amount and ticket price
      let ticketPricePaise = ticketTier.price * 100;
      // Defensive check: if the ticket config price is set to ₹1 but the customer paid standard amounts (e.g. ₹699),
      // we match the ticketPricePaise to the amount paid to prevent issuing hundreds of tickets.
      if (ticketTier.price === 1 && amount > 100) {
        ticketPricePaise = amount;
      }
      const quantity = Math.max(1, Math.round(amount / ticketPricePaise));

      const orderId = `txn_${paymentId}`;

      const order = {
        id: orderId,
        orderId,
        receipt: `syn_razorpay_${paymentId}`,
        mode: "razorpay_button",
        amount,
        currency: payment.currency || "INR",
        ticketId: ticketTier.id,
        ticketName: ticketTier.name,
        entries: ticketTier.entries,
        quantity,
        customer,
      };

      const tickets = makeTickets(order);

      // 1. Confirm the order in the local/file store
      await confirmOrder(orderId, {
        paymentId,
        tickets,
        status: "confirmed",
        customer,
        ticketId: ticketTier.id,
        ticketName: ticketTier.name,
        entries: ticketTier.entries,
        quantity,
        amount,
      });



      // 3. Dispatch notifications (automatic email and text message)
      try {
        await sendTicketNotifications(
          {
            ...order,
            paymentId,
          },
          tickets
        );
        console.log(`Razorpay webhook successfully dispatched tickets for payment: ${paymentId}`);
      } catch (notifError) {
        console.error("Notifications dispatch failed in Razorpay webhook:", notifError);
      }

      return Response.json({ success: true });
    }

    return Response.json({ status: "ignored" });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
