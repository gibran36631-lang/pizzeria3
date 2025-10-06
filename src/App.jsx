import React, { useMemo, useRef, useState } from "react";

/**
 * NILU Pizzería – React (Vite + Tailwind)
 * - Smooth in-container scrolling (PC preview 1280×800)
 * - Imágenes locales (public/img/*.svg)
 * - Carrito + checkout con pago simulado (validaciones)
 * - Helpers puros + mini tests con console.assert
 */

// ---------- Helpers ----------
export function mxn(n) { return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }); }
export function computeSubtotal(cart){ return cart.reduce((s,i)=> s + i.unitPrice*i.qty, 0); }
export function computeDelivery(sub){ return (sub>=400 || sub===0) ? 0 : 30; }
export function computeTotal(cart){ const s=computeSubtotal(cart); return s + computeDelivery(s); }
export function upsertCartItem(cart,{id,name,size,unitPrice,qty}) {
  const key = `${id}-${size}`;
  const idx = cart.findIndex(i=>i.key===key);
  if(idx!==-1){ const next=[...cart]; next[idx]={...next[idx], qty: next[idx].qty+qty}; return next; }
  return [...cart,{key,id,name,size,qty,unitPrice}];
}

// ---------- Mini tests (no toques) ----------
;(function(){
  try{
    console.assert(computeSubtotal([])===0, "Subtotal vacío");
    console.assert(computeSubtotal([{unitPrice:100,qty:1},{unitPrice:50,qty:3}])===250,"Subtotal 250");
    console.assert(computeDelivery(0)===0,"Envío 0");
    console.assert(computeDelivery(399)===30,"Envío 30 (<400)");
    console.assert(computeDelivery(400)===0,"Envío 0 (>=400)");
    const A=[{unitPrice:170,qty:1},{unitPrice:180,qty:1}]; console.assert(computeTotal(A)===380,"Total 380");
    const B=[{unitPrice:200,qty:2}]; console.assert(computeTotal(B)===400,"Total 400");
    const c1=upsertCartItem([], {id:"pep",name:"Peperoni",size:"slice",unitPrice:170,qty:1});
    const c2=upsertCartItem(c1,{id:"pep",name:"Peperoni",size:"slice",unitPrice:170,qty:2});
    console.assert(c2[0].qty===3,"merge qty");
    const c3=upsertCartItem(c2,{id:"pep",name:"Peperoni",size:"full",unitPrice:300,qty:1});
    console.assert(c3.length===2,"nueva línea por size distinto");
  }catch(e){ console.error("Test failure:", e); }
})();

