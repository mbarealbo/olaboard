import Stripe from 'npm:stripe@17'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  // Verify JWT and get user
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const userId = user.id

  try {
    // 1. Cancel Stripe subscription if exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profile?.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 5 })
        for (const sub of subscriptions.data) {
          await stripe.subscriptions.cancel(sub.id)
        }
      } catch (_) {
        // Stripe errors are non-blocking
      }
    }

    // 2. Delete storage files (images bucket, path: userId/*)
    const { data: files } = await supabase.storage.from('images').list(userId)
    if (files && files.length > 0) {
      const paths = files.map(f => `${userId}/${f.name}`)
      await supabase.storage.from('images').remove(paths)
    }

    // 3. Delete auth user — cascades profiles, canvases, cards, connections
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
