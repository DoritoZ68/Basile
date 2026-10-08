import { getCourse, getPack, getProduct } from "@/lib/catalog";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: "payments_disabled" }, { status: 503 });
  }

  let ids: unknown;
  try {
    ({ items: ids } = await request.json());
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!Array.isArray(ids)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // Prices always come from the catalogue, never from the client.
  const products = [...new Set(ids.filter((id): id is string => typeof id === "string"))]
    .map((id) => getProduct(id))
    .filter((p) => p !== undefined);
  if (products.length === 0) {
    return Response.json({ error: "empty_cart" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      line_items: products.map((p) => ({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: p.price * 100,
          product_data: {
            name: p.kind === "pack" ? `${p.title} (pack)` : p.title,
            description: p.kind === "pack" ? getPack(p.id)?.tagline : getCourse(p.id)?.subtitle,
          },
        },
      })),
      allow_promotion_codes: true,
      metadata: { items: products.map((p) => p.id).join(",") },
      success_url: `${origin}/commande/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/panier`,
    });
  } catch (err) {
    console.error("Stripe checkout session creation failed", err);
    return Response.json({ error: "stripe_error" }, { status: 502 });
  }

  return Response.json({ url: session.url });
}
