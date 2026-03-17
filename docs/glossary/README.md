
# 3D Arts & Animation Glossary (Static HTML)

A lightweight, no-build glossary you can host on GitHub Pages/Netlify/Vercel and embed in SharePoint/Teams.

## Folder Structure
```
/glossary_site
  index.html              # Searchable index page
  terms.json              # List of terms (title, slug, category, tags, summary)
  /terms                  # One HTML file per term
    term-template.html    # Duplicate this to add new terms
  /assets
    /css/styles.css
    /js/main.js
    /images/placeholder-banner.jpg
```

---
## How to Add a New Term (2 steps)

**Step 1 – Create the term page**
1. Open `terms/term-template.html`
2. Save a copy as `terms/<your-slug>.html` (e.g., `terms/subsurface-scattering.html`)
3. Edit the file: set the `<title>`, main `<h1>`, category pill, and add your definition, images, GIFs, or YouTube embeds
4. Optional: replace the banner image source with a file you place in `assets/images/`

**Step 2 – Add the term to the index**
1. Open `terms.json`
2. Add a new object to the `terms` array like:
   ```json
   {
     "title": "Subsurface Scattering",
     "slug": "subsurface-scattering",
     "category": "Materials",
     "tags": ["SSS", "Skin"],
     "summary": "Light scattering beneath translucent surfaces like skin or wax."
   }
   ```
3. Save. The index page reads this file and shows your new term.

> Tip: Keep the `slug` exactly the same as your file name (without `.html`).

---
## Embed YouTube, Images, GIFs

**YouTube**
```html
<iframe src="https://www.youtube.com/embed/VIDEO_ID" allowfullscreen></iframe>
```

**Image/GIF**
```html
<img src="../assets/images/your-image.jpg" alt="Description" />
```

---
## Hosting (GitHub Pages)

1. Create a GitHub repository (public or private)
2. Upload the *contents* of `glossary_site/` (not the parent folder)
3. In the repo: **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / root
   - Save
4. Your site will publish at `https://<username>.github.io/<repo>/`

### Netlify or Vercel
- Drag-and-drop the `glossary_site/` folder into the dashboard
- Use default settings (it’s a static site)

---
## Whitelist the Domain in SharePoint (so embedding works)

Site Settings → **HTML Field Security** → Add domain(s), e.g.:
- `github.io`
- `netlify.app`
- `vercel.app`
- or your custom domain

---
## Embed in SharePoint & Teams

**SharePoint page**
1. Edit page → Add **Embed** web part
2. Paste your full glossary URL (e.g., `https://<username>.github.io/<repo>/index.html`)
3. Publish

**Teams tab**
1. In your Team channel, click **+** to add a tab
2. Choose **Website**
3. Paste the same URL

---
## Deep Linking to a Term
Each term has its own URL:
```
…/terms/<slug>.html
```
Example: `…/terms/pbr-workflow.html`

Use these links in email, Canvas, or QR codes.

---
## Working as a Team (3 instructors)

- Store the site in a shared GitHub repo (recommended) so each instructor can edit
- Use branches or GitHub Desktop for easy edits
- Alternatively, keep the folder in OneDrive and have one person publish changes

---
## Optional Customizations

- Change the site title in `index.html`
- Update colors in `assets/css/styles.css`
- Add categories/tags freely in `terms.json`
- Add a logo SVG in the header

---
## Troubleshooting

- If the index shows “Failed to load glossary data”, make sure `terms.json` is in the same folder as `index.html`
- If the site doesn’t embed, confirm the domain is whitelisted and the page is publicly accessible
- If images don’t show, check the relative path (use `../assets/images/...` from term pages)

---
## License
You’re free to use and modify this template for educational purposes.
