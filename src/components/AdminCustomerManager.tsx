import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  MailPlus,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound,
  Gavel,
  X,
} from 'lucide-react'
import { loadAdminDashboard, runAdminAction } from '../hooks/useAccount'
import type { AdminCustomer, AdminDashboardData, CustomerAccessStatus } from '../types/account'
import { useToast } from './ToastProvider'

type DialogState =
  | { type: 'invite' }
  | { type: 'edit'; customer: AdminCustomer }
  | { type: 'reset'; customer: AdminCustomer }
  | { type: 'delete'; customer: AdminCustomer }
  | null

const emptyData: AdminDashboardData = {
  customers: [],
  page: 1,
  hasMore: false,
  sourceHealth: [],
  auditLog: [],
  bidWorkflows: [],
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en-US', includeTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }
  ).format(date)
}

function accessLabel(status: CustomerAccessStatus) {
  if (status === 'subscription') return 'Paid access'
  if (status === 'manual') return 'Owner grant'
  if (status === 'suspended') return 'Suspended'
  return 'No access'
}

function accessClass(status: CustomerAccessStatus) {
  if (status === 'subscription') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
  if (status === 'manual') return 'border-sky-500/30 bg-sky-500/10 text-sky-400'
  if (status === 'suspended') return 'border-red-500/30 bg-red-500/10 text-red-400'
  return 'border-zinc-700 bg-zinc-800 text-zinc-400'
}

function auditLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase())
}

