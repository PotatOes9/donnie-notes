import hljs from 'highlight.js';
export function escapeCode(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
export function highlightedCode(code:string,language:string):string {
  const aliases:Record<string,string>={'plain text':'plaintext',markup:'xml',html:'xml',shell:'bash',docker:'dockerfile','c#':'csharp','f#':'fsharp','vb.net':'vbnet','visual basic':'vbnet','objective-c':'objectivec','java/c/c++/c#':'cpp',flow:'javascript',webassembly:'wasm'};
  const name=aliases[language.toLowerCase()]||language.toLowerCase();
  if(code.length>100000||!hljs.getLanguage(name))return escapeCode(code);
  try{return hljs.highlight(code,{language:name,ignoreIllegals:true}).value;}catch{return escapeCode(code);}
}
