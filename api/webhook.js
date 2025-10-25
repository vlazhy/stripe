import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const buf = await req.body;
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    if (session.metadata.active_products_price_id && session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: session.metadata.active_products_price_id,
        });

        console.log('Added active products to subscription:', subscription.id);
      } catch (error) {
        console.error('Error adding active products:', error);
      }
    }
  }

  res.status(200).json({ received: true });
}
