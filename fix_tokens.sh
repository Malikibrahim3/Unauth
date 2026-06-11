#!/bin/bash

# This script replaces all old token references with new ones in the authenticated app

echo "Starting comprehensive token replacement..."

# Define the replacements
declare -A replacements=(
  ["--ink-primary"]="--text-primary"
  ["--ink-secondary"]="--text-secondary"
  ["--ink-tertiary"]="--text-tertiary"
  ["--ink-muted"]="--text-secondary"
  ["--text-muted"]="--text-secondary"
  ["--text-subtle"]="--text-tertiary"
  ["--ink-inverse"]="white"
  ["--text-inverse"]="white"
  ["--action-primary"]="--accent"
  ["--copper-bright"]="--accent"
  ["--copper-mid"]="--accent"
  ["--copper-dim"]="--accent-soft"
  ["--brand-rust"]="--accent"
  ["--surface-raised"]="--surface"
  ["--surface-muted"]="--surface-sunken"
  ["--surface-overlay"]="--surface"
  ["--surface-border"]="--border"
  ["--border-default"]="--border"
  ["--border-subtle"]="--border-muted"
  ["--bg-surface"]="--surface"
  ["--bg-surface-alt"]="--surface-sunken"
  ["--sev-definite"]="--success"
  ["--sev-probable"]="--warning"
  ["--sev-clear"]="--neutral"
  ["--data-neutral"]="--neutral"
  ["--data-score"]="--text-primary"
)

# Apply replacements to components directory
for old in "${!replacements[@]}"; do
  new="${replacements[$old]}"
  echo "Replacing $old with $new in components..."
  find components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak "s/var(${old})/var(${new})/g" {} \;
  # Also handle cases without var()
  find components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak "s/'${old}'/'${new}'/g" {} \;
done

# Apply replacements to app/(app) directory (authenticated app only)
for old in "${!replacements[@]}"; do
  new="${replacements[$old]}"
  echo "Replacing $old with $new in app/(app)..."
  find app/\(app\) -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak "s/var(${old})/var(${new})/g" {} \;
  find app/\(app\) -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak "s/'${old}'/'${new}'/g" {} \;
done

# Clean up backup files
find . -name "*.bak" -delete

echo "Token replacement complete!"