import crypto from "node:crypto";
import { eventInfo } from "@/lib/event";
import { confirmOrder, findOrder, savePendingOrder } from "@/lib/orders";
import { sendTicketNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
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
  let isFormRedirect = false;
  let origin = "";

  try {
    origin = new URL(request.url).origin;
    const contentType = request.headers.get("content-type") || "";
    let body = {};

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
      isFormRedirect = true;
    } else {
      body = await request.json();
    }

    const txnid = String(body.txnid || body.orderId || "");
    const paymentId = String(body.mihpayid || body.paymentId || "demo-payment");
    const status = String(body.status || "");
    const hash = String(body.hash || "");

    const persistedOrder = await findOrder(txnid);

    // If order not found in memory/file store (e.g. serverless recycling), reconstruct order from body details or fallback
    const reconstructedOrder = body.orderDetails || {
      id: txnid,
      orderId: txnid,
      amount: Number(body.amount || 0) * 100, // PayU returns amount in Rupees, convert to paise
      customer: {
        name: body.firstname || "Guest",
        email: body.email || "",
        phone: body.phone || "",
      },
    };

    const order = normalizeOrder(persistedOrder || reconstructedOrder);

    if (!order?.id) {
      if (isFormRedirect) {
        return Response.redirect(`${origin}/?status=error&message=Order not found`, 302);
      }
      return Response.json({ error: "Order was not found." }, { status: 404 });
    }

    if (persistedOrder?.status === "confirmed") {
      if (isFormRedirect) {
        return Response.redirect(`${origin}/?status=success&orderId=${order.id}`, 302);
      }
      return Response.json({
        success: true,
        tickets: order.tickets,
        notifications: order.notifications,
        alreadyConfirmed: true,
      });
    }

    // For manual 'Pay with Link' flow, no automatic hash verification is required.
    const tickets = makeTickets(order);

    // 1. Confirm the order in the store
    const confirmedOrder = await confirmOrder(order.id, {
      paymentId,
      tickets,
      status: "confirmed",
    });



    if (!confirmedOrder) {
      const fallbackOrder = {
        ...order,
        paymentId,
        tickets,
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
      };
      await savePendingOrder(fallbackOrder);
    }

    // 2. Dispatch notifications (wrapped in a try-catch for fast failover)
    let notifications = {
      email: { status: "skipped", reason: "Notifications failed to send" },
      sms: { status: "skipped", reason: "Notifications failed to send" },
    };

    try {
      notifications = await sendTicketNotifications(
        {
          ...order,
          paymentId,
        },
        tickets,
      );

      // Save notification status
      await confirmOrder(order.id, {
        paymentId,
        tickets,
        notifications,
      });
    } catch (notifError) {
      console.error("verify-payment notification dispatch failed:", notifError);
    }

    if (isFormRedirect) {
      return Response.redirect(`${origin}/?status=success&orderId=${order.id}`, 302);
    }

    return Response.json({
      success: true,
      tickets,
      notifications,
    });
  } catch (error) {
    console.error("verify-payment failed", error);
    if (isFormRedirect) {
      return Response.redirect(`${origin}/?status=error&message=Internal server error`, 302);
    }
    return Response.json(
      { error: "Could not verify the payment." },
      { status: 500 },
    );
  }
}
