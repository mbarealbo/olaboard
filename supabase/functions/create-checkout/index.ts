import Stripe from 'npm:stripe@17'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const PRICES = {
  monthly: 'price_1TN7O2Lly3rgqBMTGBKcjgyL',
  yearly:  'price_1TN7hWLly3rgqBMTYW2Knqil',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() })
  }

  try {
    const { priceKey, userId, userEmail, returnUrl } = await req.json()

    if (!priceKey || !userId) {
      return json({ error: 'Missing priceKey or userId' }, 400)
    }

    const priceId = PRICES[priceKey as keyof typeof PRICES]
    if (!priceId) return json({ error: 'Invalid priceKey' }, 400)

    // Retrieve or reuse existing Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: userEmail, metadata: { user_id: userId } })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${returnUrl}?upgrade=success`,
      cancel_url:  `${returnUrl}?upgrade=cancelled`,
      metadata: { user_id: userId },
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    return json({ error: String(err) }, 500)
  }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}
