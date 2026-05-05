#!/usr/bin/env tsx
/**
 * Stress test runner for the identity linker.
 * Parses the stress test CSV and runs it through the linker to analyze clustering.
 */

import { linkIdentities, type LinkerOrderInput } from '../lib/linker';
import { readFileSync } from 'fs';

interface CsvRow {
  order_id: string;
  created_at: string;
  customer_email: string;
  customer_name: string;
  billing_name: string;
  phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postcode: string;
  shipping_country: string;
  ip_address: string;
  card_last4: string;
  card_bin: string;
  payment_method: string;
  order_total: string;
  currency: string;
  account_id: string;
  refund_requested: string;
  refund_amount: string;
  refund_reason: string;
  chargeback_filed: string;
}

function parseCSV(content: string): CsvRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || '';
    });
    rows.push(row as CsvRow);
  }

  return rows;
}

function csvToLinkerInput(rows: CsvRow[]): LinkerOrderInput[] {
  return rows.map(row => ({
    order_id: row.order_id,
    email: row.customer_email || null,
    phone: row.phone || null,
    address: row.shipping_address || null,
    postcode: row.shipping_postcode || null,
    ip: row.ip_address || null,
    card_last4: row.card_last4 || null,
    card_bin: row.card_bin || null,
    device_fingerprint: null, // Not in CSV
    account_id: row.account_id || null,
  }));
}

function main() {
  const csvPath = process.argv[2] || '/Users/malikibrahim/Downloads/unauth_stress_test_merchant.csv';
  const csvContent = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} orders from CSV`);

  const linkerInput = csvToLinkerInput(rows);
  const result = linkIdentities(linkerInput);

  console.log('\n=== CLUSTERING RESULTS ===\n');
  console.log(`Total orders: ${linkerInput.length}`);
  console.log(`Total clusters: ${result.clusters.length}`);
  console.log(`Total candidate pairs (score >= 15): ${result.candidatePairs.length}`);
  console.log(`Linked pairs (score >= 30): ${result.candidatePairs.filter(p => p.score >= 30).length}`);

  // Cluster size distribution
  const clusterSizes = result.clusters.map(c => c.order_ids.length).sort((a, b) => b - a);
  console.log('\nCluster size distribution:');
  console.log(`  Largest cluster: ${clusterSizes[0]} orders`);
  console.log(`  2nd largest: ${clusterSizes[1] || 0} orders`);
  console.log(`  3rd largest: ${clusterSizes[2] || 0} orders`);
  console.log(`  Clusters with 2+ orders: ${clusterSizes.filter(s => s >= 2).length}`);
  console.log(`  Clusters with 3+ orders: ${clusterSizes.filter(s => s >= 3).length}`);
  console.log(`  Clusters with 5+ orders: ${clusterSizes.filter(s => s >= 5).length}`);

  // Top clusters by size
  console.log('\n=== TOP 10 CLUSTERS BY SIZE ===\n');
  const topClusters = [...result.clusters].sort((a, b) => b.order_ids.length - a.order_ids.length).slice(0, 10);
  topClusters.forEach((cluster, idx) => {
    console.log(`#${idx + 1}: Cluster ${cluster.cluster_id}`);
    console.log(`  Size: ${cluster.order_ids.length} orders`);
    console.log(`  Confidence score: ${cluster.confidence_score}`);
    console.log(`  Signals: ${cluster.signals_matched.join(', ')}`);
    console.log(`  Order IDs: ${cluster.order_ids.slice(0, 5).join(', ')}${cluster.order_ids.length > 5 ? '...' : ''}`);
    console.log();
  });

  // Signal distribution
  const signalCounts = new Map<string, number>();
  result.clusters.forEach(c => {
    c.signals_matched.forEach(s => {
      signalCounts.set(s, (signalCounts.get(s) || 0) + 1);
    });
  });
  console.log('\n=== SIGNAL DISTRIBUTION ACROSS CLUSTERS ===\n');
  Array.from(signalCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([signal, count]) => {
      console.log(`  ${signal}: ${count} clusters`);
    });

  // High-confidence pairs
  console.log('\n=== TOP 10 CANDIDATE PAIRS BY SCORE ===\n');
  const topPairs = result.candidatePairs.slice(0, 10);
  topPairs.forEach((pair, idx) => {
    console.log(`#${idx + 1}: Score ${pair.score}`);
    console.log(`  Signals: ${pair.signals.join(', ')}`);
    console.log(`  ${pair.order_id_a} <-> ${pair.order_id_b}`);
    console.log();
  });

  // Fraud ring analysis (clusters with high confidence and multiple orders)
  console.log('\n=== POTENTIAL FRAUD RINGS (clusters >= 3 orders, score >= 50) ===\n');
  const fraudRings = result.clusters
    .filter(c => c.order_ids.length >= 3 && c.confidence_score >= 50)
    .sort((a, b) => b.confidence_score - a.confidence_score);
  
  console.log(`Total fraud rings found: ${fraudRings.length}`);
  
  // Show top 10 fraud rings
  const topRings = fraudRings.slice(0, 10);
  topRings.forEach((ring, idx) => {
    console.log(`Ring #${idx + 1}: ${ring.cluster_id}`);
    console.log(`  Orders: ${ring.order_ids.length}`);
    console.log(`  Confidence: ${ring.confidence_score}`);
    console.log(`  Signals: ${ring.signals_matched.join(', ')}`);
    console.log(`  Order IDs: ${ring.order_ids.slice(0, 5).join(', ')}${ring.order_ids.length > 5 ? '...' : ''}`);
    
    // Look up original data for these orders
    const ringRows = rows.filter(r => ring.order_ids.includes(r.order_id));
    const emails = new Set(ringRows.map(r => r.customer_email));
    const phones = new Set(ringRows.map(r => r.phone));
    const ips = new Set(ringRows.map(r => r.ip_address));
    const postcodes = new Set(ringRows.map(r => r.shipping_postcode));
    
    console.log(`  Unique emails: ${emails.size}, phones: ${phones.size}, IPs: ${ips.size}, postcodes: ${postcodes.size}`);
    console.log();
  });
  
  if (fraudRings.length > 10) {
    console.log(`... and ${fraudRings.length - 10} more fraud rings`);
  }
}

main();
