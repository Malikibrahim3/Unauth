import csv, re

filepath = "/Users/malikibrahim/Downloads/asos_level_fraud_stress_test.csv"
with open(filepath, newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

def normalise_email(e):
    if not e: return None
    e = e.strip().lower()
    at = e.find('@')
    if at < 1: return None
    local = e[:at].split('+')[0].replace('.','')
    return local + e[at:]

def normalise_phone(p):
    if not p: return None
    d = re.sub(r'\D','',p)
    if len(d) < 7: return None
    return d

def normalise_card(last4, bin_):
    if not last4: return None
    d4 = re.sub(r'\D','',last4)[-4:]
    if len(d4) != 4: return None
    dbin = re.sub(r'\D','',bin_ or '')[:8]
    return f"{dbin}-{d4}" if len(dbin) >= 6 else d4

targets = {'ORD-225258': None, 'ORD-633229': None}
for row in rows:
    if row['order_id'] in targets:
        targets[row['order_id']] = row

for tid, trow in targets.items():
    print("\n" + "="*60)
    print("MISSED ORDER: " + tid)
    print("  card: " + str(normalise_card(trow['card_last4'], trow['card_bin'])) + " (raw: " + trow['card_last4'] + " / " + trow['card_bin'] + ")")
    print("  email: " + str(normalise_email(trow['customer_email'])))
    print("  phone: " + str(normalise_phone(trow['phone'])) + " (raw: " + repr(trow['phone']) + ")")
    print("  ip: " + repr(trow['ip_address']))
    print("  postcode: " + trow['shipping_postcode'].upper().replace(' ',''))
    print("  account: " + trow['account_id'])
    print("  address: " + trow['shipping_address'])
    print("  refund: " + trow['refund_requested'] + " / " + trow['refund_amount'])
    print()

    card_norm = normalise_card(trow['card_last4'], trow['card_bin'])
    email_norm = normalise_email(trow['customer_email'])
    phone_norm = normalise_phone(trow['phone'])
    ip = trow['ip_address'].strip()
    postcode = trow['shipping_postcode'].upper().replace(' ','')
    account = trow['account_id'].strip()

    for row in rows:
        if row['order_id'] == tid:
            continue
        shared = []
        if card_norm and normalise_card(row['card_last4'], row['card_bin']) == card_norm:
            shared.append('card')
        if email_norm and normalise_email(row['customer_email']) == email_norm:
            shared.append('email')
        if phone_norm and normalise_phone(row['phone']) == phone_norm:
            shared.append('phone')
        if ip and row['ip_address'].strip() == ip:
            shared.append('ip')
        if postcode and row['shipping_postcode'].upper().replace(' ','') == postcode:
            shared.append('postcode')
        if account and row['account_id'].strip() == account:
            shared.append('account')
        if shared:
            print("  MATCH " + row['order_id'] + " (" + row['customer_name'] + ") on " + str(shared) + " | refund=" + row['refund_requested'] + " | chargeback=" + row['chargeback_filed'])
