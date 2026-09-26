'use client';
import { useState, type Ref, type InputHTMLAttributes } from 'react';
import styles from './public.module.css';

export function PasswordField({label,error,inputRef,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;error?:string;inputRef?:Ref<HTMLInputElement>}) {
  const [visible,setVisible]=useState(false);
  return <div className={styles.field}><label htmlFor={props.id}>{label}</label><div className={styles.passwordWrap}><input {...props} ref={inputRef} type={visible?'text':'password'} className={styles.input} aria-invalid={error?true:props['aria-invalid']} aria-describedby={error?`${props.id}-error`:props['aria-describedby']}/><button type="button" className={styles.passwordToggle} aria-label={`${visible?'Hide':'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'Hide':'Show'}</button></div>{error&&<span id={`${props.id}-error`} className={styles.fieldError}>{error}</span>}</div>;
}
