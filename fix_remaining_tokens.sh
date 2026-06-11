#!/bin/bash

# Fix remaining legacy tokens in authenticated app
echo "Fixing remaining legacy tokens in authenticated app..."

# Replace bg-hover with surface (hover state)
find app/\(app\)/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/var(--bg-hover)/var(--surface-hover)/g' \
  {} \;

# Replace surface-input with surface-sunken (form backgrounds)
find app/\(app\)/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/var(--surface-input)/var(--surface-sunken)/g' \
  {} \;

# Replace bg-surface-sunk with surface-sunken
find app/\(app\)/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/var(--bg-surface-sunk)/var(--surface-sunken)/g' \
  {} \;

# Replace copper-shine with accent-soft
find app/\(app\)/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/var(--copper-shine)/var(--accent-soft)/g' \
  {} \;

# Replace surface-border with border
find app/\(app\)/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/var(--surface-border)/var(--border)/g' \
  {} \;

# Replace surface-raised with surface
find app/\(app\)/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/var(--surface-raised)/var(--surface)/g' \
  {} \;

echo "Token replacement complete!"

# Count remaining occurrences
echo ""
echo "Checking for remaining legacy tokens..."
remaining=$(grep -r "bg-hover\|surface-input\|bg-surface-sunk\|copper-shine\|surface-border\|surface-raised" --include="*.tsx" --include="*.ts" "app/(app)/" "components/" 2>/dev/null | wc -l | xargs)
echo "Remaining legacy token occurrences in authenticated app: $remaining"