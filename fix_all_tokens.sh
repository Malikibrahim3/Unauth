#!/bin/bash

echo "Comprehensive token replacement for authenticated app..."

# Function to replace tokens in a directory
replace_in_dir() {
  local dir=$1
  echo "Processing $dir..."

  # Main text tokens
  find "$dir" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
    -e "s/var(--ink-primary)/var(--text-primary)/g" \
    -e "s/var(--ink-secondary)/var(--text-secondary)/g" \
    -e "s/var(--ink-tertiary)/var(--text-tertiary)/g" \
    -e "s/var(--ink-muted)/var(--text-secondary)/g" \
    -e "s/var(--text-muted)/var(--text-secondary)/g" \
    -e "s/var(--text-subtle)/var(--text-tertiary)/g" \
    -e "s/var(--ink-inverse)/white/g" \
    -e "s/var(--text-inverse)/white/g" \
    {} \;

  # Action and brand tokens
  find "$dir" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
    -e "s/var(--action-primary)/var(--accent)/g" \
    -e "s/var(--copper-bright)/var(--accent)/g" \
    -e "s/var(--copper-mid)/var(--accent)/g" \
    -e "s/var(--copper-dim)/var(--accent-soft)/g" \
    -e "s/var(--brand-rust)/var(--accent)/g" \
    {} \;

  # Surface tokens
  find "$dir" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
    -e "s/var(--surface-raised)/var(--surface)/g" \
    -e "s/var(--surface-muted)/var(--surface-sunken)/g" \
    -e "s/var(--surface-overlay)/var(--surface)/g" \
    -e "s/var(--bg-surface)/var(--surface)/g" \
    -e "s/var(--bg-surface-alt)/var(--surface-sunken)/g" \
    {} \;

  # Border tokens
  find "$dir" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
    -e "s/var(--surface-border)/var(--border)/g" \
    -e "s/var(--border-default)/var(--border)/g" \
    -e "s/var(--border-subtle)/var(--border-muted)/g" \
    {} \;

  # Severity tokens
  find "$dir" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
    -e "s/var(--sev-definite)/var(--success)/g" \
    -e "s/var(--sev-probable)/var(--warning)/g" \
    -e "s/var(--sev-clear)/var(--neutral)/g" \
    -e "s/var(--data-neutral)/var(--neutral)/g" \
    -e "s/var(--data-score)/var(--text-primary)/g" \
    {} \;

  # Also fix string literals
  find "$dir" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
    -e "s/'--ink-primary'/'--text-primary'/g" \
    -e "s/'--ink-secondary'/'--text-secondary'/g" \
    -e "s/'--ink-tertiary'/'--text-tertiary'/g" \
    -e "s/'--action-primary'/'--accent'/g" \
    {} \;
}

# Update components directory
replace_in_dir "components"

# Update authenticated app directory
replace_in_dir "app/(app)"

# Also update lib directory for utilities
replace_in_dir "lib"

echo "Token replacement complete!"