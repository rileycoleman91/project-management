// Extracts structured project data (budget items, team/subs, materials,
// project details) from an uploaded document using Claude. Gated to
// admin/editor — viewers can't reach this in the UI, but the check happens
// here too since this is a network-reachable endpoint on its own.
//
// This function does NOT write anything to the database itself — it only
// returns a proposal. The client shows that proposal for review, and the
// actual writes go through the same RLS-protected functions every other
// create/edit action in the app uses. That keeps this function's blast
// radius small: worst case it costs an API call, it can't corrupt data.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'

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

const EXTRACTION_TOOL = {
  name: 'record_extraction',
  description: 'Record structured data extracted from a construction project document.',
  input_schema: {
    type: 'object',
    properties: {
      project: {
        type: 'object',
        description: 'Project-level details found in the document. Omit any field not clearly stated.',
        properties: {
          name: { type: 'string', description: 'A short project name/label, often derived from the job address' },
          type: { type: 'string', description: 'e.g. New Build, Renovation, Remodel, Addition' },
          client: { type: 'string' },
          address: { type: 'string', description: 'Job site / project address' },
          phase: { type: 'string', description: 'Current phase, if stated' },
          start: { type: 'string', description: 'Start date as YYYY-MM-DD if determinable' },
          target: { type: 'string', description: 'Target completion date as YYYY-MM-DD if determinable (e.g. start date plus a stated duration)' },
          budgetTotal: { type: 'number' },
          pm: { type: 'string' },
          superintendent: { type: 'string' },
        },
      },
      budgetItems: {
        type: 'array',
        description: 'Budget totals at the category/division level (e.g. "Electrical", "Plumbing", "General Conditions") — not individual line items within a category.',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            budgeted: { type: 'number' },
            actual: { type: 'number', description: 'Only if an actual/spent-to-date figure is stated separately from the budgeted amount' },
          },
          required: ['category', 'budgeted'],
        },
      },
      teamMembers: {
        type: 'array',
        description: 'Subcontractors, architects, or staff mentioned by name.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Person or company name' },
            role: { type: 'string', description: 'e.g. Project Manager, Electrical Subcontractor' },
            type: { type: 'string', enum: ['Staff', 'Subcontractor'] },
            trade: { type: 'string' },
            phone: { type: 'string' },
          },
          required: ['name'],
        },
      },
      materials: {
        type: 'array',
        description: 'Only items with real product/spec detail (manufacturer, model, color, or finish) — not generic mentions.',
        items: {
          type: 'object',
          properties: {
            room: { type: 'string' },
            item: { type: 'string' },
            manufacturer: { type: 'string' },
            color: { type: 'string' },
            details: { type: 'string' },
          },
          required: ['room', 'item'],
        },
      },
      notes: { type: 'string', description: 'Brief notes on anything ambiguous or uncertain in the extraction, for a human reviewer.' },
    },
  },
}

const PROMPT = `You are extracting structured data from a construction project document (a budget estimate, proposal, cost breakdown, or similar) so it can pre-fill a construction project management app. Use the record_extraction tool to report what you find.

Guidelines:
- Only include fields/items you are reasonably confident about. Omit anything unclear rather than guessing.
- For budgetItems, extract totals at the category/division level, not individual line items within a category.
- Dollar amounts should be plain numbers with no $ or commas.
- Dates should be YYYY-MM-DD when determinable.
- For teamMembers, "type" should be "Staff" for the contractor's own team/PM and "Subcontractor" for outside trade companies.
- Use the "notes" field to flag anything ambiguous for a human reviewer.`

async function parseFile(filename: string, mimeType: string, bytes: Uint8Array) {
  const ext = filename.toLowerCase().split('.').pop() || ''

  if (ext === 'pdf') {
    return { kind: 'document' as const, mediaType: 'application/pdf', base64: encodeBase64(bytes) }
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return { kind: 'image' as const, mediaType: mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`, base64: encodeBase64(bytes) }
  }
  if (ext === 'docx') {
    const mammoth = await import('npm:mammoth@1.8.0')
    const result = await mammoth.extractRawText({ buffer: bytes })
    return { kind: 'text' as const, text: result.value }
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('npm:xlsx@0.18.5')
    const wb = XLSX.read(bytes, { type: 'buffer' })
    const parts: string[] = []
    for (const sheetName of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName])
      if (csv.trim()) parts.push(`## Sheet: ${sheetName}\n${csv}`)
    }
    if (!parts.length) throw new Error('That spreadsheet appears to be empty.')
    return { kind: 'text' as const, text: parts.join('\n\n') }
  }
  if (ext === 'doc') {
    throw new Error('Legacy .doc files aren\'t supported yet — please save as .docx and try again.')
  }
  throw new Error(`Unsupported file type: .${ext}`)
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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerData?.user) {
      return json({ error: 'Invalid session' }, 401)
    }

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (!callerProfile || !['admin', 'editor'].includes(callerProfile.role)) {
      return json({ error: 'You need edit access to use document extraction' }, 403)
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return json({ error: 'AI extraction is not configured yet — an admin needs to add ANTHROPIC_API_KEY as a Supabase secret.' }, 500)
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return json({ error: 'No file was uploaded' }, 400)
    }
    if (file.size > 15 * 1024 * 1024) {
      return json({ error: 'That file is too large (15MB max).' }, 400)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    let parsed
    try {
      parsed = await parseFile(file.name, file.type, bytes)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Could not read that file' }, 400)
    }

    let content: unknown[]
    if (parsed.kind === 'document') {
      content = [
        { type: 'document', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 } },
        { type: 'text', text: PROMPT },
      ]
    } else if (parsed.kind === 'image') {
      content = [
        { type: 'image', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 } },
        { type: 'text', text: PROMPT },
      ]
    } else {
      content = [{ type: 'text', text: `${PROMPT}\n\n---DOCUMENT TEXT---\n${parsed.text}` }]
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 8192,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: 'record_extraction' },
        messages: [{ role: 'user', content }],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return json({ error: `AI extraction failed: ${errText.slice(0, 300)}` }, 502)
    }

    const data = await resp.json()
    const toolUse = (data.content || []).find((b: { type: string }) => b.type === 'tool_use')
    if (!toolUse) {
      return json({ error: 'AI did not return structured data — try a different document.' }, 502)
    }

    return json({ extraction: toolUse.input })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
