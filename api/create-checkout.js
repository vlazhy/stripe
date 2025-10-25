import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  'Starter-Monthly': 'price_1SM904HIZGyCkyOwrRW2RCOt',
  'Growing-Monthly': 'price_1SM90VHIZGyCkyOweSV2AcXH',
  'Pro-Monthly': 'price_1SM90pHIZGyCkyOwlCQfSgZH',
  'Marketer-Leader-Monthly': 'price_1SM91AHIZGyCkyOwFjP6hrbG',
  'Starter-3 Months': 'price_1SM95aHIZGyCkyOwktLUa5fo',
  'Growing-3 Months': 'price_1SM95xHIZGyCkyOwws8wrGta',
  'Pro-3 Months': 'price_1SM96FHIZGyCkyOwCwznG8nY',
  'Marketer-Leader-3 Months': 'price_1SM96aHIZGyCkyOwaNYU3RqZ',
};

const ADDONS = {
  0: 'price_1SM9ItHIZGyCkyOwpirO0U01',
  100: 'price_1SM9JFHIZGyCkyOwxRnFjiE3',
  200: 'price_1SM9JdHIZGyCkyOw4DY02dk8',
  300: 'price_1SM9JrHIZGyCkyOwIe8Bg1Oy',
  400: 'price_1SM9K9HIZGyCkyOwsXjQNX2s',
  500: 'price_1SM9KNHIZGyCkyOwHKqjwDiu',
};

const ALLOWED_ORIGINS = [
  'https://www.nyle.ai',
  'https://nyle.ai',
  'https://nyle-ai-c61ba2.webflow.io'
];

const rateLimit = new Map();

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const now = Date.now();
  const requests = (rateLimit.get(ip) || []).filter(t => now - t < 60000);
  if (requests.length >= 10) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  requests.push(now);
  rateLimit.set(ip, requests);

  try {
    const { plan, period, additionalProductsPrice = 0 } = req.body;
    
    // Validate
    if (!plan || !period) {
      return res.status(400).json({ error: 'Missing plan or period' });
    }

    const priceKey = `${plan}-${period}`;
    const planPrice = PLANS[priceKey];
    if (!planPrice) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    if (![0, 100, 200, 300, 400, 500].includes(additionalProductsPrice)) {
      return res.status(400).json({ error: 'Invalid addon price' });
    }

    // Build line items
    const lineItems = [{ price: planPrice, quantity: 1 }];
    if (additionalProductsPrice > 0) {
      lineItems.push({ price: ADDONS[additionalProductsPrice], quantity: 1 });
    }

    // Create session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: 'https://www.nyle.ai/pricing?success=true',
      cancel_url: 'https://www.nyle.ai/pricing?canceled=true',
      metadata: { plan, period, additionalProductsPrice: String(additionalProductsPrice) },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Payment error' });
  }
}
