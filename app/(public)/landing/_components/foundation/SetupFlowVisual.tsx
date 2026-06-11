import { FL_HOW_IT_WORKS } from '../../_lib/foundationContent';

/** Architectural setup visual — store, Unauth hub, and helpdesk connected. */
export default function SetupFlowVisual() {
  return (
    <figure
      id="how-it-works-visual"
      className="relative mx-auto w-full max-w-[36rem] origin-center -translate-x-[16%] translate-y-[5%] scale-[1.292] lg:mx-0 lg:max-w-none lg:origin-left"
    >
      <img
        src={FL_HOW_IT_WORKS.image.src}
        alt={FL_HOW_IT_WORKS.image.alt}
        width={1408}
        height={768}
        className="h-auto w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}
