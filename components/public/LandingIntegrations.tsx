import Image from 'next/image';
import { getIntegrationProvider } from '@/lib/integrations/registry';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { LandingArtifact } from './LandingArtifact';
import styles from './public.module.css';

// A presentation selection, not a second capability catalogue. Names, assets and
// maturity come from the registry. Planned providers are excluded from this scene.
const groups = [
  { title: 'Stores', ids: ['shopify', 'woocommerce', 'bigcommerce'], records: 'Order details and earlier refunds.' },
  { title: 'Helpdesks', ids: ['gorgias', 'zendesk', 'freshdesk'], records: 'Customer conversations and attachments.' },
  { title: '3PLs · Warehouse', ids: ['shipbob'], records: 'Available packing and dispatch records.' },
  { title: 'Carriers · Delivery', ids: ['ups', 'fedex'], records: 'Tracking, scans and available delivery proof, checked on demand.' },
  { title: 'Imports and documents', ids: ['csv_import', 'document_upload'], records: 'Evidence supplied and reviewed by your team.' },
];
const tileIds = ['bigcommerce', 'freshdesk', 'ups', 'woocommerce', 'document_upload', 'zendesk', 'shopify', 'unauth', 'gorgias', 'shipbob', 'csv_import', 'fedex', 'bigcommerce', 'freshdesk', 'woocommerce'];

export function LandingIntegrations() {
  return <LandingArtifact id="integrations" title="Familiar tools." subtitle="One connected case." className={styles.integrationsArtifact}
    caption={<>Provider examples, not partnerships or guaranteed access. Coverage and permissions vary; some connections have partial support. <a href="#connections">Connection coverage</a>.</>}
    details={<>
      <p className={styles.artifactDetailLead}>Start with the records your team already has.</p>
      <div className={styles.integrationGroups}>{groups.map(group => {
        const providers = group.ids.map(getIntegrationProvider).filter(provider => provider && provider.codeMaturity !== 'slot_only');
        return <section key={group.title}><h4>{group.title}</h4><ul>{providers.map(provider => provider && <li key={provider.id}>
          <Image src={provider.logoSrc ?? '/providers/document-upload.svg'} alt="" width={24} height={24} unoptimized/>
          <span>{provider.name}</span>{provider.codeMaturity === 'partial' && <small>Partial coverage</small>}
        </li>)}</ul><p>{group.records}</p></section>;
      })}</div>
      <p>We confirm record access, freshness and remaining manual steps before you commit. A connection does not authorise refunds, replacements or claim submissions.</p>
      <a className={styles.artifactTextLink} href="#connections">Review setup and connection coverage <span aria-hidden="true">→</span></a>
    </>}>
    <div className={styles.integrationsScene}>
      <div className={styles.integrationsMosaic} aria-hidden="true">{tileIds.map((id, index) => {
        if (id === 'unauth') return <div key={id} className={`${styles.integrationTile} ${styles.integrationHub}`}><UnauthLogo kind="symbol" tone="graphite" height={48} decorative/></div>;
        const provider = getIntegrationProvider(id);
        if (!provider || provider.codeMaturity === 'slot_only') return null;
        return <div key={`${id}-${index}`} className={styles.integrationTile}><Image src={provider.logoSrc ?? '/providers/document-upload.svg'} alt="" width={48} height={48} unoptimized/></div>;
      })}</div>
      <div className={styles.integrationFamilies} aria-label="Source categories"><span>Stores</span><span>Helpdesks</span><span>Warehouses</span><span>Carriers</span><span>Documents</span></div>
    </div>
  </LandingArtifact>;
}
