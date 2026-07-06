import { useState } from 'react'
import { X, Bell, Plus, Trash2 } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from './ToastProvider.tsx'

interface AlertRule {
  id: string
  state: string
  city: string
  minDiscount: number
  maxPrice: number
  auctionType: string
  propertyType: string
}

interface Props {
  onClose: () => void
}

const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']

export default function AlertPreferences({ onClose }: Props) {
  const { showToast } = useToast()
  const [alerts, setAlerts] = useLocalStorage<AlertRule[]>('auction-alerts', [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    state: '',
    city: '',
    minDiscount: 30,
    maxPrice: 500000,
    auctionType: '',
    propertyType: '',
  })

  const addAlert = () => {
    if (!form.state) {
      showToast('Please select a state', 'error')
      return
    }
    const newAlert: AlertRule = {
      id: `alert-${Date.now()}`,
      ...form,
    }
    setAlerts((prev) => [...prev, newAlert])
    setShowForm(false)
    setForm({ state: '', city: '', minDiscount: 30, maxPrice: 500000, auctionType: '', propertyType: '' })
    showToast('Alert saved! You\'ll be notified when matching deals appear.', 'success')
  }

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    showToast('Alert removed', 'info')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <Bell className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Deal Alerts</h2>
              <p className="text-sm text-gray-500">Get notified when new deals match your criteria</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {alerts.length === 0 && !showForm && (
            <div className="text-center py-10">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">No alerts set yet. Create your first alert to get notified.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Alert
              </button>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="space-y-3 mb-6">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <div className="font-medium text-gray-900">
                      {alert.city ? `${alert.city}, ` : ''}{alert.state}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {alert.minDiscount}%+ discount · Under {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(alert.maxPrice)}
                      {alert.auctionType && ` · ${alert.auctionType}`}
                      {alert.propertyType && ` · ${alert.propertyType}`}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {alerts.length > 0 && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Another Alert
            </button>
          )}

          {showForm && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select state</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City (optional)</label>
                  <input
                    type="text"
                    placeholder="Any city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min Discount (%)</label>
                  <select
                    value={form.minDiscount}
                    onChange={(e) => setForm({ ...form, minDiscount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={10}>10%+</option>
                    <option value={20}>20%+</option>
                    <option value={30}>30%+</option>
                    <option value={40}>40%+</option>
                    <option value={50}>50%+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Price</label>
                  <select
                    value={form.maxPrice}
                    onChange={(e) => setForm({ ...form, maxPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={100000}>$100k</option>
                    <option value={200000}>$200k</option>
                    <option value={300000}>$300k</option>
                    <option value={500000}>$500k</option>
                    <option value={1000000}>$1M</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Auction Type</label>
                  <select
                    value={form.auctionType}
                    onChange={(e) => setForm({ ...form, auctionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Any</option>
                    <option>Foreclosure</option>
                    <option>Tax Lien</option>
                    <option>REO</option>
                    <option>Courthouse</option>
                    <option>Government</option>
                    <option>Estate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Property Type</label>
                  <select
                    value={form.propertyType}
                    onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Any</option>
                    <option>Single Family</option>
                    <option>Condo</option>
                    <option>Townhouse</option>
                    <option>Multi-Family</option>
                    <option>Land</option>
                    <option>Commercial</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addAlert}
                  className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  Save Alert
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>Note:</strong> Alerts are checked locally for now. In the future, they'll be backed by real-time data updates.
          </div>
        </div>
      </div>
    </div>
  )
}
