export default async (req) => {
 if(req.method!=="POST") return new Response("Method not allowed",{status:405});
 const key=Netlify.env.get("STRIPE_SECRET_KEY"); if(!key) return new Response(JSON.stringify({error:"Missing key"}),{status:500});
 const catalog={p1:["AI Translation Earbuds",4999],p2:["Smart Mini Projector",8999],p3:["Magnetic 3-in-1 Charger",3499],p4:["AI Smart Keyboard",5999],p5:["Temperature Control Mug",2999],p6:["Tech Travel Organizer",1999]};
 const body=await req.json(), q=new URLSearchParams(); q.set("mode","payment"); q.set("success_url",new URL(req.url).origin+"/?payment=success"); q.set("cancel_url",new URL(req.url).origin+"/?payment=cancelled"); q.set("billing_address_collection","required");
 let i=0; for(const x of body.items||[]){const p=catalog[x.id];if(!p)continue;q.set(`line_items[${i}][price_data][currency]`,"inr");q.set(`line_items[${i}][price_data][product_data][name]`,p[0]);q.set(`line_items[${i}][price_data][unit_amount]`,String(p[1]*100));q.set(`line_items[${i}][quantity]`,String(Math.max(1,Math.min(20,x.qty||1))));i++}
 const r=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/x-www-form-urlencoded"},body:q});const d=await r.json();return new Response(JSON.stringify(d),{status:r.ok?200:400,headers:{"content-type":"application/json"}});
};