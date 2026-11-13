import { loadLocalAI, runLocalAgent, LOCAL_MODEL } from './local-ai.js?v=20261113-2';
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const STORE='gg-analises-entries-v1';const PAGE_STORE='gg-analises-active-page-v1';let entries=load();

const sportSelect=$('#sport'),competitionSelect=$('#competition'),matchSelect=$('#match'),catalogStatus=$('#catalog-status');
let catalog=[];
const SPORT_SCORE='https://sportscore.com/api/v1';
const SPORT_LABELS={Futebol:'football',Basquete:'basketball'};
function dayKey(date){return date.toISOString().slice(0,10)}
function resetMatchList(message='Selecione primeiro a competição'){setOptions(matchSelect,[],message)}
function setOptions(select,items,placeholder){
  select.innerHTML='';
  const first=document.createElement('option');first.value='';first.textContent=placeholder;select.appendChild(first);
  items.forEach(item=>{const option=document.createElement('option');option.value=String(item.id??item.name);option.textContent=item.name;select.appendChild(option)});
  select.disabled=items.length===0;
}
function pick(obj,keys){
  for(const key of keys){const value=obj?.[key];if(value!==undefined&&value!==null&&value!=='')return value}
  return null;
}
function teamLabel(value){
  if(typeof value==='string')return value;
  return pick(value,['name','display_name','displayName','short_name','shortName','title'])||'';
}
function normalizeFixture(raw,sport){
  const home=teamLabel(pick(raw,['home_team','home','homeTeam'])||raw?.teams?.home||raw?.participants?.[0]);
  const away=teamLabel(pick(raw,['away_team','away','awayTeam'])||raw?.teams?.away||raw?.participants?.[1]);
  const date=pick(raw,['kickoff','date','datetime','start_time','startTime','time','match_time']);
  const id=pick(raw,['slug','fixture_slug','match_slug','id','fixture_id','event_id']);
  if(!home||!away||!date||!id)return null;
  const competitionRaw=pick(raw,['competition','league','tournament'])||{};
  const competitionName=typeof competitionRaw==='string'?competitionRaw:teamLabel(competitionRaw);
  const competitionSlug=typeof competitionRaw==='object'?pick(competitionRaw,['slug','id','code']):null;
  return{
    id:String(id),
    slug:String(pick(raw,['slug','fixture_slug','match_slug'])||id),
    name:home+' x '+away,
    date:new Date(date).toISOString(),
    status:pick(raw,['status','status_text','state'])||'Agendada',
    competitionName:competitionName||'Outras competições',
    competitionSlug:competitionSlug?String(competitionSlug):'',
    sport,
    raw
  };
}
async function fetchSportScoreDay(sport,date){
  const url=SPORT_SCORE+'/fixtures/?sport='+encodeURIComponent(SPORT_LABELS[sport])+'&date='+encodeURIComponent(date)+'&status=upcoming&limit=200';
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('SportScore '+response.status);
  const data=await response.json();
  const list=Array.isArray(data)?data:(data.fixtures||data.matches||data.events||data.data?.fixtures||data.data?.matches||data.data||[]);
  if(!Array.isArray(list))throw new Error('Formato de calendário não reconhecido');
  return{url,list};
}
async function loadCatalog(){
  const sport=sportSelect.value;
  competitionSelect.disabled=true;resetMatchList('Consultando partidas...');
  setOptions(competitionSelect,[],'Carregando competições...');
  catalogStatus.textContent='Consultando calendário de futebol e basquete no SportScore...';
  const now=new Date();
  const dates=Array.from({length:15},(_,index)=>dayKey(new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+index))));
  const results=[];
  let cursor=0;
  const workers=Array.from({length:5},async()=>{
    while(cursor<dates.length){
      const date=dates[cursor++];
      try{results.push({date,...await fetchSportScoreDay(sport,date),ok:true})}
      catch(error){results.push({date,ok:false,error:String(error?.message||error)})}
    }
  });
  await Promise.all(workers);
  const matches=new Map();
  results.filter(item=>item.ok).forEach(result=>result.list.forEach(raw=>{
    try{
      const match=normalizeFixture(raw,sport);
      if(!match)return;
      const kickoff=Date.parse(match.date);
      if(!Number.isFinite(kickoff)||kickoff<Date.now())return;
      matches.set(match.id,match);
    }catch{}
  }));
  const groups=new Map();
  [...matches.values()].forEach(match=>{
    const key=match.competitionSlug||match.competitionName;
    if(!groups.has(key))groups.set(key,{id:key,name:match.competitionName,matches:[]});
    groups.get(key).matches.push(match);
  });
  catalog=[...groups.values()].map(group=>({...group,matches:group.matches.sort((x,y)=>Date.parse(x.date)-Date.parse(y.date))}))
    .sort((x,y)=>x.name.localeCompare(y.name,'pt-BR'));
  setOptions(competitionSelect,catalog,'Selecione uma competição');
  const total=[...matches.values()].length;
  const okDays=results.filter(item=>item.ok).length;
  if(total){
    catalogStatus.textContent=total+' partidas futuras encontradas em '+catalog.length+' competições. Dados fornecidos por SportScore.';
  }else if(!okDays){
    catalogStatus.textContent='O SportScore não respondeu às consultas agora. Tente novamente mais tarde.';
  }else{
    catalogStatus.textContent='O SportScore respondeu, mas não retornou partidas futuras para os próximos 14 dias.';
  }
}
function updateMatches(){
  const competition=catalog.find(item=>String(item.id)===competitionSelect.value);
  const matches=competition?.matches||[];
  setOptions(matchSelect,matches,matches.length?'Selecione uma partida':'Nenhuma partida disponível');
}
sportSelect.addEventListener('change',loadCatalog);
competitionSelect.addEventListener('change',updateMatches);

