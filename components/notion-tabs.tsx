'use client';
import {useEffect,useRef,useState} from 'react';

export function NotionTabs({id,label,tabs}:{id:string;label:string;tabs:{id:string;label:React.ReactNode;content:React.ReactNode}[]}){
  const [active,setActive]=useState(0),root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const reveal=(event:Event)=>{
      const target=event.target instanceof HTMLElement?event.target:null;
      let panel=target?.closest<HTMLElement>('[data-notion-tab-panel]')??null;
      while(panel&&panel.closest('[data-notion-tabs]')!==root.current)panel=panel.parentElement?.closest<HTMLElement>('[data-notion-tab-panel]')??null;
      if(!panel)return;
      const index=Number(panel.dataset.notionTabPanel);if(!Number.isInteger(index))return;
      setActive(index);requestAnimationFrame(()=>target?.scrollIntoView({block:'start'}));
    };
    const element=root.current;element?.addEventListener('notion-reveal',reveal);
    return()=>element?.removeEventListener('notion-reveal',reveal);
  },[]);
  if(!tabs.length)return null;
  function select(index:number,focus=false){const next=(index+tabs.length)%tabs.length;setActive(next);if(focus)root.current?.querySelector<HTMLButtonElement>('[data-notion-tab-index="'+next+'"]')?.focus();}
  return <div className="notion-tabs" data-notion-tabs ref={root}><div className="notion-tab-list" role="tablist" aria-label={label}>{tabs.map((tab,index)=><button key={tab.id} id={id+'-tab-'+index} data-notion-tab-index={index} type="button" role="tab" aria-selected={active===index} aria-controls={id+'-panel-'+index} tabIndex={active===index?0:-1} onClick={()=>select(index)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();select(event.key==='Home'?0:event.key==='End'?tabs.length-1:active+(event.key==='ArrowRight'?1:-1),true);}}}>{tab.label}</button>)}</div>{tabs.map((tab,index)=><section key={tab.id} id={id+'-panel-'+index} role="tabpanel" aria-labelledby={id+'-tab-'+index} data-notion-tab-panel={index} hidden={active!==index}>{tab.content}</section>)}</div>;
}
