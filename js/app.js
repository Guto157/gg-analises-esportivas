const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const STORE='gg-analises-entries-v1';let entries=load();

const CATALOG_ENDPOINT='/api/catalog';
const sportSelect=$('#sport'),competitionSelect=$('#competition'),matchSelect=$('#match'),catalogStatus=$('#catalog-status');
let catalog=[];
function setOptions(select,items,placeholder){select.innerHTML='';const first=document.createElement('option');first.value='';first.textContent=placeholder;select.appendChild(first);items.forEach(item=>{const option=document.createElement('option');option.value=String(item.id??item.name);option.textContent=item.name;select.appendChild(option)});select.disabled=items.length===0}
function resetMatchList(message='Selecione primeiro a competição'){setOptions(matchSelect,[],message)}
async function loadCatalog(){
  const sport=sportSelect.value;
  competitionSelect.disabled=true;resetMatchList('Aguardando lista de partidas...');
  setOptions(competitionSelect,[],'Carregando competições...');
  catalogStatus.textContent='Buscando competições e partidas disponíveis...';
  try{
    const response=await fetch(CATALOG_ENDPOINT+'?sport='+encodeURIComponent(sport),{headers:{'Accept':'application/json'}});
    if(!response.ok)throw new Error('Catálogo indisponível');
    const data=await response.json();
    catalog=Array.isArray(data.competitions)?data.competitions:[];
    setOptions(competitionSelect,catalog,'Selecione uma competição');
    catalogStatus.textContent=catalog.length?'Catálogo atualizado. Escolha a competição e depois a partida.':'Nenhuma competição disponível para este esporte no momento.';
  }catch(error){
    catalog=[];
    setOptions(competitionSelect,[],'Catálogo ainda não conectado');
    resetMatchList('Partidas indisponíveis');
    catalogStatus.textContent='Não foi possível acessar o catálogo público agora. Tente novamente em instantes.';
  }
}
function updateMatches(){
  const selected=competitionSelect.value;
  const competition=catalog.find(item=>String(item.id??item.name)===selected);
  const matches=competition&&Array.isArray(competition.matches)?competition.matches:[];
  setOptions(matchSelect,matches,matches.length?'Selecione uma partida':'Nenhuma partida disponível nesta competição');
  if(competition&&matches.length===0)catalogStatus.textContent='A competição foi carregada, mas ainda não há partidas disponíveis nela.';
}
sportSelect.addEventListener('change',loadCatalog);
competitionSelect.addEventListener('change',updateMatches);

