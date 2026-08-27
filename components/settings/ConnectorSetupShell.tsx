import type { ReactNode } from "react";
import Image from "next/image";
import { Check, CircleAlert, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import styles from "./ConnectorSetupOperations.module.css";

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
    <output className={styles.notice} data-tone={tone === "error" ? "danger" : tone} role={tone === "error" ? "alert" : "status"}>
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
    <div className={styles.root} data-testid="connector-setup-shell" data-source-setup>
      <section className={styles.progressCard} aria-label={`${provider} setup progress`}>
        <ol className={styles.progress}>
          {STAGES.map((stage, index) => (
            <li key={stage.label}>
              <div className={styles.stage} aria-current={index === currentIndex ? "step" : undefined} data-current={index === currentIndex}>
                <span className={styles.stageNumber} data-state={index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending"}>
                  {index < currentIndex ? <Check size={12} aria-hidden="true" /> : index + 1}
                </span>
                <span><strong>{stage.label}</strong><small>{stage.detail}</small></span>
              </div>
              {index < STAGES.length - 1 ? <i /> : null}
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.layout}>
        <section className={styles.setupPanel} id="connector-setup-form">
          {children}
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.sideCard}>
            <div className={styles.identity}>
              {providerMark ? (
                <Image src={providerMark} alt="" width={38} height={38} />
              ) : (
                <span>{provider.slice(0, 1)}</span>
              )}
              <div><h2>{provider}</h2><p>Provider setup</p></div>
            </div>
            <div className={styles.requirements}>
              <strong>{requirementsHeading}</strong>
              <div>{requirements}</div>
            </div>
            {returnHref ? <ButtonLink href={returnHref} variant="secondary" size="sm">Cancel setup</ButtonLink> : null}
          </section>

          <section className={styles.sideCard}>
            <h2>Credential handling</h2>
            <p className={styles.credential}><ShieldCheck size={14} />Provider credentials are encrypted and are not rendered again after authorisation.</p>
            <p className={styles.credential}><ShieldCheck size={14} />Unauth requests the minimum available provider boundary for this integration.</p>
            <p className={styles.credential}><ShieldCheck size={14} />Source health is only shown after a measurable live signal is returned.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