export default function App(){
  // Datos de menú (usan imágenes locales en /public/img)
  const MENU = [
    { id:"nap", name:"Napolitana", desc:"San Marzano, fior di latte, albahaca.", img:"/img/napolitana.svg", prices:{slice:180, full:320} },
    { id:"ny",  name:"New York",   desc:"Slice delgado, queso estirable, borde con carácter.", img:"/img/newyork.svg", prices:{slice:190, full:340} },
    { id:"chi", name:"Chicago",    desc:"Profunda, mucho queso, salsa arriba.", img:"/img/chicago.svg", prices:{slice:220, full:380} },
    { id:"mx",  name:"Carne Asada Mexicana", desc:"Carne asada, cebolla, cilantro, guacamole.", img:"/img/mexicana.svg", prices:{slice:210, full:360} },
    { id:"pep", name:"Peperoni",   desc:"El clásico crujiente con bordes rizados.", img:"/img/peperoni.svg", prices:{slice:170, full:300} },
    { id:"esp", name:"Especial de temporada", desc:"Siempre fresco, según el mercado.", img:"/img/especial.svg", prices:{slice:200, full:360} },
  ];

  // Estado
  const [cart,setCart]=useState([]);
  const [order,setOrder]=useState({name:"",phone:"",address:"",notes:"",payMethod:"card",cardNumber:"",cardExpiry:"",cardCvc:""});

  // Derivados
  const subtotal = useMemo(()=>computeSubtotal(cart),[cart]);
  const delivery = useMemo(()=>computeDelivery(subtotal),[subtotal]);
  const total = subtotal + delivery;

  // Scroll suave dentro del contenedor con overflow
  const scrollerRef = useRef(null);
  const scrollToId = (e,id)=>{
    e?.preventDefault?.();
    const scroller=scrollerRef.current; if(!scroller) return;
    const target=scroller.querySelector(id.startsWith('#')?id:`#${id}`); if(!target) return;
    const header=scroller.querySelector('header'); const headerH=header?header.offsetHeight:0;
    const top=target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - headerH - 16;
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  // Acciones
  const addToCart=(item,size="full",qty=1)=> setCart(prev=>upsertCartItem(prev,{id:item.id,name:item.name,size,qty,unitPrice:item.prices[size]}));
  const updateQty=(key,qty)=> setCart(prev=> prev.map(i=>i.key===key?{...i,qty:Math.max(0,qty)}:i).filter(i=>i.qty>0));
  const removeItem=(key)=> setCart(prev=> prev.filter(i=>i.key!==key));
  const handleCheckout=(e)=>{
    e.preventDefault();
    if(!order.name || !order.phone || !order.address) return alert("Completa nombre, teléfono y dirección.");
    if(cart.length===0) return alert("Agrega al menos un producto al carrito.");
    if(order.payMethod==="card"){
      // Validaciones sin regex "raras" para evitar errores en el build
      const digits=order.cardNumber.replace(/\s+/g,"");
      if(!/^\d{16}$/.test(digits)) return alert("Número de tarjeta inválido (16 dígitos).");
      const [mm,yy]=(order.cardExpiry||"").split("/");
      const validExp = mm && yy && mm.length===2 && yy.length===2 && /^\d+$/.test(mm) && /^\d+$/.test(yy) && Number(mm)>=1 && Number(mm)<=12;
      if(!validExp) return alert("Fecha inválida (MM/AA).");
      if(!/^\d{3,4}$/.test(order.cardCvc)) return alert("CVC inválido.");
    }
    const summary=cart.map(i=>`${i.qty} x ${i.name} (${i.size==='slice'?'Rebanada':'Completa'})`).join('%0A');
    const msg=`Pedido NILU%0A%0A${summary}%0A%0ASubtotal: ${mxn(subtotal)}%0AEnvío: ${mxn(delivery)}%0ATotal: ${mxn(total)}%0A%0ANombre: ${encodeURIComponent(order.name)}%0ATeléfono: ${encodeURIComponent(order.phone)}%0ADirección: ${encodeURIComponent(order.address)}%0ANotas: ${encodeURIComponent(order.notes||'-')}`;
    alert("¡Pago simulado exitoso! Se generará el mensaje de pedido para logística.");
    if(typeof window!=="undefined"){ window.open(`https://wa.me/526311234567?text=${msg}`,'_blank'); }
  };

  const ImageWithFallback=({src,alt,className})=>(
    <img src={src} alt={alt} className={className} loading="lazy" decoding="async"
      onError={(e)=>{ const f='/img/hero.svg'; if(e.currentTarget.src!==f) e.currentTarget.src=f; }} />
  );

  return (
    <div className="min-h-screen bg-neutral-900 p-4">
      <div
        ref={scrollerRef}
        className="mx-auto bg-[#faf4ea] text-stone-900 rounded-[2rem] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] ring-1 ring-black/10 overflow-auto scroll-smooth"
        style={{ width:"1280px", height:"800px" }}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur bg-[#faf4ea]/80 border-b border-stone-200/60">
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
            <a href="#home" onClick={(e)=>scrollToId(e,'home')} className="text-2xl tracking-[0.15em] font-serif">N I L U</a>
            <nav className="hidden md:flex gap-6 text-sm">
              <a href="#menu" onClick={(e)=>scrollToId(e,'menu')} className="hover:opacity-80">Menú</a>
              <a href="#promos" onClick={(e)=>scrollToId(e,'promos')} className="hover:opacity-80">Promociones</a>
              <a href="#historia" onClick={(e)=>scrollToId(e,'historia')} className="hover:opacity-80">Nuestra historia</a>
              <a href="#horarios" onClick={(e)=>scrollToId(e,'horarios')} className="hover:opacity-80">Horarios</a>
              <a href="#ubicacion" onClick={(e)=>scrollToId(e,'ubicacion')} className="hover:opacity-80">Ubicación</a>
              <a href="#ordenar" onClick={(e)=>scrollToId(e,'ordenar')} className="hover:opacity-80">Ordenar</a>
            </nav>
            <a href="#ordenar" onClick={(e)=>scrollToId(e,'ordenar')} className="px-4 py-2 rounded-full border border-stone-900 hover:-translate-y-[1px] transition inline-block text-sm">Ordenar</a>
          </div>
        </header>

        {/* Hero */}
        <section id="home" className="relative">
          <div className="max-w-6xl mx-auto px-5 pt-16 md:pt-24 pb-12 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="uppercase tracking-[0.25em] text-xs">Desde 2025 · Nogales, Sonora</p>
              <h1 className="mt-3 text-4xl md:text-6xl leading-[0.95] font-serif">Pizza al estilo europeo, hecha a mano, horneada con cariño.</h1>
              <p className="mt-5 text-stone-700 max-w-prose">Masa lenta, ingredientes sencillos y técnicas clásicas. Nada rígido: bordes imperfectos, mucho carácter.</p>
              <div className="mt-6 flex gap-3">
                <a href="#menu" onClick={(e)=>scrollToId(e,'menu')} className="px-5 py-3 rounded-full bg-stone-900 text-white hover:opacity-90">Ver menú</a>
                <a href="#ordenar" onClick={(e)=>scrollToId(e,'ordenar')} className="px-5 py-3 rounded-full border border-stone-900 hover:-translate-y-[1px] transition">Ordenar ahora</a>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-[2rem] overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] rotate-1">
                <ImageWithFallback src="/img/hero.svg" alt="Pizza artesanal NILU" className="w-full h-[420px] object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Menú */}
        <section id="menu" className="max-w-6xl mx-auto px-5 py-16 scroll-mt-24">
          <h2 className="text-3xl md:text-4xl font-serif mb-10">Nuestro Menú</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {MENU.map((m, idx) => (
              <article key={m.id} className={`group rounded-[2rem] bg-white border border-stone-200 shadow-sm overflow-hidden ${idx % 2 ? "rotate-1 hover:-rotate-1" : "-rotate-1 hover:rotate-0"} transition`}>
                <ImageWithFallback src={m.img} alt={m.name} className="h-60 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif">{m.name}</h3>
                    <span className="text-sm text-stone-700">{mxn(m.prices.slice)} / {mxn(m.prices.full)}</span>
                  </div>
                  <p className="text-sm text-stone-600 mt-1">{m.desc}</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={()=>addToCart(m, "slice", 1)} className="px-3 py-2 text-sm rounded-full border border-stone-900">Agregar rebanada</button>
                    <button type="button" onClick={()=>addToCart(m, "full", 1)} className="px-3 py-2 text-sm rounded-full bg-stone-900 text-white">Agregar completa</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Promociones */}
        <section id="promos" className="max-w-6xl mx-auto px-5 pb-8 scroll-mt-24">
          <h3 className="text-3xl font-serif mb-6">Promociones</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wide">Código: <span className="font-mono">NILU2x1</span></p>
              <h4 className="text-xl mt-1">2x1 en rebanadas</h4>
              <p className="text-sm text-stone-600">Lunes y martes de 1–5 pm.</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wide">Código: <span className="font-mono">NOGALES10</span></p>
              <h4 className="text-xl mt-1">10% en pizza completa</h4>
              <p className="text-sm text-stone-600">Aplican términos. Sólo en línea.</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wide">Hoy</p>
              <h4 className="text-xl mt-1">Refresco gratis</h4>
              <p className="text-sm text-stone-600">En pedidos mayores a {mxn(300)}.</p>
            </div>
          </div>
        </section>

        {/* Historia */}
        <section id="historia" className="max-w-6xl mx-auto px-5 pb-8 scroll-mt-24">
          <div className="bg-white border border-stone-200 rounded-[2rem] p-8 md:p-12 leading-relaxed shadow-sm">
            <h3 className="text-2xl font-serif">Nuestra historia</h3>
            <p className="mt-3 text-stone-700">NILU nace del respeto por la masa y el tiempo: fermentaciones largas, ingredientes sencillos y técnicas clásicas traídas al desierto de Sonora. Nada perfecto, todo con carácter.</p>
          </div>
        </section>

        {/* Horarios & Ubicación */}
        <section className="max-w-6xl mx-auto px-5 py-12 grid md:grid-cols-2 gap-8">
          <div id="horarios" className="bg-white border border-stone-200 rounded-[2rem] p-7 scroll-mt-24">
            <h4 className="text-xl font-serif">Horarios</h4>
            <dl className="mt-4 text-sm text-stone-700 space-y-2">
              <div className="flex justify-between"><dt>Lun–Jue</dt><dd>1:00 pm – 10:00 pm</dd></div>
              <div className="flex justify-between"><dt>Vie–Sáb</dt><dd>1:00 pm – 11:30 pm</dd></div>
              <div className="flex justify-between"><dt>Domingo</dt><dd>1:00 pm – 9:00 pm</dd></div>
            </dl>
          </div>
          <div id="ubicacion" className="bg-white border border-stone-200 rounded-[2rem] p-7 scroll-mt-24">
            <h4 className="text-xl font-serif">Ubicación</h4>
            <p className="mt-3 text-stone-700 text-sm">Nogales, Sonora · Zona Centro</p>
            <div className="mt-4 aspect-[16/9] rounded-xl overflow-hidden border border-stone-200">
              <iframe title="Mapa NILU" src="https://www.google.com/maps?q=Nogales%2C%20Sonora&output=embed" className="w-full h-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=Nogales%2C%20Sonora" target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm underline">Abrir en Google Maps</a>
          </div>
        </section>

        {/* Ordenar */}
        <section id="ordenar" className="max-w-6xl mx-auto px-5 py-12 scroll-mt-24">
          <h3 className="text-3xl font-serif mb-6">Ordenar</h3>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="grid sm:grid-cols-2 gap-6">
                {MENU.map((m) => (
                  <div key={`ord-${m.id}`} className="bg-white border border-stone-200 rounded-2xl p-4">
                    <div className="flex gap-4">
                      <ImageWithFallback src={m.img} alt={m.name} className="w-24 h-24 object-cover rounded-xl" />
                      <div className="flex-1">
                        <h4 className="font-serif text-lg">{m.name}</h4>
                        <p className="text-sm text-stone-600">{m.desc}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={()=>addToCart(m,"slice",1)} className="px-3 py-1.5 rounded-full border text-sm">Rebanada · {mxn(m.prices.slice)}</button>
                          <button type="button" onClick={()=>addToCart(m,"full",1)} className="px-3 py-1.5 rounded-full bg-stone-900 text-white text-sm">Completa · {mxn(m.prices.full)}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="bg-white border border-stone-200 rounded-2xl p-5 h-max sticky top-24">
              <h4 className="font-serif text-xl">Tu pedido</h4>
              <div className="mt-4 space-y-3 max-h-64 overflow-auto pr-1">
                {cart.length===0 && (<p className="text-sm text-stone-500">Tu carrito está vacío.</p>)}
                {cart.map(i=>(
                  <div key={i.key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm">{i.name} · {i.size==='slice'?'Rebanada':'Completa'}</p>
                      <p className="text-xs text-stone-500">{mxn(i.unitPrice)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={()=>updateQty(i.key, i.qty-1)} className="px-2 rounded-full border">-</button>
                      <input value={i.qty} onChange={(e)=>updateQty(i.key, parseInt(e.target.value||'0'))} className="w-12 text-center border rounded-md text-sm" type="number" min={1} />
                      <button type="button" onClick={()=>updateQty(i.key, i.qty+1)} className="px-2 rounded-full border">+</button>
                    </div>
                    <button type="button" onClick={()=>removeItem(i.key)} className="text-xs underline text-stone-600">Quitar</button>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t pt-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{mxn(subtotal)}</span></div>
                <div className="flex justify-between"><span>Envío</span><span>{mxn(delivery)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>{mxn(total)}</span></div>
              </div>

              <form className="mt-5 space-y-3" onSubmit={handleCheckout}>
                <input placeholder="Nombre completo" className="w-full border rounded-md px-3 py-2 text-sm" value={order.name} onChange={(e)=>setOrder({ ...order, name:e.target.value })} required />
                <input placeholder="Teléfono" className="w-full border rounded-md px-3 py-2 text-sm" value={order.phone} onChange={(e)=>setOrder({ ...order, phone:e.target.value })} required />
                <textarea placeholder="Dirección completa" className="w-full border rounded-md px-3 py-2 text-sm" value={order.address} onChange={(e)=>setOrder({ ...order, address:e.target.value })} required />
                <textarea placeholder="Notas para el pedido (opcional)" className="w-full border rounded-md px-3 py-2 text-sm" value={order.notes} onChange={(e)=>setOrder({ ...order, notes:e.target.value })} />

                <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Pago</p>
                  <div className="flex gap-3 mb-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="pay" checked={order.payMethod==='card'} onChange={()=>setOrder({ ...order, payMethod:'card' })} />
                      Tarjeta
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="pay" checked={order.payMethod==='cash'} onChange={()=>setOrder({ ...order, payMethod:'cash' })} />
                      Efectivo (pagar al recibir)
                    </label>
                  </div>
                  {order.payMethod==='card' && (
                    <div className="grid grid-cols-6 gap-2">
                      <input className="col-span-6 border rounded-md px-3 py-2 text-sm" placeholder="Número de tarjeta (16 dígitos)" value={order.cardNumber} onChange={(e)=>setOrder({ ...order, cardNumber:e.target.value })} />
                      <input className="col-span-3 border rounded-md px-3 py-2 text-sm" placeholder="MM/AA" value={order.cardExpiry} onChange={(e)=>setOrder({ ...order, cardExpiry:e.target.value })} />
                      <input className="col-span-3 border rounded-md px-3 py-2 text-sm" placeholder="CVC" value={order.cardCvc} onChange={(e)=>setOrder({ ...order, cardCvc:e.target.value })} />
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full mt-2 px-4 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-60" disabled={cart.length===0}>
                  Pagar y confirmar pedido
                </button>
              </form>
            </aside>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-stone-200">
          <div className="max-w-6xl mx-auto px-5 py-10 text-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <p>© 2025 NILU · Nogales, Sonora</p>
            <p className="text-stone-600">Hecho a mano · Masa 48h</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
