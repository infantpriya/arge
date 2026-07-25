# Angel Roch Global Exports — Website Package

## What's in here
- `index.html` — the full website (Home, About, Products, OEM/Private Label, Sustainability, Export Markets, Contact). Open it directly in a browser to preview.
- `api/contact.js` — backend function that emails you the "General Inquiry" form and auto-replies to the buyer, via Resend.
- `api/oem-inquiry.js` — same, for the "OEM / Private Label Inquiry" form.

## ⚠️ About your Resend API key — please rotate it
You shared a live Resend API key in chat. Treat any key that's been pasted into a chat, email, or unsecured doc as compromised — please go to Resend → API Keys and **generate a new one**, then use the new key only as an environment variable on your hosting platform (never inside a file). I did not put the key anywhere in this code for that reason.

## Why the forms don't send email yet
Browsers can't safely call the Resend API directly — any key placed in front-end code is visible to anyone who views the page source. So the site's forms call your own backend (`/api/contact` and `/api/oem-inquiry`), and *that* backend calls Resend using a key stored securely as a server environment variable.

### To make the forms live (roughly 10 minutes):
1. Create a free [Vercel](https://vercel.com) account and push this folder as a project (or drag-and-drop deploy).
2. In the Vercel project's **Settings → Environment Variables**, add:
   - `RESEND_API_KEY` = your new Resend key
3. In `api/contact.js` and `api/oem-inquiry.js`, update `FROM_EMAIL` and `TO_EMAIL` to your verified sending domain and inbox (Resend requires you to verify a domain, e.g. `angelrochglobal.com`, before it can send from it).
4. Deploy. The forms on `index.html` already call `/api/contact` and `/api/oem-inquiry` — no front-end changes needed.
5. (Optional) Point your real domain at the Vercel deployment.

If you'd rather use Netlify, Cloudflare Pages/Workers, or your own server, the two files in `api/` show exactly what the endpoint needs to do — they can be adapted with minor changes.

## Google Analytics (GA4)
Your measurement ID `G-7LD4WPK5PC` is already wired into `index.html`:
- Every page switch fires a `page_view` event (this is a single-page site, so GA needs manual page_view events rather than relying on full page reloads).
- **Which European markets visit most** — this comes for free from GA4's built-in geography reports once the site is live on a real domain (GA reads visitor location automatically; no extra code needed).
- **Which products get viewed longest** — a `product_view_duration` event fires for each product card, measuring how long it stayed in view.
- **Where buyers drop off in the inquiry flow** — `form_start`, `form_submit_attempt`, and `form_submit_success` events fire in sequence, so you can build a GA4 funnel (Explore → Funnel exploration) to see where people abandon the form.

None of this will show real numbers in this preview — it only reports once the site is live on a public domain and getting real visits.

## Favicon
The favicon is embedded in `index.html`'s `<link rel="icon">` tag using your logo, so it will show automatically once the site is deployed to a real domain (browser tabs don't show favicons for local preview files in some browsers/sandboxes).

## Product photo galleries
Each product card already has a working image carousel (arrows + dots) with three placeholder "slots" (e.g. texture close-up, full product, styled shot). Right now they show dashed placeholder boxes. To add real photos, open `index.html` and find the product's entry in the `productsTextiles` / `productsDecor` / `productsLifestyle` arrays near the top of the `<script>` block, then set the `img` field on each slot, e.g.:

```js
slots: [
  {shotType:"Texture close-up", img:"https://yoursite.com/images/sungudi-texture.jpg"},
  {shotType:"Full drape", img:"https://yoursite.com/images/sungudi-full.jpg"},
  {shotType:"Styled setting", img:"https://yoursite.com/images/sungudi-styled.jpg"},
]
```
The gallery will display the photo automatically — no other changes needed.

## Design
Ivory/cream header and footer as requested, deep forest green + gold accents pulled from your logo, Fraunces (serif) for headings and Jost (sans) for body text, with a recurring wave-and-dot divider motif echoing the flourish in your logo mark.
