import type { ReactNode } from "react";
import Image from "next/image";
import { Check, CircleAlert, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui";

type Stage = "prepare" | "connect" | "verify";
export type ConnectorSetupMode = "connect" | "reconnect" | "verify";
type NoticeTone = "success" | "warning" | "error";

const STAGES = [
  { label: "Authorise", detail: "read-only access" },
  { label: "Map fields", detail: "adapter-owned mapping" },
  { label: "Backfill", detail: "history verified" },
  { label: "Verify", detail: "live source checks" },
] as const;

export function ConnectorSetupNotice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  return (
    <output style={{ display: 'block', padding: '10px 12px', borderRadius: 9, background: tone === 'error' ? '#fdf0e6' : tone === 'success' ? '#eaf5ef' : '#fff3e9', color: tone === 'error' ? '#b0431a' : tone === 'success' ? '#1a6b43' : '#7a5310', fontSize: 12 }} data-tone={tone === "error" ? "danger" : tone} role={tone === "error" ? "alert" : "status"}>
      <CircleAlert size={14} aria-hidden="true" />
      <span>{children}</span>
    </output>
  );
}

export function ConnectorSetupShell({ provider, providerMark, requirements, setupMode = "connect", currentStage = "connect", returnHref, children }: {
  provider: string;
  providerMark?: string;
  requirements: ReactNode;
  setupMode?: ConnectorSetupMode;
  currentStage?: Stage;
  returnHref?: string;
  children: ReactNode;
}) {
  const currentIndex = currentStage === "verify" || setupMode === "verify" ? 3 : 0;
  const requirementsHeading = setupMode === "verify"
    ? "Connection review"
    : setupMode === "reconnect"
      ? "Before you reconnect"
      : "Before you authorise";

  return (
    <div style={{ display: 'grid', gap: 14 }} data-testid="connector-setup-shell" data-source-setup>
      <section style={{ overflow: 'hidden', borderRadius: 12, background: '#f4f3f1' }} aria-label={`${provider} setup progress`}>
        <ol style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length},minmax(0,1fr))`, margin: 0, padding: 0, listStyle: 'none' }}>
          {STAGES.map((stage, index) => (
            <li key={stage.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderRight: index === STAGES.length - 1 ? 0 : '1px solid #e4e3e0', color: index === currentIndex ? '#1c1f23' : '#6f6a63', fontSize: 11.5 }} aria-current={index === currentIndex ? "step" : undefined} data-current={index === currentIndex}>
                <span style={{ width: 20, height: 20, display: 'grid', placeItems: 'center', borderRadius: '50%', background: index < currentIndex ? '#1a6b43' : index === currentIndex ? '#1c1f23' : '#fff', color: index <= currentIndex ? '#fff' : '#6f6a63', font: "500 10px/1 'IBM Plex Mono',monospace" }} data-state={index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending"}>
                  {index < currentIndex ? <Check size={12} aria-hidden="true" /> : index + 1}
                </span>
                <span><strong>{stage.label}</strong><small>{stage.detail}</small></span>
              </div>
              {index < STAGES.length - 1 ? <i /> : null}
            </li>
          ))}
        </ol>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 290px', gap: 14, alignItems: 'start' }}>
        <section style={{ minWidth: 0 }} id="connector-setup-form">
          {children}
        </section>

        <aside style={{ display: 'grid', gap: 12 }}>
          <section style={{ padding: 15, borderRadius: 12, background: '#f4f3f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {providerMark ? (
                <Image src={providerMark} alt="" width={38} height={38} />
              ) : (
                <span>{provider.slice(0, 1)}</span>
              )}
              <div><h2>{provider}</h2><p>Provider setup</p></div>
            </div>
            <div style={{ marginTop: 12, color: '#64686d', fontSize: 11.5, lineHeight: '17px' }}>
              <strong>{requirementsHeading}</strong>
              <div>{requirements}</div>
            </div>
            {returnHref ? <ButtonLink href={returnHref} variant="secondary" size="sm">Cancel setup</ButtonLink> : null}
          </section>

          <section style={{ display: 'grid', gap: 10, padding: 15, borderRadius: 12, background: '#f4f3f1' }}>
            <h2>Credential handling</h2>
            <p style={credentialStyle}><ShieldCheck size={14} />Provider credentials are encrypted and are not rendered again after authorisation.</p>
            <p style={credentialStyle}><ShieldCheck size={14} />Unauth requests the minimum available provider boundary for this integration.</p>
            <p style={credentialStyle}><ShieldCheck size={14} />Source health is only shown after a measurable live signal is returned.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

const credentialStyle = { display: 'flex', alignItems: 'flex-start', gap: 8, margin: 0, color: '#64686d', fontSize: 11, lineHeight: '16px' } as const;
