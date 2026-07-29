// /api/delete-photo.js
// Removes one photo (identified by its URL) from a product's gallery array,
// and deletes the underlying file from Blob storage.

import { put, list, del } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, product, imageUrl } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }
  if (!product || !imageUrl) {
    return res.status(400).json({ error: "Missing product or imageUrl" });
  }

  try {
    const manifest = await loadManifest();
    if (manifest[product] && Array.isArray(manifest[product].images)) {
      manifest[product].images = manifest[product].images.filter((u) => u !== imageUrl);
    }

    try {
      await del(imageUrl);
    } catch (e) {
      console.warn("Could not delete blob file (continuing anyway):", e);
    }

    await put("manifest.json", JSON.stringify(manifest, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: "application/json",
    });

    return res.status(200).json({ ok: true, manifest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Delete failed", details: String(err) });
  }
}

async function loadManifest() {
  try {
    const { blobs } = await list({ prefix: "manifest.json" });
    const found = blobs.find((b) => b.pathname === "manifest.json");
    if (!found) return {};
    const r = await fetch(found.url + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}
