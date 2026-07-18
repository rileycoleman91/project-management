// Deployed 2026-07-16 via the Supabase MCP connector (deploy_edge_function).
// Creates a new Supabase Auth user. Only callable by an existing admin —
// uses the service-role key, which must never be shipped to the browser,
// so this has to live server-side as an edge function rather than a plain
// client-side API call.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Resolve the caller's identity from their own JWT — never trust a
    // client-supplied user id for the admin check below.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerData?.user) {
      return json({ error: 'Invalid session' }, 401)
    }

    // Service-role client — only ever used here, server-side. Never expose
    // this key to the browser bundle.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Admin access required' }, 403)
    }

    const { email, password, fullName, role } = await req.json()

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400)
    }
    if (role && !['admin', 'editor', 'viewer'].includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    })

    if (createErr) {
      return json({ error: createErr.message }, 400)
    }

    // The handle_new_user trigger already created the profile row with
    // role='viewer' — apply the requested full name / role on top of that.
    await adminClient
      .from('profiles')
      .update({ full_name: fullName || null, role: role || 'viewer' })
      .eq('id', created.user.id)

    return json({ id: created.user.id, email: created.user.email })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
