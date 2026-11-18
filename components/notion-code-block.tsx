'use client';
import {useEffect,useId,useRef,useState} from 'react';

let diagramQueue:Promise<unknown>=Promise.resolve();
function Diagram({code,fallback}:{code:string;fallback:React.ReactNode}){
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,''),generation=useRef(0),root=useRef<HTMLDivElement>(null),[near,setNear]=useState(false),[svg,setSvg]=useState('');
  useEffect(()=>{
    if(typeof IntersectionObserver==='undefined'){setNear(true);return;}
    const observer=new IntersectionObserver(entries=>setNear(entries.some(entry=>entry.isIntersecting)),{rootMargin:'300px'});
    if(root.current)observer.observe(root.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!near)return;
    let mounted=true;
    const draw=()=>{
      const current=++generation.current;
      const task=diagramQueue.then(async()=>{
        if(!mounted||code.length>100000)return '';
        const {default:mermaid}=await import('mermaid');
        await document.fonts.ready;
        if(!mounted||current!==generation.current)return '';
        mermaid.initialize({startOnLoad:false,securityLevel:'strict',suppressErrorRendering:true,maxTextSize:100000,maxEdges:500,secure:['securityLevel','startOnLoad','maxTextSize','maxEdges','suppressErrorRendering'],theme:document.documentElement.dataset.theme==='dark'?'dark':'default',flowchart:{htmlLabels:false},fontFamily:getComputedStyle(document.body).fontFamily});
        const result=await mermaid.render('notion-diagram-'+id+'-'+current,code);return result.svg;
      });
      diagramQueue=task.catch(()=>{});
      task.then(value=>{if(mounted&&current===generation.current)setSvg(value);}).catch(()=>{if(mounted&&current===generation.current)setSvg('');});
    };
    draw();const observer=new MutationObserver(draw);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return()=>{mounted=false;observer.disconnect();};
  },[code,id,near]);
  return <div ref={root}>{svg?<div className="notion-diagram" dangerouslySetInnerHTML={{__html:svg}}/>:fallback}</div>;
}

export function NotionCodeBlock({code,language,html,caption,labels}:{code:string;language:string;html:string;caption?:React.ReactNode;labels:{copy:string;copied:string;failed:string;showCode:string;showDiagram:string}}){
  const [copied,setCopied]=useState(false),[error,setError]=useState(''),[source,setSource]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  async function copy(){try{await navigator.clipboard.writeText(code);setCopied(true);setError('');if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setCopied(false),2200);}catch{setError(labels.failed);}}
  const content=<pre tabIndex={0}><code className="hljs" dangerouslySetInnerHTML={{__html:html}}/></pre>,diagram=language.toLowerCase()==='mermaid';
  return <figure className="notion-code-block"><div className="notion-code-toolbar"><span>{language}</span><div>{diagram&&<button type="button" onClick={()=>setSource(!source)}>{source?labels.showDiagram:labels.showCode}</button>}<button type="button" onClick={copy}>{copied?labels.copied:labels.copy}</button></div></div>{diagram&&!source?<Diagram code={code} fallback={content}/>:content}{error&&<p className="notion-copy-error" role="status">{error}</p>}{caption&&<figcaption>{caption}</figcaption>}</figure>;
}