function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
function save(){localStorage.setItem(STORE,JSON.stringify(entries));render()}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function fmtDate(v){if(!v)return 'Data não informada';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('pt-BR')}
function showPage(name){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+name));$$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===name));const titles={overview:'Visão geral',analysis:'Analisar partida',history:'Histórico',entries:'Minhas entradas',stats:'Estatísticas',progress:'Progressão'};$('#page-title').textContent=titles[name]||'GG Análises'}
function totals(){const settled=entries.filter(e=>['Green','Red'].includes(e.status));const greens=entries.filter(e=>e.status==='Green').length,reds=entries.filter(e=>e.status==='Red').length,voids=entries.filter(e=>e.status==='Anulado').length,cashouts=entries.filter(e=>e.status==='Cashout').length;const invested=entries.reduce((s,e)=>s+Number(e.stake),0);const net=entries.reduce((s,e)=>s+(e.status==='Green'?Number(e.stake)*(Number(e.odd)-1):e.status==='Red'?-Number(e.stake):e.status==='Cashout'?Number(e.cashout)-Number(e.stake):0),0);return{greens,reds,voids,cashouts,invested,net,rate:settled.length?greens/settled.length*100:0,count:entries.length,roi:invested?net/invested*100:0}}
function statCard(label,value,sub=''){return '<div class="stat-card"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>'}
function cards(){const t=totals();$('#overview-stats').innerHTML=statCard('Entradas registradas',t.count,'Total de registros')+statCard('Taxa de acerto',t.rate.toFixed(1)+'%','Greens ÷ (greens + reds)')+statCard('Resultado líquido',money(t.net),'Considera cashouts informados')+statCard('ROI',t.roi.toFixed(1)+'%','Lucro líquido ÷ total apostado');$('#full-stats').innerHTML=statCard('Greens',t.greens,'Entradas vencedoras')+statCard('Reds',t.reds,'Entradas perdedoras')+statCard('Anuladas',t.voids,'Stake devolvida')+statCard('Cashouts',t.cashouts,'Saída antecipada')+statCard('Taxa de acerto',t.rate.toFixed(1)+'%','Sem anuladas e cashouts')+statCard('Total apostado',money(t.invested),'Soma das stakes')+statCard('Lucro / prejuízo',money(t.net),'Resultado líquido')+statCard('ROI',t.roi.toFixed(1)+'%','Sobre o total apostado');$('#result-breakdown').innerHTML=[['Green',t.greens],['Red',t.reds],['Anulado',t.voids],['Cashout',t.cashouts],['Sem resultado',entries.filter(e=>!e.status).length]].map(x=>'<div class="result-pill">'+x[0]+' <strong>'+x[1]+'</strong></div>').join('')}
function row(e){const result=e.status?'<span class="result-pill">'+e.status+(e.status==='Cashout'?' · '+money(e.cashout):'')+'</span>':'<div class="entry-actions"><button class="result-btn green" data-result="Green" data-id="'+e.id+'">Green</button><button class="result-btn red" data-result="Red" data-id="'+e.id+'">Red</button><button class="result-btn neutral" data-result="Anulado" data-id="'+e.id+'">Anulado</button><button class="result-btn" data-result="Cashout" data-id="'+e.id+'">Cashout</button></div>';return '<article class="entry-row"><div><strong>'+escapeHtml(e.match)+'</strong><p>'+escapeHtml(e.sport)+' · '+escapeHtml(e.competition)+' · '+escapeHtml(e.market)+'</p><p>Odd '+Number(e.odd).toFixed(2)+' · Stake '+money(e.stake)+' · '+fmtDate(e.date)+'</p></div><div class="entry-actions">'+result+'<button class="delete-btn" data-delete="'+e.id+'" aria-label="Excluir entrada">Excluir</button></div></article>'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){cards();const sorted=[...entries].sort((a,b)=>new Date(b.date)-new Date(a.date));const html=sorted.length?sorted.map(row).join(''):'<div class="empty-state">Nenhuma entrada registrada ainda.</div>';$('#history-list').innerHTML=html;$('#recent-list').innerHTML=sorted.length?sorted.slice(0,4).map(row).join(''):'<div class="empty-state">Suas entradas registradas aparecerão aqui.</div>'}
$('#navigation').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)showPage(b.dataset.page)});
document.addEventListener('click',e=>{const go=e.target.closest('[data-go]');if(go)showPage(go.dataset.go);const del=e.target.closest('[data-delete]');if(del){entries=entries.filter(x=>x.id!==del.dataset.delete);save()}const res=e.target.closest('[data-result]');if(res){const item=entries.find(x=>x.id===res.dataset.id);if(!item)return;let cashout=null;if(res.dataset.result==='Cashout'){const raw=prompt('Quanto recebeu no cashout? (R$)');if(raw===null)return;cashout=Number(raw.replace(',','.'));if(!Number.isFinite(cashout)||cashout<0){alert('Informe um valor válido.');return}}item.status=res.dataset.result;if(cashout!==null)item.cashout=cashout;save()}});
$('#entry-form').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);const item=Object.fromEntries(f.entries());item.id=crypto.randomUUID?crypto.randomUUID():String(Date.now());item.odd=Number(item.odd);item.stake=Number(item.stake);if(!item.date)item.date=new Date().toISOString();entries.push(item);save();e.currentTarget.reset();showPage('history')});
$('#simulate').addEventListener('click',()=>{const start=Number($('#progress-start').value),odd=Number($('#progress-odd').value),target=Number($('#progress-target').value),out=$('#progress-result');if(!(start>0&&odd>1&&target>start)){out.textContent='Confira os valores. O objetivo precisa ser maior que o valor inicial e a odd deve ser superior a 1.';return}let value=start,steps=0;while(value<target&&steps<100){value*=odd;steps++}out.innerHTML='Etapas necessárias: <strong>'+steps+'</strong><br>Valor projetado ao final: <strong>'+money(value)+'</strong><br>Valor inicial exposto: '+money(start)+'<br><span style="color:#91a2b9">Cálculo hipotético com green em todas as etapas.</span>'});
render();
loadCatalog();

