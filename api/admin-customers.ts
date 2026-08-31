import { allowAppOrigin, authenticatedAdmin, requestOrigin, type ApiRequest, type ApiResponse } from './_lib/server.js'

type AdminAction = 'invite' | 'update' | 'password_reset' | 'delete'

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function futureIso(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  if (!Number.isFinite(date.getTime()) || date <= new Date()) throw new Error('Access expiration must be in the future')
  return date.toISOString()
}

function unauthorizedStatus(error: unknown) {
  if (!(error instanceof Error)) return 500
  if (/Authentication|required|session/i.test(error.message)) return 401
  if (/Administrator/i.test(error.message)) return 403
  return 500
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!allowAppOrigin(req, res)) return
  if (!['GET', 'POST'].includes(req.method ?? '')) return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user: actor, admin } = await authenticatedAdmin(req)

    if (req.method === 'GET') {
      const page = Math.max(1, Number(new URL(req.url ?? '/', 'https://local.invalid').searchParams.get('page')) || 1)
      const perPage = 100
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page, perPage })
      if (usersError) throw usersError

      const ids = usersData.users.map((user) => user.id)
      const [profilesResult, subscriptionsResult, sourceHealthResult, auditResult, bidWorkflowsResult] = await Promise.all([
        ids.length
          ? admin.from('profiles').select('id, email, display_name, role, account_status, manual_access_until, created_at').in('id', ids)
          : Promise.resolve({ data: [], error: null }),
          ids.length
          ? admin.from('subscriptions').select('user_id, plan, tier, billing_interval, status, current_period_end, cancel_at_period_end').in('user_id', ids)
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
          tier: subscription?.tier ?? 'free',
          subscriptionStatus: subscription?.status ?? 'none',
          currentPeriodEnd: subscription?.current_period_end ?? null,
          cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
          createdAt: authUser.created_at,
          lastSignInAt: authUser.last_sign_in_at ?? null,
        }
      })

      return res.status(200).json({
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
      })
    }

    const action = cleanText(req.body?.action, 32) as AdminAction
    if (!['invite', 'update', 'password_reset', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'Choose a valid admin action' })
    }

    if (action === 'invite') {
      const email = cleanText(req.body?.email, 320).toLowerCase()
      const displayName = cleanText(req.body?.displayName, 120)
      if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid customer email' })

      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${requestOrigin(req)}/#/account`,
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

      await admin.from('admin_audit_log').insert({
        actor_user_id: actor.id,
        target_user_id: data.user.id,
        action: 'customer_invited',
        details: { email },
      })
      return res.status(201).json({ message: `Invitation sent to ${email}` })
    }

    const userId = cleanText(req.body?.userId, 64)
    if (!userId) return res.status(400).json({ error: 'Customer ID is required' })

    const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId)
    if (targetError || !targetData.user) return res.status(404).json({ error: 'Customer was not found' })
    const targetEmail = targetData.user.email ?? ''

    if (action === 'password_reset') {
      if (!targetEmail) return res.status(400).json({ error: 'Customer has no email address' })
      const { error } = await admin.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${requestOrigin(req)}/#/account`,
      })
      if (error) throw error
      await admin.from('admin_audit_log').insert({
        actor_user_id: actor.id,
        target_user_id: userId,
        action: 'password_reset_sent',
        details: { email: targetEmail },
      })
      return res.status(200).json({ message: `Password reset sent to ${targetEmail}` })
    }

    if (action === 'delete') {
      if (userId === actor.id) return res.status(400).json({ error: 'You cannot delete your own owner account' })
      await admin.from('admin_audit_log').insert({
        actor_user_id: actor.id,
        target_user_id: userId,
        action: 'customer_deleted',
        details: { email: targetEmail, deleted_user_id: userId },
      })
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
      return res.status(200).json({ message: `${targetEmail || 'Customer'} deleted` })
    }

    const email = cleanText(req.body?.email, 320).toLowerCase()
    const displayName = cleanText(req.body?.displayName, 120)
    const role = req.body?.role === 'admin' ? 'admin' : 'member'
    const accountStatus = req.body?.accountStatus === 'suspended' ? 'suspended' : 'active'
    const manualAccessUntil = futureIso(req.body?.manualAccessUntil)

    if (email && !validEmail(email)) return res.status(400).json({ error: 'Enter a valid customer email' })
    if (userId === actor.id && (role !== 'admin' || accountStatus !== 'active')) {
      return res.status(400).json({ error: 'You cannot remove or suspend your own owner access' })
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

    await admin.from('admin_audit_log').insert({
      actor_user_id: actor.id,
      target_user_id: userId,
      action: 'customer_updated',
      details: { email: email || targetEmail, role, account_status: accountStatus, manual_access_until: manualAccessUntil },
    })
    return res.status(200).json({ message: `${email || targetEmail || 'Customer'} updated` })
  } catch (error) {
    console.error('admin-customers', error)
    const status = unauthorizedStatus(error)
    const message = status === 500 ? 'Unable to complete the admin request' : (error as Error).message
    return res.status(status).json({ error: message })
  }
}
