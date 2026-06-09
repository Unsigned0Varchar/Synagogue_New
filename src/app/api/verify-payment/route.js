import crypto from "node:crypto";
import { eventInfo } from "@/lib/event";
import { confirmOrder, findOrder } from "@/lib/orders";
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

function makeTickets(order) {
  const ticketCount = order.quantity * (order.entries || 1);

  return Array.from({ length: ticketCount }, (_, index) => ({
    code: `SYN-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
    holder: order.customer.name,
    event: eventInfo.name,
    pass: order.ticketName,
  }));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const orderId = String(body.orderId || body.razorpay_order_id || "");
    const paymentId = String(body.paymentId || body.razorpay_payment_id || "");
    const signature = String(body.signature || body.razorpay_signature || "");
    const order = await findOrder(orderId);

    if (!order) {
      return Response.json({ error: "Order was not found." }, { status: 404 });
    }

    if (order.status === "confirmed") {
      return Response.json({
        success: true,
        tickets: order.tickets,
        notifications: order.notifications,
        alreadyConfirmed: true,
      });
    }

    if (order.mode === "razorpay") {
      if (!process.env.RAZORPAY_KEY_SECRET) {
        return Response.json({ error: "Razorpay secret is not configured." }, { status: 500 });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${order.id}|${paymentId}`)
        .digest("hex");

      if (!paymentId || !signature || !secureCompare(expectedSignature, signature)) {
        return Response.json({ error: "Payment signature verification failed." }, { status: 400 });
      }
    } else if (!body.demo) {
      return Response.json({ error: "Demo confirmation was not requested." }, { status: 400 });
    }

    const tickets = makeTickets(order);
    const notifications = await sendTicketNotifications(
      {
        ...order,
        paymentId: paymentId || "demo-payment",
      },
      tickets,
    );

    await confirmOrder(order.id, {
      paymentId: paymentId || "demo-payment",
      tickets,
      notifications,
    });

    return Response.json({
      success: true,
      tickets,
      notifications,
    });
  } catch (error) {
    console.error("verify-payment failed", error);
    return Response.json({ error: "Could not verify the payment." }, { status: 500 });
  }
}
