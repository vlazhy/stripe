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

    // ДОБАВЛЕНО: логи для отладки
    console.log('📦 Received:', { plan, period, additionalProductsPrice });

    if (!plan || !period) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Plan and period required',
        received: { plan, period }
      });
    }

    const priceKey = `${plan}-${period}`;
    console.log('🔑 Price key:', priceKey);

    const planPriceId = PLAN_PRICE_IDS[priceKey];

    if (!planPriceId) {
      console.error('❌ Invalid price key:', priceKey);
      return res.status(400).json({ 
        error: 'Invalid plan or period',
        priceKey,
        availableKeys: Object.keys(PLAN_PRICE_IDS)
      });
    }

    const lineItems = [
      {
        price: planPriceId,
        quantity: 1,
      }
    ];

    const additionalPrice = additionalProductsPrice || 0;
    const activeProductsPriceId = ACTIVE_PRODUCTS_PRICE_IDS[additionalPrice];

    console.log('✅ Creating session with:', { planPriceId, activeProductsPriceId });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      metadata: {
        active_products_price_id: activeProductsPriceId || '',
        additional_products_price: additionalPrice,
      },
      success_url: 'https://www.nyle.ai/pricing?success=true',
      cancel_url: 'https://www.nyle.ai/pricing?canceled=true',
    });

    console.log('✅ Session created:', session.id);
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
}
