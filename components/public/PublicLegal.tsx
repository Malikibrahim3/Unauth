import { Children, createElement, isValidElement, type ReactElement, type ReactNode, type CSSProperties } from 'react';
import { PublicNav, PublicFooter } from './PublicUI';
import styles from './public.module.css';

type Node = ReactElement<{children?:ReactNode;style?:CSSProperties;id?:string;href?:string}>;
function nodes(node:Node):Node[]{return Children.toArray(node.props.children).filter(isValidElement) as Node[];}
function find(node:Node,predicate:(n:Node)=>boolean):Node|undefined { if(predicate(node))return node; for(const child of nodes(node)){const found=find(child,predicate);if(found)return found;} }

/** Local reading template. Source content/dates remain owned by immutable legal
 * references; only their explicit article/sidebar presentation is translated. */
export default function PublicLegal({source,surfaceId}:{source:()=>ReactElement;surfaceId:string}) {
  const tree=source() as Node;
  const article=find(tree,n=>n.props.style?.maxWidth==='660px');
  const layout=find(tree,n=>nodes(n).some(c=>c.props.style?.maxWidth==='660px'));
  if(!article||!layout)throw new Error('Legal source article contract changed');
  const sidebar=nodes(layout).find(n=>n.props.style?.maxWidth!=='660px');
  function translate(node:ReactNode,key:string,insideTable=false,header=false):ReactNode {
    if(!isValidElement(node))return node;
    const el=node as Node; const children=Children.toArray(el.props.children);
    const isTable=el.props.style?.margin==='6px 0 20px';
    const isRow=insideTable&&el.type==='div';
    const isHeader=isRow&&el.props.style?.padding==='9px 0';
    const role=isTable?'table':isRow?'row':insideTable&&el.type==='span'?(header?'columnheader':'cell'):undefined;
    return createElement(el.type as string,{key,id:el.props.id,href:el.props.href,role,'aria-label':isTable?'Legal document details':undefined,className:isRow?styles.legalRow:undefined},children.map((child,i)=>translate(child,`${key}-${i}`,isTable||isRow,isHeader)));
  }
  const articleChildren=Children.toArray(article.props.children);
  const titleIndex=articleChildren.findIndex(isValidElement);
  const content=articleChildren.map((child,index)=>{
    if(index===titleIndex){return <h1 key="title">{(child as Node).props.children}</h1>;}
    return translate(child,`article-${index}`);
  });
  return <><PublicNav/><main id="public-content" className={styles.container+' '+styles.legal} data-surface-id={surfaceId}>
    <aside className={styles.legalNav} aria-label="Legal document navigation">{sidebar&&translate(sidebar,'sidebar')}</aside>
    <article className={styles.legalBody}>{content}</article>
  </main><PublicFooter/></>;
}
