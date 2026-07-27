// /api/upload-photo.js
// Receives one photo from the admin page, stores it in Vercel Blob storage,
// and updates a manifest.json (also in Blob) that maps each product + slot
// to its image URL. The main website reads that manifest on every page load.
//
// SETUP (one-time):
// 1. In your Vercel project, go to the "Storage" tab -> Create Database -> Blob.
//    Connect it to this project. Vercel automatically adds a BLOB_READ_WRITE_TOKEN
//    environment variable for you -- you don't need to create this one yourself.
// 2. In Settings -> Environment Variables, add your own variable:
//      ADMIN_PASSWORD = <a password you choose>
//    This is the password you'll type into admin.html to unlock uploading.
// 3. Add "@vercel/blob" to package.json (already included in this package).
// 4. Redeploy.

import { put, list } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: { sizeLimit: "8mb" }, // allow reasonably large photos
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, product, slotIndex, filename, dataBase64, contentType } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }
  if (!product || slotIndex === undefined || !dataBase64) {
    return res.status(400).json({ error: "Missing product, slotIndex, or image data" });
  }

  try {
    const buffer = Buffer.from(dataBase64, "base64");
    const safeName = String(product).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const ext = (filename && filename.split(".").pop()) || "jpg";
    const pathname = `products/${safeName}-slot${slotIndex}.${ext}`;

    // 1. Upload the photo itself
    const blob = await put(pathname, buffer, {
      access: "public",
      addRandomSuffix: true, // avoids caching/overwrite issues on repeated uploads
      contentType: contentType || "image/jpeg",
    });

    // 2. Load the current manifest (if any), update it, save it back
    const manifest = await loadManifest();
    if (!manifest[product]) manifest[product] = {};
    manifest[product][slotIndex] = blob.url;

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
