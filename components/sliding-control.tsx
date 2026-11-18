'use client';
import {useLayoutEffect,useRef,useState,type HTMLAttributes} from 'react';
export function SlidingControl({as:Tag='div',activeKey,children,className='',...props}:HTMLAttributes<HTMLElement>&{as?:'div'|'nav';activeKey:string;children:React.ReactNode}){
 const root=useRef<HTMLElement|null>(null),[box,setBox]=useState<{x:number;y:number;width:number;height:number}|null>(null);
 useLayoutEffect(()=>{
  const element=root.current;if(!element)return;
  const measure=()=>{const selected=element.querySelector<HTMLElement>('[data-selection-active=true]');if(!selected){setBox(null);return;}
   const next={x:selected.offsetLeft,y:selected.offsetTop,width:selected.offsetWidth,height:selected.offsetHeight};
   setBox(previous=>previous&&Object.keys(next).every(key=>previous[key as keyof typeof next]===next[key as keyof typeof next])?previous:next);
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(element);for(const child of element.querySelectorAll<HTMLElement>('[data-selection-active]'))observer.observe(child);
  let active=true;document.fonts.ready.then(()=>{if(active)measure();});return()=>{active=false;observer.disconnect();};
 },[activeKey,children]);
 return <Tag {...props} ref={root as React.Ref<never>} className={className+' selection-track'} data-selection-ready={!!box}><span className="selection-indicator" aria-hidden="true" style={box?{width:box.width,height:box.height,transform:`translate3d(${box.x}px,${box.y}px,0)`}:undefined}/>{children}</Tag>;
}