// Motor de análise: chama o backend seguro, nunca expõe chaves no navegador.
const analysisButton=$('#analysis-button');
const analysisPanel=document.createElement('section');
analysisPanel.id='analysis-results';
analysisPanel.className='panel';
analysisPanel.hidden=true;
analysisPanel.style.marginTop='18px';
$('#page-analysis').appendChild(analysisPanel);

function syncAnalysisButton(){
  const ready=Boolean(competitionSelect.value&&matchSelect.value);
  analysisButton.disabled=!ready;
  analysisButton.textContent=ready?'Executar análise com os 6 agentes':'Selecione competição e partida';
}
competitionSelect.addEventListener('change',syncAnalysisButton);
matchSelect.addEventListener('change',syncAnalysisButton);
sportSelect.addEventListener('change',()=>{analysisButton.disabled=true;analysisButton.textContent='Carregando catálogo...'});
const originalLoadCatalog=loadCatalog;
loadCatalog=async function(){await originalLoadCatalog();syncAnalysisButton()};
const originalUpdateMatches=updateMatches;
updateMatches=function(){originalUpdateMatches();syncAnalysisButton()};

function renderAnalysis(data){
  const agents=Array.isArray(data.agents)?data.agents:[];
  const cards=agents.map(agent=>{
    const sources=Array.isArray(agent.sources)?agent.sources:[];
    const links=sources.map(source=>source.url?'<li><a href="'+escapeHtml(source.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(source.title||source.url)+'</a></li>':'').join('');
    return '<article class="agent-card"><span>ESPECIALISTA</span><h3>'+escapeHtml(agent.name||agent.id)+'</h3><p style="white-space:pre-wrap">'+escapeHtml(agent.report||'Relatório não retornado.')+'</p>'+(links?'<details><summary>Fontes consultadas ('+sources.length+')</summary><ul>'+links+'</ul></details>':'<p class="helper">Nenhuma fonte retornada.</p>')+'</article>';
  }).join('');
  analysisPanel.hidden=false;
  analysisPanel.innerHTML='<div class="section-heading"><div><p class="eyebrow">RESULTADO DA PESQUISA</p><h2>Análise dos especialistas</h2><p class="muted">Concluída em '+fmtDate(data.completedAt)+'</p></div></div><div class="agents-grid">'+cards+'</div><div class="chief-report"><p class="eyebrow">DECISÃO DA IA CHEFE</p><h2>Consolidação final</h2><p style="white-space:pre-wrap">'+escapeHtml(data.chief||'A IA chefe não retornou uma conclusão.')+'</p></div>';
  analysisPanel.scrollIntoView({behavior:'smooth',block:'start'});
}

analysisButton.addEventListener('click',async()=>{
  if(analysisButton.disabled)return;
  const competition=catalog.find(item=>String(item.id??item.name)===competitionSelect.value);
  const match=competition?.matches?.find(item=>String(item.id??item.name)===matchSelect.value);
  if(!competition||!match)return;
  analysisButton.disabled=true;
  analysisButton.textContent='Os 5 especialistas estão pesquisando...';
  analysisPanel.hidden=false;
  analysisPanel.textContent='Aguardando os relatórios independentes. A IA chefe só será chamada depois que os cinco especialistas terminarem.';
  try{
    const response=await fetch('/api/analyze',{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({
        sport:sportSelect.value,
        competition:competition.name,
        leagueId:String(competition.id),
        eventId:String(match.id),
        match:match.name,
        market:$('#analysis-type').value==='Mercado específico'?$('#market').value.trim():''
      })
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||data.detail||'O backend não conseguiu concluir a análise.');
    renderAnalysis(data);
  }catch(error){
    analysisPanel.innerHTML='<h2>Não foi possível concluir a análise</h2><p>'+escapeHtml(error.message)+'</p><p class="helper">Verifique se o Worker está publicado e se o binding gratuito Workers AI está ativo. Se a fonte não trouxer dados suficientes, a análise será inconclusiva.</p>';
  }finally{
    syncAnalysisButton();
  }
});
syncAnalysisButton();
