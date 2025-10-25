import Stripe from 'stripe';

const PLAN_PRICE_IDS = {
  'Starter-Monthly': 'price_1SM904HIZGyCkyOwrRW2RCOt',
  'Growing-Monthly': 'price_1SM90VHIZGyCkyOweSV2AcXH',
  'Pro-Monthly': 'price_1SM90pHIZGyCkyOwlCQfSgZH',
  'Marketer-Leader-Monthly': 'price_1SM91AHIZGyCkyOwFjP6hrbG',
  'Starter-3 Months': 'price_1SM95aHIZGyCkyOwktLUa5fo',
  'Growing-3 Months': 'price_1SM95xHIZGyCkyOwws8wrGta',
  'Pro-3 Months': 'price_1SM96FHIZGyCkyOwCwznG8nY',
  'Marketer-Leader-3 Months': 'price_1SM96aHIZGyCkyOwaNYU3RqZ',
};

const ACTIVE_PRODUCTS_PRICE_IDS = {
  0: 'price_1SM9ItHIZGyCkyOwpirO0U01',
  100: 'price_1SM9JFHIZGyCkyOwxRnFjiE3',
  200: 'price_1SM9JdHIZGyCkyOw4DY02dk8',
  300: 'price_1SM9JrHIZGyCkyOwIe8Bg1Oy',
  400: 'price_1SM9K9HIZGyCkyOwsXjQNX2s',
  500: 'price_1SM9KNHIZGyCkyOwHKqjwDiu',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { plan, period, additionalProductsPrice } = req.body;

    if (!plan || !period) {
      return res.status(400).json({ error: 'Plan and period required' });
    }

    const priceKey = `${plan}-${period}`;
    const planPriceId = PLAN_PRICE_IDS[priceKey];

    if (!planPriceId) {
      return res.status(400).json({ error: 'Invalid plan or period' });
    }

    // Only main plan in checkout
    const lineItems = [
      {
        price: planPriceId,
        quantity: 1,
      }
    ];

    const additionalPrice = additionalProductsPrice || 0;
    const activeProductsPriceId = ACTIVE_PRODUCTS_PRICE_IDS[additionalPrice];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      metadata: {
        active_products_price_id: activeProductsPriceId || '',
      },
      success_url: 'https://www.nyle.ai/pricing?success=true',
      cancel_url: 'https://www.nyle.ai/pricing?canceled=true',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
}