function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
function save(){localStorage.setItem(STORE,JSON.stringify(entries));render()}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function fmtDate(v){if(!v)return 'Data não informada';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('pt-BR')}
function showPage(name){const pages=['overview','analysis','history','entries','stats','progress'];if(!pages.includes(name))name='overview';$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+name));$$('.nav-link').forEach(b=>{const active=b.dataset.page===name;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});const titles={overview:'Visão geral',analysis:'Analisar partida',history:'Histórico',entries:'Minhas entradas',stats:'Estatísticas',progress:'Progressão'};$('#page-title').textContent=titles[name];try{localStorage.setItem(PAGE_STORE,name)}catch{}}
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
// Análise com seis funções independentes executadas por um modelo local no aparelho.
const analysisButton=$('#analysis-button');
const analysisPanel=document.createElement('section');
analysisPanel.id='analysis-results';analysisPanel.className='panel';analysisPanel.hidden=true;analysisPanel.style.marginTop='18px';
$('#page-analysis').appendChild(analysisPanel);

function syncAnalysisButton(){
  const ready=Boolean(competitionSelect.value&&matchSelect.value);
  analysisButton.disabled=!ready;
  analysisButton.textContent=ready?'Carregar IA local e analisar':'Selecione competição e partida';
}
competitionSelect.addEventListener('change',syncAnalysisButton);
matchSelect.addEventListener('change',syncAnalysisButton);
sportSelect.addEventListener('change',()=>{analysisButton.disabled=true;analysisButton.textContent='Carregando calendário...'});
competitionSelect.addEventListener('change',syncAnalysisButton);
matchSelect.addEventListener('change',syncAnalysisButton);

function summarizeRecentMatches(schedule,teamId,cutoff){
  return (schedule?.events||[])
    .filter(event=>{
      const date=Date.parse(event.date||'');
      return Number.isFinite(date)&&date<cutoff&&(event.status?.type?.completed===true||event.status?.type?.state==='post');
    })
    .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
    .slice(0,8)
    .map(event=>{
      const competition=event.competitions?.[0]||{};
      const competitors=competition.competitors||[];
      const team=competitors.find(item=>String(item.id||item.team?.id)===String(teamId));
      const opponent=competitors.find(item=>item!==team);
      if(!team||!opponent)return null;
      const scored=Number(team.score),conceded=Number(opponent.score);
      const result=team.winner===true?'V':team.winner===false?'D':
        Number.isFinite(scored)&&Number.isFinite(conceded)?(scored>conceded?'V':scored<conceded?'D':'E'):'N/D';
      return{
        date:event.date,
        opponent:opponent.team?.displayName||opponent.team?.name||'Adversário não identificado',
        venue:team.homeAway==='home'?'Casa':'Fora',
        score:String(team.score??'N/D')+' x '+String(opponent.score??'N/D'),
        result
      };
    }).filter(Boolean);
}

