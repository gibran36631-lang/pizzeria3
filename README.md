# NILU Pizzería (Vite + React + Tailwind)

Sitio con menú, promos, historia, horarios, ubicación (Google Maps embed) y **ordenar** con carrito + checkout (pago simulado).

## Scripts
```bash
npm i
npm run dev
npm run build
npm run preview
```

## Deploy (Vercel)
- Build Command: `npm run build`
- Output: `dist`
- Root Directory: (este repo)

## Notas
- Imágenes locales en `public/img/` (SVG) para evitar fallas externas.
- La navbar hace **scroll suave dentro del contenedor** porque hay un marco de **vista PC (1280×800)**.
  - Para producción responsive: cambia el contenedor a width: 100%; height: auto; y quita `overflow-auto`.
