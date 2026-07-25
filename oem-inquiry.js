// /api/oem-inquiry.js
// Deploy this as a Vercel Serverless Function (or adapt for Netlify Functions / Cloudflare Workers).
// It receives the "OEM / Private Label Inquiry" form data from the website, emails YOU the inquiry,
// and sends an auto-reply confirmation to the buyer — both via Resend.
//
// SETUP:
// 1. Put this file at:  /api/contact.js  in a Vercel project (the website's index.html goes at the project root).
// 2. In the Vercel project settings, add an Environment Variable:
//      RESEND_API_KEY = <your Resend API key>
//    Never write the key directly in this file or commit it to a public repo.
// 3. Verify your sending domain in Resend (e.g. angelrochglobal.com) so emails don't land in spam.
// 4. Update FROM_EMAIL and TO_EMAIL below to your verified domain / inbox.

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "Angel Roch Global Exports <inquiries@angelrochglobal.com>"; // must be on a domain verified in Resend
const TO_EMAIL = "info@angelrochglobal.com"; // where inquiries land in your inbox

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, company, email, country, product, qty, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server not configured: RESEND_API_KEY missing" });
  }

  const notifyToYou = {
    from: FROM_EMAIL,
    to: [TO_EMAIL],
    reply_to: email,
    subject: `new OEM inquiry from ${name}${company ? " (" + company + ")" : ""}`,
    html: `
      <h2>New OEM / Private Label Inquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Company:</strong> ${escapeHtml(company || "-")}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Country:</strong> ${escapeHtml(country || "-")}</p>
      <p><strong>Product Interest:</strong> ${escapeHtml(product || "-")}</p>
      <p><strong>Target Quantity:</strong> ${escapeHtml(qty || "-")}</p>
      <p><strong>Customization Details:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `,
  };

  const autoReplyToBuyer = {
    from: FROM_EMAIL,
    to: [email],
    subject: "We received your OEM inquiry — Angel Roch Global Exports",
    html: `
      <p>Dear ${escapeHtml(name)},</p>
      <p>Thank you for reaching out to Angel Roch Global Exports. We've received your inquiry and a member of our team will respond within 1–2 business days.</p>
      <p>Best regards,<br>Angel Roch Global Exports<br>Madurai, Tamil Nadu, India</p>
    `,
  };

  try {
    const [r1, r2] = await Promise.all([
      fetch(RESEND_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(notifyToYou),
      }),
      fetch(RESEND_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(autoReplyToBuyer),
      }),
    ]);

    if (!r1.ok || !r2.ok) {
      const t1 = await r1.text();
      const t2 = await r2.text();
      console.error("Resend error", t1, t2);
      return res.status(502).json({ error: "Email provider error" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send email" });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
