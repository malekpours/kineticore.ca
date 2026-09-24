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
├── img/                  # logo.svg, favicon.svg, process-diagram.svg, kc36-device.svg
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
- **Contact form** posts via AJAX to `/sendmail/process-wrapper.php` — the same PHP backend the original
  site hosts (fields: `Name, Email, Company, Topic, Phone, Extension, Message`). It only works when
  deployed to the live host at the domain root; if you deploy under a subfolder, update the form's
  `data-endpoint` attribute in `contact.html`. Response parsing matches the original `form.js`
  (`Success*` → thank-you, `Fail:`/`Error:`/`Debug:` → inline error).
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
