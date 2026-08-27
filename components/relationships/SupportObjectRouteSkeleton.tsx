import { Bone } from "@/components/ui";

/** Geometry-matched loading state for the Phase 20 dispute and ticket details. */
export function SupportObjectRouteSkeleton({
  title,
  conversation = false,
}: {
  title: string;
  conversation?: boolean;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pb-6 pt-4 sm:px-5"
      aria-busy="true"
      aria-label={title}
      data-state-id="support-object-loading"
    >
      <div className="space-y-2">
        <Bone className="h-3 w-24" />
        <Bone className="h-6 w-80 max-w-full" />
        <Bone className="h-3 w-96 max-w-full" />
      </div>
      <section className="ua-working-surface" aria-hidden="true">
        {conversation ? (
          <div className="ua-joined-section">
            <Bone className="h-4 w-44" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 4 }, (_, index) => <Bone key={index} className="h-14 w-full" />)}
            </div>
          </div>
        ) : null}
        <div className="ua-joined-section grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-4 w-28" />
            </div>
          ))}
        </div>
        <div className="ua-joined-section">
          <Bone className="h-4 w-36" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }, (_, index) => <Bone key={index} className="h-10 w-full" />)}
          </div>
        </div>
      </section>
    </div>
  );
}
