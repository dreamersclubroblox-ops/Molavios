# BouncyTOOLS Platform — Build Plan

A community hub voor AI-tools en game-apps, met een glassmorphism bottom dock, hiërarchische homepage, en volledige auth + admin paneel via Lovable Cloud.

## Design system

- **Palet:** wit / lichtgrijs / zwart (geen accent kleur). Hiërarchie via grijswaarden, schaduwen, en blur.
  - Background `#ffffff`, surface `#f5f5f5`, border `#e5e5e5`, muted `#737373`, foreground `#0a0a0a`.
- **Typography:** Inter (body) + Space Grotesk (headings) — modern, neutraal, "bouncy" door size & weight contrast.
- **"Bouncy" feel:** zachte spring-easings (`cubic-bezier(0.34, 1.56, 0.64, 1)`), schaalbare hovers, soepele width-transitions in de dock.
- Alle kleuren als HSL tokens in `index.css`; geen hardcoded kleuren in componenten.

## Pagina-structuur & routes

```text
/                       Home (grote AI-tiles boven, app-vakken onder)
/tools/text             Tekst-AI tool pagina
/tools/image            Afbeelding-AI tool pagina
/tools/audio            Audio-AI tool pagina
/apps/:slug             App detail (alle tools van die app)
/tools/:slug            Specifieke (app-)tool pagina
/store                  Appstore (browse + install)
/favorites              Favoriete apps & tools
/auth                   Login / signup
/admin                  Admin paneel (tools, apps, categorieën beheren)
```

## Bottom Dock (de hero-component)

Fixed onderaan, `backdrop-blur-xl bg-white/40 border border-white/60`, afgeronde pill-vorm, schaduw.
Vier secties gescheiden door dunne verticale dividers:

1. **Home** — huis-icoon; on hover groeit knop in breedte en onthult "HOME".
2. **AI Tools** — drie iconen (Tekst / Afbeelding / Audio); per icoon hover-reveal van label.
3. **Geïnstalleerde Apps** — dynamische lijst app-iconen; klik opent een popover met tools van die app.
4. **Store & Favs** — twee iconen die naar `/store` en `/favorites` linken.

Hover-mechanisme: elke knop is een `group` met `w-10` default → `group-hover:w-auto px-4` met spring-transition; tekst is `opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto`.

## Homepage hiërarchie

- **Bovenzone (groot):** 3 grote tiles voor Tekst/Afbeelding/Audio AI — full-width grid, ruime padding, grote iconen, korte beschrijving, "Open" CTA.
- **Onderzone (kleiner):** grid van app-cards (Minecraft, Roblox, …). Elke card toont app-naam, icoon, en een chip-lijst van bijbehorende tools. Klik op card → `/apps/:slug`. Klik op chip → `/tools/:slug`. Star-icoon op elke card/tool voor favoriet.

## Rollen & auth

- **Guest:** mag browsen (`/`, `/store`, `/apps/:slug`, `/tools/:slug` read-only). Install / favorite knoppen vragen login.
- **User:** apps installeren, favorieten beheren, tools gebruiken.
- **Admin:** toegang tot `/admin` voor CRUD op tools, apps, categorieën.

Email/password + Google login via Lovable Cloud. Rollen in **aparte `user_roles` tabel** met `has_role()` security definer functie (nooit op profiles).

## Database (Lovable Cloud)

```text
profiles            (id → auth.users, display_name, avatar_url)
user_roles          (user_id, role: 'admin'|'user')   — RLS via has_role()
categories          (id, name, slug)
apps                (id, slug, name, icon, accent_color, description)
tools               (id, slug, name, description, category_id, type: 'ai'|'app',
                     app_id nullable, size: 'sm'|'md'|'lg', route)
user_installed_apps (user_id, app_id)
user_favorites      (user_id, target_type: 'app'|'tool', target_id)
```

RLS:
- `apps`, `tools`, `categories`: public select; insert/update/delete alleen admin.
- `user_installed_apps`, `user_favorites`: alleen owner.
- `profiles`: owner read/update; public read van display_name/avatar.

Trigger: auto-create profile + default `user` role on signup.

## Admin paneel (`/admin`)

Beschermd via `has_role(uid, 'admin')`. Tabs:
- **Tools** — tabel + create/edit dialog (naam, slug, categorie, type, app, route, size).
- **Apps** — tabel + create/edit (naam, slug, icoon-naam uit lucide, accent, beschrijving).
- **Categorieën** — eenvoudige lijst met inline add/rename/delete.

## Tool-pagina's (v1 stubs)

Elke tool-route rendert een gemeenschappelijke `ToolPage` layout (titel, beschrijving, breadcrumbs, favorite-knop). De drie AI-tools krijgen een eenvoudige werkende UI:
- **Text:** prompt → response (Lovable AI Gateway, gemini default).
- **Image:** prompt → image (Lovable AI image model).
- **Audio:** placeholder UI (opname/upload knop, "coming soon").

App-tools renderen een placeholder body — echte logica komt per tool in volgende iteraties.

## Implementatievolgorde

1. Design tokens (`index.css`, `tailwind.config.ts`) + bouncy easings/animaties.
2. Layout shell + `BottomDock` component met hover-reveal.
3. Lovable Cloud aanzetten + DB schema + RLS + trigger.
4. Auth pagina + AuthProvider + role hook.
5. Home (AI hero tiles + apps grid) met data uit DB (seed met Minecraft/Roblox + sample tools).
6. Routes: `/store`, `/favorites`, `/apps/:slug`, `/tools/:slug` + AI tool pagina's via Lovable AI Gateway.
7. `/admin` met CRUD tabs.
8. Polish: loading states, empty states, mobile dock layout.

## Technische noten

- Bouncy spring easing als Tailwind extension `transitionTimingFunction.spring`.
- Dock op mobile: zelfde pill, secties iets compacter; bij <400px alleen iconen tonen, hover→tap-toggle.
- Gebruik `NavLink` voor active states in dock.
- Lucide-iconen voor app-iconen (admin kiest naam uit lijst) — geen file uploads in v1.
- Image generation en text completion via Lovable AI Gateway edge functions (geen API key vereist).
