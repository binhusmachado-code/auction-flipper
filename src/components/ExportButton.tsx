import { Download } from 'lucide-react'
import { Property } from '../types/property'

interface Props {
  properties: Property[]
  filename?: string
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function escapeCSV(str: string) {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export default function ExportButton({ properties, filename = 'auction-deals' }: Props) {
  const downloadCSV = () => {
    const headers = [
      'Address', 'City', 'State', 'ZIP', 'Price', 'Est. Value', 'ARV',
      'Rehab Est.', 'Beds', 'Baths', 'Sqft', 'Auction Type', 'Auction Date',
      'Source', 'Discount %', 'Profit', 'Status', 'Description'
    ]

    const rows = properties.map((p) => {
      const discount = ((p.estimatedValue - p.price) / p.estimatedValue * 100).toFixed(1)
      const profit = (p.arv - p.price - p.rehabEstimate).toFixed(0)
      return [
        p.address, p.city, p.state, p.zip,
        p.price, p.estimatedValue, p.arv, p.rehabEstimate,
        p.beds, p.baths, p.sqft, p.auctionType, p.auctionDate || '',
        p.source, discount, profit, p.status, p.description
      ].map((v) => escapeCSV(String(v))).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <button
      onClick={downloadCSV}
      className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      title="Export filtered properties to CSV"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  )
}
