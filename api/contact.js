// Contact form → email via Resend. Env: RESEND_API_KEY (required),
// CONTACT_TO (default mauricio@pantaia.com), CONTACT_FROM (default Resend onboarding sender).
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Contact form is not configured" });

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const name = String(b.name || "").trim().slice(0, 200);
  const email = String(b.email || "").trim().slice(0, 200);
  const subject = String(b.subject || "").trim().slice(0, 200);
  const message = String(b.message || "").trim().slice(0, 5000);
  if (b.company) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden fields
  if (!name || !email || !message) return res.status(400).json({ error: "Name, email and message are required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email" });

  const to = process.env.CONTACT_TO || "mauricio@pantaia.com";
  const from = process.env.CONTACT_FROM || "Pantaia Website <onboarding@resend.dev>";
  const text = `New contact form submission on pantaia.com\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || "(none)"}\n\n${message}\n`;
  const html = `<p><strong>New contact form submission on pantaia.com</strong></p>
<p><b>Name:</b> ${esc(name)}<br><b>Email:</b> <a href="mailto:${esc(email)}">${esc(email)}</a><br><b>Subject:</b> ${esc(subject || "(none)")}</p>
<p style="white-space:pre-wrap">${esc(message)}</p>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: `[pantaia.com] ${subject || "New message"} — ${name}`, text, html }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Resend error", r.status, detail);
      return res.status(502).json({ error: "Could not send your message right now" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Contact send failed", e);
    return res.status(502).json({ error: "Could not send your message right now" });
  }
};
