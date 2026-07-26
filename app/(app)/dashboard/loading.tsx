import { DashboardLoadingSkeleton } from '@/components/navigation/skeletons/pageSkeletons';
import styles from '@/components/dashboard/dashboardPilot.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.dashboardPilot}>
      <DashboardLoadingSkeleton />
    </div>
  );
}
