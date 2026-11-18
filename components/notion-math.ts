import {createElement} from 'react';
import katex from 'katex';
export function MathExpression({expression,display=false}:{expression:string;display?:boolean}){
  const source=String(expression).slice(0,20000);
  let html:string;
  try{html=katex.renderToString(source,{displayMode:display,throwOnError:false,trust:false,strict:'ignore',maxExpand:1000,maxSize:20,output:'htmlAndMathml',errorColor:'#b14643'});}
  catch{return createElement(display?'div':'span',{className:'notion-math-fallback'},source);}
  return createElement(display?'div':'span',{className:display?'notion-math-block':'notion-math-inline',dangerouslySetInnerHTML:{__html:html}});
}
