import { findOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return Response.json({ error: "Order ID is required." }, { status: 400 });
    }

    const order = await findOrder(orderId);

    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    // Return the tickets and notifications
    return Response.json({
      success: true,
      tickets: order.tickets || [],
      notifications: order.notifications || {},
    });
  } catch (error) {
    console.error("get-order failed", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
