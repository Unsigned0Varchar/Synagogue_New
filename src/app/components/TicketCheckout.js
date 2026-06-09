"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Mail,
  Minus,
  Phone,
  Plus,
  Ticket,
} from "lucide-react";
import { eventInfo, formatPrice, ticketTiers } from "@/lib/event";

function getRazorpayScript() {
  if (document.getElementById("razorpay-checkout")) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = "razorpay-checkout";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function TicketCheckout() {
  const [ticketId, setTicketId] = useState(ticketTiers[0].id);
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [pendingOrder, setPendingOrder] = useState(null);
  const [result, setResult] = useState(null);

  const selectedTicket = useMemo(
    () =>
      ticketTiers.find((ticket) => ticket.id === ticketId) || ticketTiers[0],
    [ticketId],
  );
  const subtotal = selectedTicket.price * quantity;
  const entryCount = selectedTicket.entries * quantity;

  const updateCustomer = (field, value) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };

  const verifyPayment = async (order, response, demo = false) => {
    setState("verifying");
    setMessage("Confirming your ticket...");

    const verifyResponse = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.orderId,
        paymentId: response?.razorpay_payment_id,
        signature: response?.razorpay_signature,
        demo,
        orderDetails: {
          ...order,
          customer,
        },
      }),
    });

    const data = await verifyResponse.json();

    if (!verifyResponse.ok) {
      throw new Error(data.error || "Payment verification failed.");
    }

    setResult(data);
    setPendingOrder(null);
    setState("success");
    setMessage("Tickets issued.");
  };

  const beginCheckout = async (event) => {
    event.preventDefault();
    setResult(null);
    setPendingOrder(null);
    setState("creating");
    setMessage("Creating your order...");

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          quantity,
          customer,
        }),
      });
      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || "Unable to create order.");
      }

      if (order.demo) {
        setPendingOrder(order);
        setState("demo");
        setMessage("Demo checkout ready.");
        return;
      }

      const scriptReady = await getRazorpayScript();

      if (!scriptReady || !window.Razorpay) {
        throw new Error("Razorpay checkout could not load.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: eventInfo.organizer,
        description: `${order.ticket.name} x ${order.quantity}`,
        image: `${window.location.origin}/ghostmgm-logo.png`,
        order_id: order.orderId,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        notes: {
          event: eventInfo.name,
          ticket: order.ticket.name,
        },
        theme: {
          color: "#ec4899",
        },
        handler: (checkoutResponse) => {
          verifyPayment(order, checkoutResponse).catch((error) => {
            setState("error");
            setMessage(error.message);
          });
        },
        modal: {
          ondismiss: () => {
            setState("idle");
            setMessage("Checkout closed.");
          },
        },
      });

      checkout.on("payment.failed", (failure) => {
        setState("error");
        setMessage(failure.error?.description || "Payment failed.");
      });

      setState("paying");
      setMessage("Opening Razorpay...");
      checkout.open();
    } catch (error) {
      setState("error");
      setMessage(error.message);
    }
  };

  const issueDemoTicket = () => {
    if (!pendingOrder) {
      return;
    }

    verifyPayment(pendingOrder, null, true).catch((error) => {
      setState("error");
      setMessage(error.message);
    });
  };

  const busy = ["creating", "paying", "verifying"].includes(state);

  return (
    <form className="checkout-panel" id="tickets" onSubmit={beginCheckout}>
      <div className="panel-heading">
        <p className="eyebrow">Tickets</p>
        <h2>Book SYNAGOGUE</h2>
      </div>

      <div
        className="ticket-options"
        role="radiogroup"
        aria-label="Ticket type"
      >
        {ticketTiers.map((ticket) => (
          <button
            type="button"
            className={`ticket-row ${ticket.id === ticketId ? "is-selected" : ""}`}
            key={ticket.id}
            onClick={() => setTicketId(ticket.id)}
            role="radio"
            aria-checked={ticket.id === ticketId}
          >
            <span>
              <strong>{ticket.name}</strong>
              <small>{ticket.description}</small>
            </span>
            <span className="ticket-price">{formatPrice(ticket.price)}</span>
          </button>
        ))}
      </div>

      <div className="quantity-row">
        <span>
          <strong>Bookings</strong>
          <small>
            {entryCount} entry code{entryCount === 1 ? "" : "s"}
          </small>
        </span>
        <div className="stepper">
          <button
            type="button"
            aria-label="Decrease ticket quantity"
            title="Decrease"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          >
            <Minus size={16} />
          </button>
          <output>{quantity}</output>
          <button
            type="button"
            aria-label="Increase ticket quantity"
            title="Increase"
            onClick={() => setQuantity((value) => Math.min(8, value + 1))}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label>
          <span>Name</span>
          <input
            required
            type="text"
            autoComplete="name"
            value={customer.name}
            onChange={(event) => updateCustomer("name", event.target.value)}
            placeholder="Full name"
          />
        </label>
        <label>
          <span>
            Email ID (Double-check!! tickets will be delivered straight to your
            inbox)
          </span>
          <input
            required
            type="email"
            autoComplete="email"
            value={customer.email}
            onChange={(event) => updateCustomer("email", event.target.value)}
            placeholder="name@example.com"
          />
        </label>
        <label>
          <span>Phone</span>
          <input
            required
            type="tel"
            autoComplete="tel"
            value={customer.phone}
            onChange={(event) => updateCustomer("phone", event.target.value)}
            placeholder="98765 43210"
          />
        </label>
      </div>

      <div className="checkout-total">
        <span>Total</span>
        <strong>{formatPrice(subtotal)}</strong>
      </div>

      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <CreditCard size={18} />
        )}
        <span>Pay with Razorpay</span>
      </button>

      {state === "demo" ? (
        <button
          className="secondary-button"
          type="button"
          onClick={issueDemoTicket}
        >
          <Ticket size={18} />
          <span>Issue Demo Ticket</span>
        </button>
      ) : null}

      {message ? (
        <p
          className={`checkout-message ${state === "error" ? "is-error" : ""}`}
        >
          {state === "success" ? <CheckCircle2 size={16} /> : null}
          {state === "error" ? <AlertCircle size={16} /> : null}
          <span>{message}</span>
        </p>
      ) : null}

      {result?.tickets?.length ? (
        <div className="ticket-result">
          <div>
            <CheckCircle2 size={20} />
            <strong>Confirmed</strong>
          </div>
          <ul>
            {result.tickets.map((ticket) => (
              <li key={ticket.code}>
                <Ticket size={15} />
                <span>{ticket.code}</span>
              </li>
            ))}
          </ul>
          <div className="delivery-status">
            <span>
              <Mail size={15} />
              Email: {result.notifications?.email?.status || "pending"}
              {result.notifications?.email?.testUrl ? (
                <a
                  href={result.notifications.email.testUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "underline",
                    marginLeft: "6px",
                    color: "var(--pink-soft)",
                    fontWeight: "bold",
                  }}
                >
                  (View sent email)
                </a>
              ) : null}
            </span>
            <span>
              <Phone size={15} />
              Text: {result.notifications?.sms?.status || "pending"}
            </span>
          </div>
        </div>
      ) : null}
    </form>
  );
}
