export type OrderStatus = 'Paid' | 'Pending' | 'Refunded' | 'Cancelled'
export type PaymentMethod = 'Card' | 'PayPal' | 'Bank transfer' | 'Apple Pay'
export type Order = { id: string; customerName: string; email: string; product: string; quantity: number; amount: number; status: OrderStatus; paymentMethod: PaymentMethod; region: string; channel: string; priority: 'High' | 'Normal' | 'Low'; orderDate: string; deliveryDate?: string }
const first = ['Avery','Jordan','Taylor','Morgan','Riley','Casey','Quinn','Cameron','Harper','Parker','Drew','Sage']
const last = ['Bennett','Hayes','Foster','Morgan','Reed','Ellis','Brooks','Carter','Morris','Wells','Perry','Lane']
const products = ['Workspace Pro','Analytics Suite','Team Inbox','Data Connect','Signal API','Launch Kit','Support Plus']
const regions = ['North America','Europe','Asia Pacific','Latin America']
const channels = ['Direct','Partner','Marketplace','Sales assisted']
const statuses: OrderStatus[] = ['Paid','Paid','Paid','Pending','Refunded','Cancelled']
const payments: PaymentMethod[] = ['Card','PayPal','Bank transfer','Apple Pay']
export const orders: Order[] = Array.from({ length: 1200 }, (_, i) => {
  const customerName = `${first[i % first.length]} ${last[(i * 3) % last.length]}`
  const day = (i * 7) % 365
  const orderDate = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10)
  return { id: `ORD-${String(2026).slice(-2)}-${String(i + 1).padStart(5, '0')}`, customerName, email: `${customerName.toLowerCase().replace(' ', '.')}@${['northstar.io','daybreak.co','acme.test'][i % 3]}`, product: products[(i * 5) % products.length], quantity: (i % 5) + 1, amount: [129,249,480,89,720,159,360][(i * 7) % 7] * ((i % 3) + 1), status: statuses[i % statuses.length], paymentMethod: payments[(i * 5) % payments.length], region: regions[(i * 7) % regions.length], channel: channels[(i * 3) % channels.length], priority: i % 11 === 0 ? 'High' : i % 7 === 0 ? 'Low' : 'Normal', orderDate, deliveryDate: i % 13 === 0 ? undefined : new Date(Date.UTC(2026, 0, 4 + day)).toISOString().slice(0, 10) }
})
