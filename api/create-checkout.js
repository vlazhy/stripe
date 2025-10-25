import Stripe from 'stripe';

const PRICE_IDS = {
  'Starter-Monthly': 'price_1SM904HIZGyCkyOwrRW2RCOt',
  'Growing-Monthly': 'price_1SM90VHIZGyCkyOweSV2AcXH',
  'Pro-Monthly': 'price_1SM90pHIZGyCkyOwlCQfSgZH',
  'Marketer-Leader-Monthly': 'price_1SM91AHIZGyCkyOwFjP6hrbG',
  'Starter-3 Months': 'price_1SM95aHIZGyCkyOwktLUa5fo',
  'Growing-3 Months': 'price_1SM95xHIZGyCkyOwws8wrGta',
  'Pro-3 Months': 'price_1SM96FHIZGyCkyOwCwznG8nY',
  'Marketer-Leader-3 Months': 'price_1SM96aHIZGyCkyOwaNYU3RqZ',
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
    const { plan, period, additionalProducts } = req.body;

    if (!plan || !period) {
      return res.status(400).json({ error: 'Plan and period required' });
    }

    const priceKey = `${plan}-${period}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or period' });
    }

    const lineItems = [
      {
        price: priceId,
        quantity: 1,
      }
    ];

    // Additional products as one-time fee
    if (additionalProducts && additionalProducts > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Additional Products',
          },
          unit_amount: Math.round(additionalProducts * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: 'https://www.nyle.ai/pricing?success=true',
      cancel_url: 'https://www.nyle.ai/pricing?canceled=true',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
}
