// Updates an existing user's email and/or full name. Only callable by an
// existing admin. Email changes have to go through the Supabase Auth admin
// API (auth.users is the source of truth for login), not just the profiles
// mirror column, or the two would drift out of sync — that's why this can't
// be a plain client-side update like full name can.

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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerData?.user) {
      return json({ error: 'Invalid session' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Admin access required' }, 403)
    }

    const { userId, email, fullName } = await req.json()

    if (!userId) {
      return json({ error: 'userId is required' }, 400)
    }

    if (email) {
      const { error: emailErr } = await adminClient.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      })
      if (emailErr) {
        return json({ error: emailErr.message }, 400)
      }
    }

    const profileUpdate: Record<string, unknown> = {}
    if (email) profileUpdate.email = email
    if (fullName !== undefined) profileUpdate.full_name = fullName || null

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileErr } = await adminClient.from('profiles').update(profileUpdate).eq('id', userId)
      if (profileErr) {
        return json({ error: profileErr.message }, 400)
      }
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
