"use client";

import { useMemo, useState, useEffect, useRef } from "react";
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

function RazorpayPaymentButton() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const form = document.createElement("form");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.setAttribute("data-payment_button_id", "pl_T0Jucz4a1gduAY");
    script.async = true;

    form.appendChild(script);
    containerRef.current.appendChild(form);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return <div ref={containerRef} className="razorpay-button-container" />;
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderId = params.get("orderId");
    const messageParam = params.get("message");

    if (status === "success" && orderId) {
      setState("verifying");
      setMessage("Confirming your ticket...");

      fetch(`/api/get-order?orderId=${orderId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Could not fetch order details.");
          return res.json();
        })
        .then((data) => {
          setResult(data);
          setState("success");
          setMessage("Tickets issued.");

          // Clean up URL query parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          setState("error");
          setMessage(err.message);
        });
    } else if (status === "error") {
      setState("error");
      setMessage(messageParam || "Payment failed or was cancelled.");

      // Clean up URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const verifyPayment = async (order, response, demo = false) => {
    setState("verifying");
    setMessage("Confirming your ticket...");

    const verifyResponse = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.orderId || order.id || "",
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

      if (order.mode === "link") {
        setPendingOrder(order);
        setState("pending_payment");
        setMessage("Order created! Please pay using the payment link below, then click confirm.");
        return;
      }

      throw new Error("Invalid response from checkout backend.");
    } catch (error) {
      setState("error");
      setMessage(error.message);
    }
  };

  const confirmManualPayment = () => {
    if (!pendingOrder) {
      return;
    }

    verifyPayment(pendingOrder, null, false).catch((error) => {
      setState("error");
      setMessage(error.message);
    });
  };

  const busy = ["creating", "verifying"].includes(state);
  const inputsDisabled = state !== "idle" && state !== "error";

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
          <div
            key={ticket.id}
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              width: "100%",
            }}
          >
            <button
              type="button"
              className={`ticket-row ${ticket.id === ticketId ? "is-selected" : ""}`}
              onClick={() => setTicketId(ticket.id)}
              role="radio"
              aria-checked={ticket.id === ticketId}
              disabled={inputsDisabled}
              style={{ flex: 1 }}
            >
              <span>
                <strong>{ticket.name}</strong>
                <small>{ticket.description}</small>
              </span>
              <span className="ticket-price">{formatPrice(ticket.price)}</span>
            </button>
            {ticket.id === "phase-one" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                }}
              >
                <RazorpayPaymentButton />
              </div>
            )}
          </div>
        ))}
      </div>



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
