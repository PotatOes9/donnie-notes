export type EmbedTarget={src:string;kind:'video'|'widget'};
export function embedTarget(value:unknown):EmbedTarget|undefined {
  if(typeof value!=='string')return;
  try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return;
    const host=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);
    if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)){
      const id=host==='youtu.be'?parts[0]:['embed','shorts'].includes(parts[0])?parts[1]:u.searchParams.get('v');
      if(id&&/^[\w-]{11}$/.test(id)){
        const target=new URL('https://www.youtube-nocookie.com/embed/'+id),raw=u.searchParams.get('start')||u.searchParams.get('t')||'';
        const match=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
        const start=/^\d+$/.test(raw)?Number(raw):match?Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0):0;
        if(start>0&&start<604800)target.searchParams.set('start',String(start));
        return{src:target.href,kind:'video'};
      }
    }
    if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
      const id=parts.find(x=>/^\d+$/.test(x));if(id){const target=new URL('https://player.vimeo.com/video/'+id),hash=u.searchParams.get('h');if(hash&&/^[a-f0-9]{1,64}$/i.test(hash))target.searchParams.set('h',hash);return{src:target.href,kind:'video'};}
    }
    if(host==='open.spotify.com'&&['track','album','playlist','episode','show','artist'].includes(parts[0])&&/^[\w]+$/.test(parts[1]||''))return{src:'https://open.spotify.com/embed/'+parts.slice(0,2).join('/'),kind:'widget'};
    if(['www.figma.com','figma.com'].includes(host)&&['file','design','proto','board'].includes(parts[0]))return{src:'https://www.figma.com/embed?embed_host=share&url='+encodeURIComponent(u.href),kind:'widget'};
    if(['codepen.io','codesandbox.io','stackblitz.com','www.geogebra.org','www.desmos.com','www.google.com','docs.google.com'].includes(host)){
      if(host==='codepen.io'&&parts[1]==='pen')parts[1]='embed';
      else if(host==='codepen.io'&&parts[1]!=='embed')return;
      if(host==='codesandbox.io'&&parts[0]==='s')parts[0]='embed';
      if(host==='stackblitz.com')u.searchParams.set('embed','1');
      if(host==='www.google.com'&&!u.pathname.startsWith('/maps/embed'))return;
      u.pathname='/'+parts.join('/');return{src:u.href,kind:'widget'};
    }
  }catch{}
}
export function notionFileEmbed(value:unknown):'html'|'pdf'|undefined {
  if(typeof value!=='string')return;
  try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return;
    if(!(/(^|\.)notion-static\.com$/.test(u.hostname)||/(^|\.)notion\.so$/.test(u.hostname)||/^prod-files-secure\.[^.]+\.amazonaws\.com$/.test(u.hostname)||/^prod-files-secure\.[^.]+\.[^.]+\.amazonaws\.com$/.test(u.hostname)))return;
    const name=decodeURIComponent(u.pathname).toLowerCase();if(/\.html?$/.test(name))return 'html';if(name.endsWith('.pdf'))return 'pdf';
  }catch{}
}