async function fetchMatchEvidence(sport,matchSlug){
  const sportKey=SPORT_LABELS[sport];
  const detailUrl='https://sportscore.com/api/widget/match/?sport='+encodeURIComponent(sportKey)+'&slug='+encodeURIComponent(matchSlug);
  const response=await fetch(detailUrl,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Detalhes da partida indisponíveis no SportScore ('+response.status+').');
  const payload=await response.json();
  const detail=payload.match||payload.fixture||payload.data?.match||payload.data?.fixture||payload.data||payload;
  const teams=detail.teams||{};
  const home=teamLabel(detail.home_team||detail.home||teams.home||detail.participants?.[0]);
  const away=teamLabel(detail.away_team||detail.away||teams.away||detail.participants?.[1]);
  const stats=detail.statistics||detail.stats||detail.boxscore||null;
  const lineups=detail.lineups||detail.lineup||null;
  const injuries=detail.injuries||detail.absences||null;
  const articles=detail.news||detail.articles||[];
  const sources=[{title:'SportScore: detalhes da partida',url:detailUrl}];
  return{
    summary:{
      header:{name:(home&&away?home+' x '+away:detail.name||matchSlug),date:detail.date||detail.time||null},
      boxscore:stats,
      standings:detail.standings||null,
      odds:detail.odds||null,
      injuries,
      predictor:detail.predictor||null,
      leaders:detail.leaders||detail.player_stats||null,
      lineups
    },
    teams:[
      {name:home||'Mandante',homeAway:'home',recentMatches:detail.home_recent_matches||detail.home_form||[]},
      {name:away||'Visitante',homeAway:'away',recentMatches:detail.away_recent_matches||detail.away_form||[]}
    ],
    h2h:detail.h2h||detail.head_to_head||[],
    news:(Array.isArray(articles)?articles:[]).slice(0,8).map(article=>({
      headline:article.headline||article.title||'',
      description:article.description||article.summary||'',
      published:article.published_at||article.published||article.date||null,
      url:article.url||article.link||''
    })),
    sources,
    retrievalErrors:[],
    retrievedAt:new Date().toISOString()
  };
}

function evidenceForAgent(agentId,evidence){
  const match={header:evidence.summary?.header,retrievedAt:evidence.retrievedAt};
  if(agentId==='historico')return{match,teams:evidence.teams,h2h:evidence.h2h,standings:evidence.summary?.standings};
  if(agentId==='probabilidades')return{match,teams:evidence.teams,h2h:evidence.h2h,boxscore:evidence.summary?.boxscore,predictor:evidence.summary?.predictor};
  if(agentId==='mercados')return{match,teams:evidence.teams,boxscore:evidence.summary?.boxscore,leaders:evidence.summary?.leaders,predictor:evidence.summary?.predictor};
  if(agentId==='odds')return{match,odds:evidence.summary?.odds,retrievedAt:evidence.retrievedAt};
  return{match,injuries:evidence.summary?.injuries,news:evidence.news};
}

function renderAnalysis(data){
  const cards=data.agents.map(agent=>{
    const links=agent.sources.map(source=>'<li><a href="'+escapeHtml(source.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(source.title)+'</a></li>').join('');
    return '<article class="agent-card"><span>ESPECIALISTA</span><h3>'+escapeHtml(agent.name)+'</h3><p style="white-space:pre-wrap">'+escapeHtml(agent.report)+'</p><details><summary>Fontes consultadas</summary><ul>'+links+'</ul></details></article>';
  }).join('');
  analysisPanel.hidden=false;
  analysisPanel.innerHTML='<div class="section-heading"><div><p class="eyebrow">ANÁLISE LOCAL</p><h2>Relatórios dos especialistas</h2><p class="muted">Concluída em '+fmtDate(data.completedAt)+' · Modelo '+escapeHtml(LOCAL_MODEL)+'</p></div></div><div class="agents-grid">'+cards+'</div><div class="chief-report"><p class="eyebrow">SEXTO AGENTE</p><h2>Consolidação da IA chefe</h2><p style="white-space:pre-wrap">'+escapeHtml(data.chief)+'</p></div><p class="notice">A IA executou localmente no seu aparelho. Os dados esportivos vêm do SportScore. Não há odds confirmadas quando a fonte não as fornece. Confira as fontes antes de qualquer decisão.</p>';
  analysisPanel.scrollIntoView({behavior:'smooth',block:'start'});
}

const AGENT_TASKS=[
  {id:'historico',name:'Histórico e dados',task:'Analise exclusivamente os dados estatísticos e históricos disponíveis no material. Liste fatos observáveis, amostra, lacunas e o que não pode ser concluído. Não invente forma recente nem confrontos ausentes.'},
  {id:'probabilidades',name:'Probabilidades',task:'Avalie se os dados permitem estimar probabilidades. Se não houver amostra numérica suficiente, NÃO invente percentuais. Explique quais dados faltam e a incerteza.'},
  {id:'mercados',name:'Mercados',task:'Avalie mercados de pré-jogo que poderiam ser estudados com os dados fornecidos. Não sugira aposta sem evidência mensurável. Liste mercados sem base suficiente.'},
  {id:'odds',name:'Odds e valor',task:'Procure odds reais apenas no material fornecido. Exija odd, fonte/casa e horário. Se esses elementos não aparecerem, escreva claramente ODDS NÃO VERIFICADAS e não calcule valor esperado.'},
  {id:'noticias',name:'Escalações e notícias',task:'Avalie lesões, suspensões, escalações e notícias apenas se estiverem explicitamente no material. Diferencie confirmado de provável e identifique notícias sem data.'}
];

analysisButton.addEventListener('click',async()=>{
  if(analysisButton.disabled)return;
  const competition=catalog.find(item=>String(item.id)===competitionSelect.value);
  const match=competition?.matches?.find(item=>String(item.id)===matchSelect.value);
  if(!competition||!match)return;
  analysisButton.disabled=true;
  analysisButton.textContent='Preparando IA no aparelho...';
  analysisPanel.hidden=false;
  analysisPanel.textContent='Verificando WebGPU e preparando o modelo local. Na primeira utilização, será necessário baixar os arquivos do modelo.';
  try{
    const engine=await loadLocalAI(report=>{
      if(report?.text)analysisPanel.textContent='Preparando IA local: '+report.text;
    });
    analysisButton.textContent='Consultando dados reais...';
    const evidence=await fetchMatchEvidence(sportSelect.value,match.slug);
    
    const base='Esporte: '+sportSelect.value+'\nCompetição: '+competition.name+'\nPartida: '+match.name+'\nInício: '+fmtDate(match.date)+'\n';
    const reports=[];
    for(let index=0;index<AGENT_TASKS.length;index++){
      const agent=AGENT_TASKS[index];
      analysisButton.textContent='Especialista '+(index+1)+'/5: '+agent.name;
      analysisPanel.textContent='Executando '+agent.name+'. Cada especialista recebe os mesmos dados e trabalha sem ler os relatórios dos demais.';
      const report=await runLocalAgent(engine,
        'Você é '+agent.name+', especialista independente do GG Análises Esportivas. Seja rigoroso, escreva em português brasileiro. Nunca invente resultados, estatísticas, notícias, escalações, probabilidades ou odds. Se os dados forem insuficientes, diga isso claramente. Não dê garantia de acerto.',
        agent.task+'\n\n'+base+'\nDados específicos coletados para sua função: '+JSON.stringify(evidenceForAgent(agent.id,evidence)).slice(0,8500)+'\n\nResponda com: evidências encontradas, análise, limitações e conclusão. Se não houver dados suficientes, declare isso sem preencher lacunas com suposições.');
      reports.push({id:agent.id,name:agent.name,report,sources:evidence.sources});
    }
    analysisButton.textContent='IA chefe: confrontando os cinco relatórios...';
    analysisPanel.textContent='Os cinco especialistas terminaram. A IA chefe está verificando divergências e consolidando a decisão.';
    let chief=await runLocalAgent(engine,
      'Você é a IA chefe do GG Análises Esportivas. Você só recebe os cinco relatórios depois que eles terminam. Seja crítico. Nunca invente odds ou estatísticas. Uma recomendação exige probabilidade fundamentada e odd verificável. Na ausência disso, decida NÃO ENTRAR.',
      'Partida: '+base+'\nRelatórios independentes: '+JSON.stringify(reports.map(item=>({name:item.name,report:item.report}))).slice(0,11500)+'\n\nConfronte concordâncias e divergências. Apresente resumo, pontos de concordância, divergências, oportunidades sustentadas (no máximo três), riscos e decisão final. Não force entradas. Sem odd verificável, NÃO ENTRAR.');
    const rawOdds=evidence.summary?.odds;
    const hasOdds=Array.isArray(rawOdds)?rawOdds.length>0:Boolean(rawOdds&&typeof rawOdds==='object'&&Object.keys(rawOdds).length);
    const hasMatchStats=Boolean(evidence.summary?.boxscore||evidence.summary?.predictor);
    if(!hasOdds||!hasMatchStats){
      const missing=[!hasMatchStats?'estatísticas específicas suficientes da partida':null,!hasOdds?'odds verificáveis de uma fonte identificada':null].filter(Boolean).join(' e ');
      chief+=String.fromCharCode(10,10)+'TRAVA DE SEGURANÇA DO SISTEMA: NÃO ENTRAR. A fonte consultada não forneceu '+missing+'. Nenhuma oportunidade pode ser apresentada como aposta de valor sem esses dados.';
    }
    renderAnalysis({agents:reports,chief,completedAt:new Date().toISOString()});
  }catch(error){
    analysisPanel.innerHTML='<h2>Não foi possível executar a análise local</h2><p>'+escapeHtml(error.message)+'</p><p class="helper">O modelo depende de WebGPU e de memória disponível. Se o aparelho não for compatível, tente em um computador com Chrome ou Edge atualizado.</p>';
  }finally{
    syncAnalysisButton();
  }
});
syncAnalysisButton();
render();
let savedPage='overview';try{savedPage=localStorage.getItem(PAGE_STORE)||'overview'}catch{}
showPage(savedPage);
loadCatalog();
