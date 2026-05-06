import csv

with open('friendly_fraud_blind_test_2000.csv', newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

headers = list(rows[0].keys())
print('Headers:', headers)
print('Total rows:', len(rows))

targets = ['ORD-225258', 'ORD-633229']
for row in rows:
    if row['order_id'] in targets:
        print('=== ORDER:', row['order_id'], '===')
        for k, v in row.items():
            print(f'  {k}: {repr(v)}')
        print()
