# Kineticore Systems — Static Website

A complete, dependency-free static rebuild of kineticore.ca, expanded into a two-division
site: **Laboratory & DAQ Systems** (the existing business) and **Pyrolysis & Biochar**
(the upcoming wood-waste-to-biochar factory).

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Homepage — dual-division hero with switcher, KC-36 feature, process diagram |
| `lab-systems.html` | Division 1: turnkey DAQ hardware/software, security, calibration |
| `pyrolysis.html` | Division 2: pyrolysis process, products (biochar/syngas/bio-oil/heat), facility roadmap, applications |
| `kc-36.html` | Product page for the KC-36 Thermocouple Logger (specs from the official manual) |
| `services.html` | Both divisions' services + engagement models + plant status |
| `about.html` | Company story, principles, divisions |
| `contact.html` | Validated contact form (opens mail client), division-aware topic picker, support info |

## Structure

```
├── index.html / lab-systems.html / pyrolysis.html / kc-36.html
├── services.html / about.html / contact.html
├── css/styles.css        # single design system (colors, components, responsive)
├── js/main.js            # mobile nav, scroll reveal, division switcher, form validation
├── img/                  # logo.png (brand mark), favicon-48/180/192/512.png,
│                           og-image.png (1200x630 social card),
│                           process-diagram.svg, kc36-device.svg, legacy logo.svg + favicon.svg
├── llms.txt              # site summary for AI/LLM crawlers
├── sendmail/process-wrapper.php  # contact form backend (Gmail SMTP, reads ../.env)
├── .env / .env.example   # SMTP credentials (.env is gitignored — fill in real values)
├── sitemap.xml, robots.txt
```

## Design notes

- **Palette:** deep forest green (#0c2f22–#2e8963) + amber accent (#ecb454) — bridges lab-tech and biochar.
- **Type:** Inter (Google Fonts) with system fallback; page remains fully usable offline.
- **Imagery:** free-license Pexels photos (hotlinked with auto=compress sizing params). Replace with
  owned photography when available — update `--hero-img` inline styles and `<img src>`s.
- **No build step.** Deploy by copying the folder to any static host
  (GitHub Pages, Netlify, Cloudflare Pages, S3). The `.html` links work on all of them.

## Editing tips

- All nav/footer markup is repeated per page (static site trade-off). Search-replace across files to update.
- **Contact form** posts via AJAX to `/sendmail/process-wrapper.php`
  (fields: `Name, Email, Company, Topic, Phone, Extension, Message`). It only works when
  deployed to the live host at the domain root; if you deploy under a subfolder, update the form's
  `data-endpoint` attribute in `contact.html`. Response parsing matches the original `form.js`
  (`Success*` → thank-you, `Fail:`/`Error:`/`Debug:` → inline error).

### Contact form backend (sendmail/)

`sendmail/process-wrapper.php` sends every enquiry via **Gmail SMTP**. Configuration lives in
`.env` at the site root (copied from `.env.example`, gitignored — never commit real credentials).

Required values:

| Key | Meaning |
|-----|---------|
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465` (implicit TLS; `587` STARTTLS also supported) |
| `SMTP_USER` / `SMTP_PASS` | Gmail address + 16-character **App Password** (needs 2-Step Verification: myaccount.google.com/apppasswords) |
| `MAIL_TO` | Recipient of enquiries (e.g. `info@kineticore.ca`) |
| `MAIL_FROM_NAME` | Display name on the email |
| `MAIL_DEBUG` | `1` = test mode: form returns `Debug:` with the rendered email, nothing is sent |

The From address is always the authenticated Gmail account (Gmail requirement); the visitor's
address is set as `Reply-To`. Submissions are also backed up as text files to the system temp dir
(`kc-form/`), so no lead is lost if SMTP fails, and requests are rate-limited to 10/hour per IP.

Deploy & test checklist:

1. Upload `sendmail/process-wrapper.php` and `.env` to the domain root of the server.
2. Add to the nginx server block (above the other regex locations) so secrets can't be downloaded:

```nginx
location ^~ /.well-known/ { allow all; }              # keep ACME/certbot working
location ~ /\.            { deny all; access_log off; log_not_found off; }
location ~* \.(env|bak|old|save|swp|ini|log|sql|sh)$ { deny all; access_log off; log_not_found off; }
```

3. Test with `MAIL_DEBUG=1` in `.env`, submit the form once — you should see a `Debug:` preview.
4. Set `MAIL_DEBUG=0`, submit again, and confirm the email arrives at `MAIL_TO`
   (check spam the first time; also verify `curl -sI https://kineticore.ca/.env` returns 403/404).

Keep a copy of the previous server-side `process-wrapper.php` **off the web root** before
overwriting (a `foo.php.bak` in the web root would be downloadable as plain text).
- Product data in `kc-36.html` (36 channels, NI-9213/9211 modules, ±0.5 °C, v1.6.1) mirrors the official
  manual — update together with the manual.
- Plant status claims (phases, "2027", capacity) live in `services.html` and `pyrolysis.html` — keep them
  consistent and conservative until contracts are signed.

## Image credits (Pexels, free license)

- 32845700 — engineer at control room (home hero)
- 2280571 — lab equipment (lab-systems hero)
- 10709388 — charcoal (pyrolysis hero)
- 256381, 3861969 — lab work (lab-systems)
- 7274849 — log pile; 38217230 — industrial panels; 15678267 — seedlings in soil (pyrolysis)
- 2280549 — team collaboration (about)
