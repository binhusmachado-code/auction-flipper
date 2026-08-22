import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.57.4'

type AdminAction = 'invite' | 'update' | 'password_reset' | 'delete'

const primaryAppUrl = 'https://auction-flipper.vercel.app'
const allowedOrigins = new Set([
  primaryAppUrl,
  'https://binhusmachado-code.github.io',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:5173',
])

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function futureIso(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  if (!Number.isFinite(date.getTime()) || date <= new Date()) {
    throw new Error('Access expiration must be in the future')
  }
  return date.toISOString()
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : primaryAppUrl,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) })
}

function requestOrigin(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return allowedOrigins.has(origin) ? origin : primaryAppUrl
}

function unauthorizedStatus(error: unknown) {
  if (!(error instanceof Error)) return 500
  if (/Authentication|required|session|token/i.test(error.message)) return 401
  if (/Administrator/i.test(error.message)) return 403
  return 500
}

async function authenticatedAdmin(request: Request) {
  const authorization = request.headers.get('Authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Authentication required')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Server configuration is incomplete')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error('Your session is no longer valid')

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, account_status')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (profile?.role !== 'admin' || profile.account_status !== 'active') {
    throw new Error('Administrator access is required')
  }

  return { user: data.user, admin }
}

async function loadDashboard(admin: SupabaseClient, page: number) {
  const perPage = 100
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page, perPage })
  if (usersError) throw usersError

  const ids = usersData.users.map((user) => user.id)
  const [profilesResult, subscriptionsResult, sourceHealthResult, auditResult, bidWorkflowsResult] = await Promise.all([
    ids.length
      ? admin.from('profiles').select('id, email, display_name, role, account_status, manual_access_until, created_at').in('id', ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? admin.from('subscriptions').select('user_id, plan, status, current_period_end, cancel_at_period_end').in('user_id', ids)
      : Promise.resolve({ data: [], error: null }),
    admin.from('source_health').select('source_id, county, status, record_count, last_success_at, error_message').order('updated_at', { ascending: false }).limit(20),
    admin.from('admin_audit_log').select('id, actor_user_id, target_user_id, action, details, created_at').order('created_at', { ascending: false }).limit(20),
    admin.from('bid_workflows').select('id, user_id, property_id, property_snapshot, status, max_bid, payment_deadline, updated_at').order('updated_at', { ascending: false }).limit(20),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (subscriptionsResult.error) throw subscriptionsResult.error
  if (sourceHealthResult.error) throw sourceHealthResult.error
  if (auditResult.error) throw auditResult.error
  if (bidWorkflowsResult.error) throw bidWorkflowsResult.error

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
  const subscriptions = new Map((subscriptionsResult.data ?? []).map((subscription) => [subscription.user_id, subscription]))
  const now = Date.now()
  const customers = usersData.users.map((authUser) => {
    const profile = profiles.get(authUser.id)
    const subscription = subscriptions.get(authUser.id)
    const manualUntil = profile?.manual_access_until ? new Date(profile.manual_access_until).getTime() : 0
    const subscriptionUntil = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : 0
    const subscribed = ['active', 'trialing'].includes(subscription?.status ?? '') && subscriptionUntil > now
    const accessStatus = profile?.account_status === 'suspended'
      ? 'suspended'
      : profile?.role === 'admin' || manualUntil > now
        ? 'manual'
        : subscribed
          ? 'subscription'
          : 'inactive'

    return {
      id: authUser.id,
      email: authUser.email ?? profile?.email ?? '',
      displayName: profile?.display_name ?? '',
      role: profile?.role === 'admin' ? 'admin' : 'member',
      accountStatus: profile?.account_status === 'suspended' ? 'suspended' : 'active',
      accessStatus,
      manualAccessUntil: profile?.manual_access_until ?? null,
      plan: subscription?.plan ?? null,
      subscriptionStatus: subscription?.status ?? 'none',
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      createdAt: authUser.created_at,
      lastSignInAt: authUser.last_sign_in_at ?? null,
    }
  })

  return {
    customers,
    page,
    hasMore: usersData.users.length === perPage,
    sourceHealth: sourceHealthResult.data ?? [],
    auditLog: auditResult.data ?? [],
    bidWorkflows: (bidWorkflowsResult.data ?? []).map((workflow) => ({
      id: workflow.id,
      userId: workflow.user_id,
      customerEmail: usersData.users.find((user) => user.id === workflow.user_id)?.email ?? '',
      propertyId: workflow.property_id,
      address: String((workflow.property_snapshot as Record<string, unknown> | null)?.address ?? workflow.property_id),
      county: String((workflow.property_snapshot as Record<string, unknown> | null)?.county ?? ''),
      status: workflow.status,
      maxBid: workflow.max_bid === null ? null : Number(workflow.max_bid),
      paymentDeadline: workflow.payment_deadline,
      updatedAt: workflow.updated_at,
    })),
  }
}

async function logAction(
  admin: SupabaseClient,
  actor: User,
  targetUserId: string,
  action: string,
  details: Record<string, unknown>,
) {
  const { error } = await admin.from('admin_audit_log').insert({
    actor_user_id: actor.id,
    target_user_id: targetUserId,
    action,
    details,
  })
  if (error) throw error
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (!['GET', 'POST'].includes(request.method)) return json(request, 405, { error: 'Method not allowed' })

  try {
    const { user: actor, admin } = await authenticatedAdmin(request)

    if (request.method === 'GET') {
      const page = Math.max(1, Number(new URL(request.url).searchParams.get('page')) || 1)
      return json(request, 200, await loadDashboard(admin, page))
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const action = cleanText(body.action, 32) as AdminAction
    if (!['invite', 'update', 'password_reset', 'delete'].includes(action)) {
      return json(request, 400, { error: 'Choose a valid admin action' })
    }

    if (action === 'invite') {
      const email = cleanText(body.email, 320).toLowerCase()
      const displayName = cleanText(body.displayName, 120)
      if (!validEmail(email)) return json(request, 400, { error: 'Enter a valid customer email' })

      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${requestOrigin(request)}/#/account`,
        data: displayName ? { display_name: displayName } : undefined,
      })
      if (error || !data.user) throw error ?? new Error('Customer invitation failed')

      const { error: profileError } = await admin.from('profiles').upsert({
        id: data.user.id,
        email,
        display_name: displayName || null,
        role: 'member',
        account_status: 'active',
        invited_by: actor.id,
        updated_at: new Date().toISOString(),
      })
      if (profileError) throw profileError

      await logAction(admin, actor, data.user.id, 'customer_invited', { email })
      return json(request, 201, { message: `Invitation sent to ${email}` })
    }

    const userId = cleanText(body.userId, 64)
    if (!userId) return json(request, 400, { error: 'Customer ID is required' })

    const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId)
    if (targetError || !targetData.user) return json(request, 404, { error: 'Customer was not found' })
    const targetEmail = targetData.user.email ?? ''

    if (action === 'password_reset') {
      if (!targetEmail) return json(request, 400, { error: 'Customer has no email address' })
      const { error } = await admin.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${requestOrigin(request)}/#/account`,
      })
      if (error) throw error
      await logAction(admin, actor, userId, 'password_reset_sent', { email: targetEmail })
      return json(request, 200, { message: `Password reset sent to ${targetEmail}` })
    }

    if (action === 'delete') {
      if (userId === actor.id) return json(request, 400, { error: 'You cannot delete your own owner account' })
      await logAction(admin, actor, userId, 'customer_deleted', { email: targetEmail, deleted_user_id: userId })
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
      return json(request, 200, { message: `${targetEmail || 'Customer'} deleted` })
    }

    const email = cleanText(body.email, 320).toLowerCase()
    const displayName = cleanText(body.displayName, 120)
    const role = body.role === 'admin' ? 'admin' : 'member'
    const accountStatus = body.accountStatus === 'suspended' ? 'suspended' : 'active'
    const manualAccessUntil = futureIso(body.manualAccessUntil)

    if (email && !validEmail(email)) return json(request, 400, { error: 'Enter a valid customer email' })
    if (userId === actor.id && (role !== 'admin' || accountStatus !== 'active')) {
      return json(request, 400, { error: 'You cannot remove or suspend your own owner access' })
    }

    if (email && email !== targetEmail.toLowerCase()) {
      const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true })
      if (error) throw error
    }

    const { error: updateError } = await admin.from('profiles').update({
      email: email || targetEmail,
      display_name: displayName || null,
      role,
      account_status: accountStatus,
      manual_access_until: manualAccessUntil,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    if (updateError) throw updateError

    await logAction(admin, actor, userId, 'customer_updated', {
      email: email || targetEmail,
      role,
      account_status: accountStatus,
      manual_access_until: manualAccessUntil,
    })
    return json(request, 200, { message: `${email || targetEmail || 'Customer'} updated` })
  } catch (error) {
    console.error('admin-customers', error)
    const status = unauthorizedStatus(error)
    const message = status === 500 ? 'Unable to complete the admin request' : (error as Error).message
    return json(request, status, { error: message })
  }
})
