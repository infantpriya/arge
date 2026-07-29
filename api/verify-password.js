// /api/verify-password.js
// Checks the admin password before the admin page unlocks its interface at all.
// This is what makes a wrong password actually block access, instead of just
// letting uploads silently fail later.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { password } = req.body || {};
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Incorrect password" });
  }
  return res.status(200).json({ ok: true });
}
