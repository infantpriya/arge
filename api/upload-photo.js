// /api/upload-photo.js
// Adds one photo to a product's gallery. Unlike the old version, there's no
// fixed number of slots -- each upload just appends another image to that
// product's list, so you can add as many sample photos as you want.
//
// SETUP (one-time):
// 1. In your Vercel project, go to the "Storage" tab -> Create Database -> Blob
//    (choose PUBLIC access). Connect it to this project. Vercel automatically
//    adds a BLOB_READ_WRITE_TOKEN environment variable for you.
// 2. In Settings -> Environment Variables, add:
//      ADMIN_PASSWORD = <a password you choose>
// 3. Redeploy.

import { put, list } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: { sizeLimit: "8mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, product, customSlug, filename, dataBase64, contentType } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }
  if ((!product && !customSlug) || !dataBase64) {
    return res.status(400).json({ error: "Missing product or image data" });
  }

  try {
    const buffer = Buffer.from(dataBase64, "base64");
    const safeName = String(product || customSlug).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const ext = (filename && filename.split(".").pop()) || "jpg";
    const pathname = `products/${safeName}-${Date.now()}.${ext}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType || "image/jpeg",
    });

    const manifest = await loadManifest();

    if (customSlug) {
      if (!manifest.customProducts) manifest.customProducts = {};
      if (!manifest.customProducts[customSlug]) {
        return res.status(404).json({ error: "Custom product not found" });
      }
      if (!Array.isArray(manifest.customProducts[customSlug].images)) {
        manifest.customProducts[customSlug].images = [];
      }
      manifest.customProducts[customSlug].images.push(blob.url);
    } else {
      if (!manifest[product]) manifest[product] = {};
      if (!Array.isArray(manifest[product].images)) {
        // Migrate any older fixed-slot uploads (numeric keys "0","1","2") into the new array
        const numericKeys = Object.keys(manifest[product]).filter((k) => /^\d+$/.test(k)).sort((a, b) => a - b);
        manifest[product].images = numericKeys.map((k) => manifest[product][k]).filter(Boolean);
        numericKeys.forEach((k) => delete manifest[product][k]);
      }
      manifest[product].images.push(blob.url);
    }

    await put("manifest.json", JSON.stringify(manifest, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: "application/json",
    });

    return res.status(200).json({ ok: true, url: blob.url, manifest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Upload failed", details: String(err) });
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
