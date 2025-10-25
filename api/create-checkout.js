import Stripe from 'stripe';

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
    const { amount, plan, period, additionalProducts } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const lineItems = [];

    // Main plan
    if (plan) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${plan} Plan - ${period}`,
          },
          unit_amount: Math.round((amount - (additionalProducts || 0)) * 100),
        },
        quantity: 1,
      });
    }

    // Additional products
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
      mode: 'payment',
      success_url: 'https://www.nyle.ai/pricing?success=true',
      cancel_url: 'https://www.nyle.ai/pricing?canceled=true',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
}
