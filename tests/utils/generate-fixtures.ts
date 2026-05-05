import fs from 'fs'
import path from 'path'

const OUTPUT_DIR = path.join(__dirname, 'csv-fixtures')

const FRAUD_RINGS = {
  ring1: {
    ip: '203.0.113.10',
    address: '14 Brook Lane, Leeds, LS1 4BT',
    cardLast4: '4521',
    emails: ['james.ring1@gmail.com', 'james.r1+refund@gmail.com', 'jring_1999@hotmail.com']
  },
  ring2: {
    ip: '198.51.100.22',
    address: '7 Maple Close, Manchester, M4 1AB',
    cardLast4: '7823',
    emails: ['sarah.two@outlook.com', 'sarah_two2@gmail.com']
  }
}

const CE3_CUSTOMER = {
  email: 'ce3.test.customer@example.com',
  name: 'CE3 Test Customer',
  ip: '192.0.2.55',
  address: '99 Test Street, London, EC1A 1BB',
  cardLast4: '9901'
}

function randomDate(daysAgo: number): string {
  const d = new Date('2026-05-03T12:00:00.000Z')
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function csvEscape(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function row(
  orderId: string,
  date: string,
  email: string,
  name: string,
  address: string,
  total: number,
  ip: string,
  card: string,
  refundStatus = 'none',
  refundReason = '',
  refundDate = ''
): string {
  return [
    orderId, date, email, name, address, address,
    total.toFixed(2), 'GBP', 'completed',
    ip, '', card, '', '', 'card',
    refundStatus, refundReason, refundDate,
    refundStatus !== 'none' ? total.toFixed(2) : ''
  ].map(csvEscape).join(',')
}

const HEADERS = [
  'order_id', 'order_date', 'customer_email', 'customer_name',
  'shipping_address', 'billing_address', 'order_total', 'currency',
  'order_status', 'ip_address', 'device_id', 'card_last4',
  'card_bin', 'card_fingerprint', 'payment_method',
  'refund_status', 'refund_reason', 'refund_date', 'refund_amount'
].join(',')

export function generateCSV(type: 'minimal' | 'standard' | 'rich' | 'investigation') {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  switch (type) {
    case 'minimal': generateMinimal(); break
    case 'standard': generateStandard(); break
    case 'rich': generateRich(); break
    case 'investigation': generateInvestigation(); break
  }
}

function generateMinimal() {
  const rows = [HEADERS]
  for (let i = 1; i <= 5; i++) {
    rows.push(row(`MIN-${i.toString().padStart(4, '0')}`, randomDate(30 - i), `clean.customer.${i}@gmail.com`, `Clean Customer ${i}`, `${i} Clean Street, London, EC1A ${i}BB`, 50 + i * 10, `10.0.0.${i}`, `${1000 + i}`))
  }
  FRAUD_RINGS.ring1.emails.forEach((email, idx) => {
    rows.push(row(`MIN-RING1-${idx + 1}`, randomDate(20 - idx * 2), email, `Ring One Customer ${idx + 1}`, FRAUD_RINGS.ring1.address, 89.99, FRAUD_RINGS.ring1.ip, FRAUD_RINGS.ring1.cardLast4, idx > 0 ? 'full' : 'none', idx > 0 ? 'item_not_received' : '', idx > 0 ? randomDate(15 - idx) : ''))
  })
  fs.writeFileSync(path.join(OUTPUT_DIR, 'minimal.csv'), rows.join('\n'))
}

function generateStandard() {
  const rows = [HEADERS]
  for (let i = 1; i <= 40; i++) {
    rows.push(row(`STD-CLEAN-${i.toString().padStart(4, '0')}`, randomDate(60 - i), `standard.clean.${i}@gmail.com`, `Standard Clean ${i}`, `${i} Standard Road, Birmingham, B${i % 9 + 1} 4LQ`, 30 + i * 5, `172.16.${Math.floor(i / 10)}.${i % 256}`, `${2000 + i}`))
  }
  FRAUD_RINGS.ring1.emails.forEach((email, idx) => rows.push(row(`STD-R1-${idx + 1}`, randomDate(45 - idx * 5), email, ['James Holland', 'J. Holland', 'James H.'][idx], FRAUD_RINGS.ring1.address, 142.99, FRAUD_RINGS.ring1.ip, FRAUD_RINGS.ring1.cardLast4, idx > 0 ? 'full' : 'none', idx > 0 ? 'item_not_received' : '', idx > 0 ? randomDate(40 - idx * 5 - 2) : '')))
  FRAUD_RINGS.ring2.emails.forEach((email, idx) => rows.push(row(`STD-R2-${idx + 1}`, randomDate(30 - idx * 7), email, ['Sarah Kelly', 'S. Kelly'][idx], FRAUD_RINGS.ring2.address, 234.50, FRAUD_RINGS.ring2.ip, FRAUD_RINGS.ring2.cardLast4, 'full', 'item_not_received', randomDate(28 - idx * 7))))
  rows.push(row('STD-CB-001', randomDate(25), 'chargeback.tester@hotmail.com', 'Chargeback Tester', '22 Dispute Lane, Bristol, BS1 4RR', 890.00, '92.53.114.28', '4491', 'full', 'item_not_received', randomDate(20)))
  fs.writeFileSync(path.join(OUTPUT_DIR, 'standard.csv'), rows.join('\n'))
}

function generateRich() {
  const rows = [HEADERS]
  ;[180, 160, 140].forEach((daysAgo, idx) => rows.push(row(`RICH-CE3-PRIOR-${idx + 1}`, randomDate(daysAgo), CE3_CUSTOMER.email, CE3_CUSTOMER.name, CE3_CUSTOMER.address, 75 + idx * 25, CE3_CUSTOMER.ip, CE3_CUSTOMER.cardLast4)))
  rows.push(row('RICH-CE3-DISPUTED', randomDate(10), CE3_CUSTOMER.email, CE3_CUSTOMER.name, CE3_CUSTOMER.address, 299.99, CE3_CUSTOMER.ip, CE3_CUSTOMER.cardLast4, 'full', 'item_not_received', randomDate(8)))
  for (let i = 1; i <= 10; i++) {
    const sharedIP = `10.20.30.${i * 10}`
    const sharedAddress = `${i * 10} Overlap Street, London, E${i} 4AB`
    rows.push(row(`RICH-OVL-${i}-A`, randomDate(50 + i), `overlap.a.${i}@gmail.com`, `Overlap A ${i}`, sharedAddress, 60 + i * 8, sharedIP, `${3000 + i}`))
    rows.push(row(`RICH-OVL-${i}-B`, randomDate(45 + i), `overlap.b.${i}@outlook.com`, `Overlap B ${i}`, sharedAddress, 60 + i * 8, sharedIP, `${4000 + i}`, i <= 5 ? 'full' : 'none', i <= 5 ? 'item_not_received' : '', i <= 5 ? randomDate(43 + i) : ''))
  }
  ;[90, 70, 50, 30, 10].forEach((daysAgo, idx) => rows.push(row(`RICH-ACC-${idx + 1}`, randomDate(daysAgo), 'acceleration.tester@gmail.com', 'Acceleration Tester', '55 Speed Close, Liverpool, L1 9AA', 45 + idx * 15, '172.20.0.1', '5588', 'full', 'item_not_received', randomDate(daysAgo - Math.max(1, 14 - idx * 3)))))
  for (let i = 1; i <= 60; i++) rows.push(row(`RICH-BG-${i.toString().padStart(4, '0')}`, randomDate(90 - i), `rich.background.${i}@example.com`, `Background Customer ${i}`, `${i} Background Ave, Nottingham, NG${i % 9 + 1} 2AB`, 25 + i * 3, `192.168.${Math.floor(i / 256)}.${i % 256}`, `${5000 + i}`))
  fs.writeFileSync(path.join(OUTPUT_DIR, 'rich.csv'), rows.join('\n'))
}

function generateInvestigation() {
  const rows = [HEADERS]
  const addresses = ['10 First Street, London, EC1A 1AA', '10 First St, London, EC1A 1AA', '10 First Street London EC1A 1AA']
  const cards = ['1234', '1234', '5678', '1234', '5678', '9012']
  for (let i = 1; i <= 30; i++) {
    const daysAgo = 180 - i * 6
    const isRefund = [5, 12, 20, 28].includes(i)
    rows.push(row(`INV-${i.toString().padStart(4, '0')}`, randomDate(daysAgo), 'investigation.subject@gmail.com', i % 5 === 0 ? 'Investigation S.' : 'Investigation Subject', addresses[i % addresses.length], 50 + (i % 7) * 30, '203.0.113.99', cards[i % cards.length], isRefund ? 'full' : 'none', isRefund ? 'item_not_received' : '', isRefund ? randomDate(daysAgo - 3) : ''))
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'investigation.csv'), rows.join('\n'))
}

if (require.main === module) {
  generateCSV('minimal')
  generateCSV('standard')
  generateCSV('rich')
  generateCSV('investigation')
}
