import nodemailer from "nodemailer";
import QRCode from "qrcode";
import twilio from "twilio";
import { eventInfo, formatPrice } from "./event";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePhoneNumber(phone) {
  const cleaned = String(phone || "").replace(/[^0-9+]/g, "");
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  return cleaned ? `+${cleaned}` : "";
}


function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

async function buildQrAttachment(order, tickets) {
  const qrPayload = JSON.stringify({
    event: eventInfo.name,
    orderId: order.id,
    tickets: tickets.map((ticket) => ticket.code),
  });
  const dataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 420,
  });

  return {
    filename: `${order.id}-ticket-qr.png`,
    content: dataUrl.split(",")[1],
    encoding: "base64",
    cid: "ticketqr",
  };
}

async function sendTicketEmail(order, tickets) {
  if (!emailConfigured()) {
    return { status: "skipped", reason: "SMTP is not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const qrAttachment = await buildQrAttachment(order, tickets);
    const ticketRows = tickets
      .map(
        (ticket) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f7b4d1;">${escapeHtml(ticket.code)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #f7b4d1;">${escapeHtml(order.ticketName)}</td>
          </tr>
        `,
      )
      .join("");

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: order.customer.email,
      subject: `${eventInfo.name} ticket confirmation`,
      html: `
        <div style="background:#09070b;color:#fff;font-family:Arial,sans-serif;padding:28px;">
          <div style="max-width:640px;margin:auto;border:1px solid #f0529c;padding:28px;">
            <p style="margin:0 0 8px;color:#ff8fc4;">${escapeHtml(eventInfo.organizer)}</p>
            <h1 style="margin:0 0 12px;font-size:32px;color:#fff;">${escapeHtml(eventInfo.name)}</h1>
            <p style="font-size:16px;line-height:1.5;color:#fce7f3;">
              Your ${escapeHtml(order.ticketName)} booking is confirmed for ${escapeHtml(eventInfo.dateLabel)},
              ${escapeHtml(eventInfo.startsAt)} to ${escapeHtml(eventInfo.endsAt)}.
            </p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;color:#fff;">
              <thead>
                <tr>
                  <th align="left" style="padding:8px 0;color:#ff8fc4;">Ticket code</th>
                  <th align="left" style="padding:8px 0;color:#ff8fc4;">Pass</th>
                </tr>
              </thead>
              <tbody>${ticketRows}</tbody>
            </table>
            <p style="color:#fce7f3;">Order total: ${escapeHtml(formatPrice(order.amount / 100))}</p>
            <p style="color:#fce7f3;">Venue: ${escapeHtml(eventInfo.location)}</p>
            <img alt="Ticket QR code" src="cid:ticketqr" width="210" height="210" style="display:block;margin-top:18px;" />
          </div>
        </div>
      `,
      attachments: [qrAttachment],
    });

    const result = { status: "sent", messageId: info.messageId };

    if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes("ethereal.email")) {
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        console.log(`✉️ Ethereal Email sent! View at: ${testUrl}`);
        result.testUrl = testUrl;
      }
    }

    return result;
  } catch (error) {
    console.error("sendTicketEmail failed:", error);
    return { status: "failed", error: error.message };
  }
}

async function sendTicketSms(order, tickets) {
  if (!smsConfigured()) {
    return { status: "skipped", reason: "Twilio SMS is not configured" };
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const ticketCodes = tickets.map((ticket) => ticket.code).join(", ");
    const normalizedPhone = normalizePhoneNumber(order.customer.phone);

    if (!normalizedPhone) {
      throw new Error("Phone number is empty after normalization.");
    }

    const message = await client.messages.create({
      to: normalizedPhone,
      from: process.env.TWILIO_FROM_NUMBER,
      body: `${eventInfo.name} confirmed. ${order.ticketName} x${order.quantity}. Ticket code(s): ${ticketCodes}. ${eventInfo.dateLabel}, ${eventInfo.startsAt}-${eventInfo.endsAt}.`,
    });

    return { status: "sent", messageId: message.sid };
  } catch (error) {
    console.error("sendTicketSms failed:", error);
    return { status: "failed", error: error.message };
  }
}

export async function sendTicketNotifications(order, tickets) {
  const [email, sms] = await Promise.all([
    sendTicketEmail(order, tickets),
    sendTicketSms(order, tickets),
  ]);

  return { email, sms };
}
