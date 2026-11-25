"""Exercise the installed-style renderer in an isolated, synthetic Chromium page."""
import argparse
import json
import re
import subprocess
import tempfile
import time
from pathlib import Path

project = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--project', type=Path, default=project)
parser.add_argument('--renderer', type=Path)
parser.add_argument('--browser', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
parser.add_argument('--baseline', action='store_true')
args = parser.parse_args()
assets = args.project / 'macos/assets'
source = (args.renderer or assets / 'renderer-inject.js').read_text()
values = {'CSS': (assets / 'dream-skin.css').read_text(),
          'ART': 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
          'THEME': json.loads((args.project / 'macos/presets/preset-youminghua/theme.json').read_text()),
          'VERSION': 'fixture', 'STYLE_REVISION': 'fixture', 'PAYLOAD_REVISION': 'fixture'}
source = re.sub(r'__DREAM_SKIN_([A-Z_]+)_JSON__', lambda m: json.dumps(values[m[1]]), source)
page = """<!doctype html><meta charset=utf-8><aside class="app-shell-left-panel"></aside>
<header data-app-shell-titlebar="true"><div data-app-shell-header-slot="end" id="endSlot"></div></header>
<main class="main-surface"><article id="reply"></article><div class="composer-surface-chrome" id="compose"><textarea></textarea></div></main>
<pre id="result">pending</pre><script>
let queries=0,orig=Document.prototype.querySelectorAll;
Document.prototype.querySelectorAll=function(...a){queries++;return orig.apply(this,a)};
for(let i=0;i<300;i++){let p=document.createElement('p');p.append('message ',document.createElement('code'));reply.append(p)}
</script><script src="./skin.js"></script><script>
async function run(){
 const st=window.__CODEX_DREAM_SKIN_STATE__, wait=()=>new Promise(r=>setTimeout(r,180)), b={};await wait();
 for(let mode of ['idle','text','append','batch','nested','remove']){
   const q=queries,n=st.metrics.partPasses;
   for(let i=0;i<3;i++){
     if(mode==='text')reply.firstChild.firstChild.data+='.';
     if(mode==='append'||mode==='batch')for(let k=0;k<(mode==='batch'?10:1);k++)reply.append(document.createElement('code'));
     if(mode==='nested')reply.insertAdjacentHTML('beforeend','<ul><li><code class="language-js">x</code></li></ul>');
     if(mode==='remove')reply.lastElementChild.remove();
     await wait();
   }
   b[mode]=[queries-q,st.metrics.partPasses-n];
 }
 const tagged=(e,t)=>e.getAttribute('data-ds-part')===t;
 const assert=(v,s)=>{if(!v)throw Error(s)};
 assert(st.scope.level==='L1' && tagged(endSlot.parentElement,'header'),'thread titlebar not recognized');
 const side=document.createElement('aside');side.dataset.appShellFocusArea='right-panel';
 const color=()=>getComputedStyle(endSlot).backgroundColor,base=color();document.body.append(side);await wait();
 const flush=()=>new Promise(r=>setTimeout(r,0)),scrim=()=>getComputedStyle(endSlot.parentElement,'::after').right;
 const openColor=color();assert(openColor!==base,'open panel paint');
 for (const [attr,val] of [['aria-hidden','true'],['inert',''],['style','width: 0px']]) {
   side.setAttribute(attr,val);await flush();assert(color()===base && scrim()==='0px','closed pane: '+attr);
   side.removeAttribute(attr);await flush();assert(color()===openColor,'reopen: '+attr);
 }
 const cache=document.createElement('div');cache.dataset.appShellActivePage='false';document.body.append(cache);cache.append(side);await flush();assert(color()===base,'retained hidden route');
 const second=side.cloneNode();document.body.append(second);await flush();assert(color()===openColor,'second active pane');
 second.remove();await flush();assert(color()===base,'last active pane removed');
 cache.dataset.appShellActivePage='true';await flush();assert(color()===openColor,'restored route');
 const standalone=document.createElement('div');standalone.dataset.appShellTitlebarSlot='content';standalone.dataset.appShellFocusArea='right-panel';document.body.append(standalone);await flush();assert(getComputedStyle(standalone).backgroundColor===openColor,'standalone content slot');
 side.dataset.appShellFocusArea='other';await flush();assert(color()===base,'pane changed identity');side.dataset.appShellFocusArea='right-panel';await flush();assert(color()===openColor,'pane regained identity');
 side.remove();cache.remove();standalone.remove();await wait();assert(color()===base,'closed panel paint');

 let c=compose.cloneNode(true);c.removeAttribute('data-ds-part');compose.replaceWith(c);await wait();assert(tagged(c,'composer'),'new composer not found');
 let wrap=document.createElement('p');wrap.innerHTML='<span role="dialog"></span>';reply.append('new text',wrap);await wait();
 assert(tagged(wrap.firstChild,'dialog')&&st.scope.overlay,'nested dialog missed in mixed batch');wrap.remove();await wait();
 assert(!wrap.firstChild.hasAttribute('data-ds-part')&&!st.scope.overlay,'detached dialog not cleared');
 let msg=document.createElement('p');msg.dataset.messageAuthorRole='assistant';reply.append(msg);await wait();assert(tagged(msg,'message'),'new message owner missed');
 let settings=document.createElement('div');settings.dataset.settingsPanelSlug='general-settings';document.body.append(settings);await wait();assert(st.scope.baseState==='settings','route change missed');
 settings.remove();await wait();assert(st.scope.baseState==='thread','route not restored');
 const fade=document.createElement('div');fade.dataset.appShellMainContentTopFade='';document.querySelector('main').append(fade);await wait();
 document.documentElement.setAttribute('data-dream-art-wide','true');assert(getComputedStyle(fade).display==='none','empty fade not hidden');
 fade.innerHTML='<p></p>';await wait();assert(getComputedStyle(fade).display!=='none','populated route hidden');
 const thread = document.createElement('section');
 thread.innerHTML = `<div class="thread-scroll-container" style="height:140px;overflow:auto">
   <div data-thread-user-message-navigation-content><div style="height:500px"></div></div>
   <div data-thread-scroll-footer><button class="group/scroll-to-bottom" aria-hidden="true"></button>
     <div data-thread-find-composer><div data-codex-composer-root>
       <div contenteditable="true">draft</div><button class="bg-composer-primary"></button>
     </div></div>
   </div></div>`;
 document.body.append(thread);
 const scroll = thread.firstChild, timeline = scroll.firstElementChild;
 const draft = thread.querySelector('[contenteditable]'), send = thread.querySelector('.bg-composer-primary');
 const jump = thread.querySelector('[aria-hidden]'), remaining=()=>scroll.scrollHeight-scroll.clientHeight-scroll.scrollTop;
 let jumps=0;
 jump.onclick=()=>{jumps++;scroll.scrollTop=scroll.scrollHeight};
 const enter = (options={})=>draft.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,...options}));
 const add = ()=>timeline.insertAdjacentHTML('beforeend','<div style="height:60px" data-user-message-bubble>message</div>');
 for(const event of [{shiftKey:true},{isComposing:true}]){
   enter(event);add();await wait();assert(scroll.scrollTop===0,'non-send key moved transcript');
 }
 enter();await wait();assert(scroll.scrollTop===0,'unsubmitted draft moved transcript');
 send.click();draft.textContent='';add();await wait();assert(remaining()<1,'send did not reach bottom');
 add();await wait();assert(remaining()<1,'stream growth stopped following');
 scroll.dispatchEvent(new WheelEvent('wheel',{deltaY:-20,bubbles:true}));scroll.scrollTop=20;
 add();await wait();assert(scroll.scrollTop===20,'manual scroll was overridden');
 draft.textContent='another';jump.setAttribute('aria-hidden','false');enter();add();await wait();
 assert(jumps===1 && remaining()<1,'native jump was not used');
 st.cleanup();draft.textContent='detached';scroll.scrollTop=0;enter();add();await wait();
 assert(jumps===1 && scroll.scrollTop===0,'cleaned-up listener moved transcript');
 return b;
}
run().then(b=>result.textContent=JSON.stringify(b)).catch(e=>result.textContent=String(e))
  .then(() => console.info('CAMELLIA_RESULT=' + result.textContent));
</script>"""
with tempfile.TemporaryDirectory() as d:
    root = Path(d)
    (root/'skin.js').write_text(source)
    (root/'test.html').write_text(page)
    # Virtual time advances JS timers without delivering every layout/paint frame.
    # Use real frames for ResizeObserver and scroll handoff; close our test browser on completion.
    with (root/'chrome.log').open('w+') as log:
        browser = subprocess.Popen([args.browser, '--headless','--disable-background-networking','--disable-sync',
                                    '--no-first-run','--no-default-browser-check','--enable-logging=stderr',
                                    '--user-data-dir='+str(root/'profile'), (root/'test.html').as_uri()],
                                   stdout=subprocess.DEVNULL, stderr=log)
        try:
            deadline = time.monotonic() + 35
            with (root/'chrome.log').open() as reader:
                while time.monotonic() < deadline:
                    match = re.search(r'\bCONSOLE.*?"CAMELLIA_RESULT=(.*?)", source:', reader.read())
                    if match:
                        break
                    if browser.poll() is not None:
                        raise SystemExit(f'Chromium exited before reporting the result ({browser.returncode})')
                    time.sleep(.1)
                else:
                    raise SystemExit('Chromium did not finish the streaming test within 35 seconds')
        finally:
            browser.terminate()
            browser.wait(timeout=10)
    if not match[1].startswith('{'):
        raise SystemExit(match[1])
    report = json.loads(match[1])
    print('document queries / structural passes:', report)
    if not args.baseline and any(values != [0,0] for values in report.values()):
        raise SystemExit('Unexpected structural pass in prose')
    print('Preview panel, composer, nested dialog, message, route and fade guard passed.')
