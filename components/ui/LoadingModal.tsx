"use client";

import {useEffect,useId,useRef,useState} from "react";
import {LoaderCircle} from "lucide-react";

export function LoadingModal({active,title,description,delay=250}:{active:boolean;title:string;description:string;delay?:number}){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const timer=window.setTimeout(()=>setVisible(active),active?delay:0);
    return()=>window.clearTimeout(timer);
  },[active,delay]);
  return active&&visible?<LoadingDialog title={title} description={description}/>:null;
}

function LoadingDialog({title,description}:{title:string;description:string}){
  const ref=useRef<HTMLDialogElement>(null);
  const descriptionId=useId();
  useEffect(()=>{
    const dialog=ref.current;
    if(dialog&&!dialog.open)dialog.showModal();
    return()=>{if(dialog?.open)dialog.close();};
  },[]);
  return <dialog ref={ref} className="loading-modal" aria-label={title} aria-describedby={descriptionId} onCancel={event=>event.preventDefault()}>
    <div className="loading-modal-icon"><LoaderCircle size={27} aria-hidden="true"/></div>
    <h2>{title}</h2>
    <p id={descriptionId}>{description}</p>
    <div className="loading-modal-track" aria-hidden="true"><span/></div>
    <small>작업이 끝나면 자동으로 닫힙니다.</small>
  </dialog>;
}
