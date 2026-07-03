import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Property } from '../types/property'

interface Props {
  onClose: () => void
  onAdd: (p: Property) => void
}

export default function AddPropertyModal({ onClose, onAdd }: Props) {
  const [form, setForm] = useState<Partial<Property>>({
    propertyType: 'Single Family',
    auctionType: 'Foreclosure',
    status: 'Active',
    source: 'Manual Entry',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.address || !form.city || !form.state || !form.price) return
    onAdd({
      ...form,
      id: `manual-${Date.now()}`,
      estimatedValue: form.estimatedValue || form.price || 0,
      arv: form.arv || form.estimatedValue || form.price || 0,
      rehabEstimate: form.rehabEstimate || 0,
      beds: form.beds || 0,
      baths: form.baths || 0,
      sqft: form.sqft || 0,
      daysOnMarket: 0,
      description: form.description || '',
      notes: form.notes || '',
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop',
      images: [],
      latitude: 0,
      longitude: 0,
      county: '',
      sourceUrl: '#',
      zip: form.zip || '',
    } as Property)
    onClose()
  }

  const input = (label: string, key: keyof Property, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={(form[key] as string | number) || ''}
        onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <Plus className="w-5 h-5 text-brand-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Add Property</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input('Address *', 'address', 'text', '123 Main St')}
            {input('City *', 'city', 'text', 'Atlanta')}
            {input('State *', 'state', 'text', 'GA')}
            {input('ZIP', 'zip', 'text', '30309')}
            {input('County', 'county', 'text', 'Fulton')}
            {input('Auction Date', 'auctionDate', 'date')}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {input('Price *', 'price', 'number', '100000')}
            {input('Est. Value', 'estimatedValue', 'number', '150000')}
            {input('ARV', 'arv', 'number', '160000')}
            {input('Rehab Est.', 'rehabEstimate', 'number', '30000')}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {input('Beds', 'beds', 'number', '3')}
            {input('Baths', 'baths', 'number', '2')}
            {input('Sqft', 'sqft', 'number', '1400')}
            {input('Lot Size (acres)', 'lotSize', 'number', '0.25')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Auction Type</label>
              <select
                value={form.auctionType || 'Foreclosure'}
                onChange={(e) => setForm({ ...form, auctionType: e.target.value as Property['auctionType'] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
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
                value={form.propertyType || 'Single Family'}
                onChange={(e) => setForm({ ...form, propertyType: e.target.value as Property['propertyType'] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option>Single Family</option>
                <option>Condo</option>
                <option>Townhouse</option>
                <option>Multi-Family</option>
                <option>Land</option>
                <option>Commercial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Property condition, neighborhood info, etc."
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Your personal notes, contact info, inspection notes..."
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Add Property
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