export default function AdminCustomerManager({ ownerId }: { ownerId: string }) {
  const { showToast } = useToast()
  const [data, setData] = useState<AdminDashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  const customers = data.customers ?? []
  const bidWorkflows = data.bidWorkflows ?? []
  const sourceHealth = data.sourceHealth ?? []
  const auditLog = data.auditLog ?? []

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loadAdminDashboard())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load owner dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return customers
    return customers.filter((customer) =>
      customer.email.toLowerCase().includes(normalized)
      || customer.displayName.toLowerCase().includes(normalized)
      || customer.role.includes(normalized)
      || customer.accessStatus.includes(normalized)
    )
  }, [customers, query])

  const stats = useMemo(() => ({
    total: customers.length,
    access: customers.filter((customer) => customer.accessStatus === 'manual' || customer.accessStatus === 'subscription').length,
    inactive: customers.filter((customer) => customer.accessStatus === 'inactive').length,
    suspended: customers.filter((customer) => customer.accessStatus === 'suspended').length,
    bidWorkflows: bidWorkflows.length,
  }), [bidWorkflows.length, customers])

  const execute = async (payload: Record<string, unknown>) => {
    setWorking(true)
    try {
      const result = await runAdminAction(payload)
      showToast(result.message ?? 'Customer account updated', 'success')
      setDialog(null)
      await refresh()
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Admin action failed', 'error')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Customers', value: stats.total, icon: UsersRound, tone: 'text-zinc-100' },
          { label: 'With access', value: stats.access, icon: UserRoundCheck, tone: 'text-emerald-400' },
          { label: 'No access', value: stats.inactive, icon: KeyRound, tone: 'text-amber-400' },
          { label: 'Suspended', value: stats.suspended, icon: AlertTriangle, tone: 'text-red-400' },
          { label: 'Bid workflows', value: stats.bidWorkflows, icon: Gavel, tone: 'text-sky-400' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-4">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500">
              {label}<Icon className="h-4 w-4" />
            </div>
            <div className={`mt-2 text-2xl font-extrabold ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-6" aria-labelledby="customer-management-title">
        <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="customer-management-title" className="text-base font-bold text-white">Customer management</h3>
            <p className="mt-1 text-xs text-zinc-500">Invite, grant access, suspend, reset, or remove customer accounts.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh customer list" title="Refresh customer list" className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => setDialog({ type: 'invite' })} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400">
              <MailPlus className="h-4 w-4" /> Invite customer
            </button>
          </div>
        </div>

        <div className="relative my-4 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-9 text-sm text-white outline-none focus:border-emerald-500" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear customer search" className="absolute right-2 top-2 rounded-md p-1 text-zinc-600 hover:text-white"><X className="h-4 w-4" /></button>}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" />Loading customers</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-zinc-950 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last sign-in</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900/35">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-800/35">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-zinc-800 text-xs font-extrabold text-zinc-300">{(customer.displayName || customer.email).slice(0, 1).toUpperCase()}</div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-200">{customer.displayName || 'No display name'}</div>
                          <div className="truncate text-xs text-zinc-500">{customer.email}</div>
                        </div>
                        {customer.role === 'admin' && <ShieldCheck className="h-4 w-4 flex-none text-emerald-400" aria-label="Administrator" />}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${accessClass(customer.accessStatus)}`}>{accessLabel(customer.accessStatus)}</span></td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{customer.plan ? `${customer.plan} / ${customer.subscriptionStatus}` : customer.manualAccessUntil ? `Until ${formatDate(customer.manualAccessUntil)}` : 'None'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(customer.lastSignInAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setDialog({ type: 'edit', customer })} title="Edit customer" aria-label={`Edit ${customer.email}`} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setDialog({ type: 'reset', customer })} title="Send password reset" aria-label={`Send password reset to ${customer.email}`} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-sky-400"><KeyRound className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setDialog({ type: 'delete', customer })} disabled={customer.id === ownerId} title={customer.id === ownerId ? 'You cannot delete your own owner account' : 'Delete customer'} aria-label={`Delete ${customer.email}`} className="rounded-md p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-25"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">No customers match that search.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {data.hasMore && <p className="mt-2 text-xs text-amber-400">Showing the first 100 accounts. Additional pagination will be added before the customer list exceeds this limit.</p>}
      </section>

      <section className="mt-7 border-t border-zinc-800 pt-6" aria-labelledby="bid-activity-title">
        <h3 id="bid-activity-title" className="text-sm font-bold text-white">Recent customer bid activity</h3>
        <div className="mt-3 overflow-x-auto border-y border-zinc-800">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600"><tr><th className="py-3 pr-4">Customer</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Max bid</th><th className="py-3 pl-4 text-right">Updated</th></tr></thead>
            <tbody className="divide-y divide-zinc-800">{bidWorkflows.slice(0, 10).map((workflow) => <tr key={workflow.id}><td className="py-3 pr-4 text-zinc-400">{workflow.customerEmail || workflow.userId}</td><td className="px-4 py-3"><div className="font-semibold text-zinc-300">{workflow.address}</div><div className="mt-0.5 text-zinc-600">{workflow.county}</div></td><td className="px-4 py-3 font-semibold capitalize text-sky-400">{workflow.status.replace(/_/g, ' ')}</td><td className="px-4 py-3 text-zinc-400">{workflow.maxBid === null ? 'Not set' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(workflow.maxBid)}</td><td className="py-3 pl-4 text-right text-zinc-600">{formatDate(workflow.updatedAt, true)}</td></tr>)}{bidWorkflows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-zinc-600">No customer bid workflows yet.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <div className="mt-7 grid gap-7 border-t border-zinc-800 pt-6 lg:grid-cols-2">
        <section aria-labelledby="source-health-title">
          <h3 id="source-health-title" className="text-sm font-bold text-white">Source health</h3>
          <div className="mt-3 divide-y divide-zinc-800 border-y border-zinc-800">
            {sourceHealth.slice(0, 6).map((source) => (
              <div key={source.source_id} className="flex items-center justify-between gap-4 py-3 text-xs">
                <div><div className="font-semibold text-zinc-300">{source.county}</div><div className="mt-0.5 text-zinc-600">{source.source_id}</div></div>
                <div className="text-right"><div className={source.status === 'live' ? 'font-bold text-emerald-400' : 'font-bold text-amber-400'}>{source.status}</div><div className="mt-0.5 text-zinc-600">{source.record_count} records</div></div>
              </div>
            ))}
            {sourceHealth.length === 0 && <div className="py-8 text-center text-xs text-zinc-600">No source-health records yet.</div>}
          </div>
        </section>

        <section aria-labelledby="admin-activity-title">
          <h3 id="admin-activity-title" className="text-sm font-bold text-white">Recent owner activity</h3>
          <div className="mt-3 divide-y divide-zinc-800 border-y border-zinc-800">
            {auditLog.slice(0, 6).map((entry) => (
              <div key={entry.id} className="py-3 text-xs">
                <div className="font-semibold text-zinc-300">{auditLabel(entry.action)}</div>
                <div className="mt-1 flex justify-between gap-3 text-zinc-600"><span className="truncate">{String(entry.details.email ?? entry.target_user_id ?? 'Account')}</span><span className="flex-none">{formatDate(entry.created_at, true)}</span></div>
              </div>
            ))}
            {auditLog.length === 0 && <div className="py-8 text-center text-xs text-zinc-600">No owner actions recorded yet.</div>}
          </div>
        </section>
      </div>

      {dialog && (
        <AdminDialog
          dialog={dialog}
          working={working}
          ownerId={ownerId}
          onClose={() => !working && setDialog(null)}
          onExecute={execute}
        />
      )}
    </div>
  )
}

function AdminDialog({ dialog, working, ownerId, onClose, onExecute }: {
  dialog: Exclude<DialogState, null>
  working: boolean
  ownerId: string
  onClose: () => void
  onExecute: (payload: Record<string, unknown>) => Promise<void>
}) {
  const customer = dialog.type === 'invite' ? null : dialog.customer
  const [email, setEmail] = useState(customer?.email ?? '')
  const [displayName, setDisplayName] = useState(customer?.displayName ?? '')
  const [role, setRole] = useState<'member' | 'admin'>(customer?.role ?? 'member')
  const [accountStatus, setAccountStatus] = useState<'active' | 'suspended'>(customer?.accountStatus ?? 'active')
  const [manualAccessDate, setManualAccessDate] = useState(customer?.manualAccessUntil?.slice(0, 10) ?? '')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (dialog.type === 'invite') return void onExecute({ action: 'invite', email, displayName })
    if (dialog.type === 'edit') {
      const manualAccessUntil = manualAccessDate ? new Date(`${manualAccessDate}T23:59:59`).toISOString() : null
      return void onExecute({ action: 'update', userId: customer!.id, email, displayName, role, accountStatus, manualAccessUntil })
    }
  }

  const title = dialog.type === 'invite' ? 'Invite customer'
    : dialog.type === 'edit' ? 'Edit customer'
      : dialog.type === 'reset' ? 'Send password reset'
        : 'Delete customer'

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button type="button" onClick={onClose} disabled={working} aria-label="Close customer action" className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {(dialog.type === 'invite' || dialog.type === 'edit') ? (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" /></label>
            {dialog.type === 'invite' ? (
              <p className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-relaxed text-sky-300">The customer will receive a secure invitation email and choose their own password.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Role</span><select value={role} disabled={customer?.id === ownerId} onChange={(event) => setRole(event.target.value as 'member' | 'admin')} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500"><option value="member">Customer</option><option value="admin">Administrator</option></select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Account status</span><select value={accountStatus} disabled={customer?.id === ownerId} onChange={(event) => setAccountStatus(event.target.value as 'active' | 'suspended')} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500"><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
                <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Owner-granted access until</span><input type="date" value={manualAccessDate} onChange={(event) => setManualAccessDate(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" /><span className="mt-1.5 block text-[11px] text-zinc-600">Leave blank to use only the customer's paid subscription.</span></label>
              </div>
            )}
            <button type="submit" disabled={working} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">{working && <Loader2 className="h-4 w-4 animate-spin" />}{dialog.type === 'invite' ? 'Send invitation' : 'Save customer'}</button>
          </form>
        ) : (
          <div className="mt-5">
            <div className={`rounded-lg border p-4 ${dialog.type === 'delete' ? 'border-red-500/25 bg-red-500/5' : 'border-sky-500/25 bg-sky-500/5'}`}>
              <div className={`font-bold ${dialog.type === 'delete' ? 'text-red-300' : 'text-sky-300'}`}>{customer?.email}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{dialog.type === 'delete' ? 'This permanently removes the login and all customer-owned saved data. This cannot be undone.' : 'The customer will receive a secure email link to choose a new password.'}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={working} className="h-10 rounded-lg border border-zinc-700 px-4 text-sm font-bold text-zinc-300 hover:bg-zinc-800">Cancel</button>
              <button type="button" onClick={() => void onExecute({ action: dialog.type === 'delete' ? 'delete' : 'password_reset', userId: customer?.id })} disabled={working} className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold ${dialog.type === 'delete' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-sky-500 text-zinc-950 hover:bg-sky-400'}`}>{working && <Loader2 className="h-4 w-4 animate-spin" />}{dialog.type === 'delete' ? 'Delete customer' : 'Send reset link'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
