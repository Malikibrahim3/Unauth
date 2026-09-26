'use client';
import { PublicNav, PublicFooter, PublicLink } from './PublicUI';
import styles from './public.module.css';
export function PublicState({title,description,stateId,loading=false,retry,digest}:{title:string;description:string;stateId:string;loading?:boolean;retry?:()=>void;digest?:string}) {
 return <><PublicNav/><main id="public-content" className={styles.state} data-state-id={stateId} aria-busy={loading||undefined}><h1>{title}</h1><p role={retry?'alert':loading?'status':undefined}>{description}</p>{digest&&<p className={styles.mono}>Reference {digest}</p>}<div className={styles.actions}>{retry&&<button className={styles.button} onClick={retry}>Try again</button>}{!loading&&<PublicLink href="/landing" secondary>Product overview</PublicLink>}</div></main><PublicFooter/></>;
}
