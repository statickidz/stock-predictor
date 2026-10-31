import { createSelectionState, toCsv } from './state.js';
import { createChart } from './chart.js';

const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
const percent = (value) => `${value>=0 ? '+' : ''}${value.toFixed(2)}%`;
const date = (value) => new Date(value+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const state = createSelectionState();
const chart = createChart($('price-chart'),$('chart-wrap'),$('chart-tooltip'));
let assets=[], models=[], modelKey=null, selected=null, market='stock', horizon=10, range=3, history=null, result=null, busy=false, token='', retryAction=null;

class ApiError extends Error { constructor(message,status) { super(message); this.status=status; } }
async function api(path,options={}) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),35000);
  try {
    const response = await fetch(`/api${path}`,{...options,signal:controller.signal,headers:{'Content-Type':'application/json',...(token ? {Authorization:`Bearer ${token}`} : {}),...options.headers}});
    const data = await response.json();
    if (!response.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : 'Check the selected asset and forecast horizon.';
      if (response.status===401) { $('auth-panel').hidden=false; $('connection-label').textContent='Access token required'; }
      throw new ApiError(detail,response.status);
    }
    return data;
  } catch(error) {
    if (error.name==='AbortError') throw new Error('The server took too long to respond. Please try again.');
    if (error instanceof TypeError) throw new Error('Cannot reach the server. Check that the app is running, then try again.');
    throw error;
  } finally { clearTimeout(timer); }
}

function setModelStatus(status) {
  $('connection-dot').classList.add('connected');
  const labels={ready:`Model ready · ${status.device}`,not_loaded:'Model ready to load',loading:'Loading model',error:'Model needs retry'};
  $('connection-label').textContent=labels[status.state] || 'Connected';
}
function updateModelHelp() {
  const model=models.find(item=>item.key===modelKey);
  $('model-help').textContent=model ? `${model.description} Up to 256 candles · 3 averaged samples.` : 'Choose which Kronos model generates your forecast.';
}
function drawModels(defaultKey) {
  if(!models.some(model=>model.key===modelKey)) modelKey=defaultKey;
  $('model-select').replaceChildren();
  for(const model of models) {
    const option=document.createElement('option');option.value=model.key;
    option.textContent=`${model.name} · ${model.parameters}${model.parameters==='Custom'?'':' parameters'}`;
    $('model-select').append(option);
  }
  $('model-select').value=modelKey;$('model-select').disabled=false;updateModelHelp();updateButton();
}
function clearError() { $('error-panel').hidden=true; retryAction=null; }
function showError(title,error,retry) {
  $('error-title').textContent=title;
  $('error-message').textContent=error.message;
  $('error-panel').hidden=false;
  retryAction=retry;
}
function updateButton() { $('generate-button').disabled=!history || !modelKey || busy; $('generate-label').textContent=busy ? 'Generating forecast…' : 'Generate forecast'; }
function chartMessage(title,description,loading=false) {
  const message=$('chart-message'); message.hidden=false;
  message.querySelector('strong').textContent=title;
  message.querySelector('span').textContent=description;
  message.querySelector('.loading-rule').hidden=!loading;
}
function drawAssets() {
  const query=$('asset-search').value.trim().toLowerCase();
  const visible=assets.filter(asset=>asset.kind===market && `${asset.name} ${asset.symbol}`.toLowerCase().includes(query));
  $('asset-list').replaceChildren();
  for (const asset of visible) {
    const button=document.createElement('button'); button.type='button'; button.className='asset-option';
    button.setAttribute('aria-pressed',String(asset.symbol===selected?.symbol));
    const icon=document.createElement('span'); icon.className='option-icon'; icon.textContent=asset.symbol.replace('-USD','').slice(0,1);
    const text=document.createElement('span'); text.className='option-text';
    const symbol=document.createElement('strong'); symbol.textContent=asset.symbol;
    const name=document.createElement('span'); name.textContent=asset.name; text.append(symbol,name);
    const check=document.createElementNS('http://www.w3.org/2000/svg','svg'); check.setAttribute('viewBox','0 0 20 20');check.setAttribute('width','14');check.setAttribute('height','14');check.setAttribute('aria-hidden','true');check.classList.add('option-selected');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d','m4 10 4 4 8-8');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.5');path.setAttribute('fill','none');check.append(path);
    button.append(icon,text,check); button.addEventListener('click',()=>selectAsset(asset)); $('asset-list').append(button);
  }
  if (!visible.length) {const empty=document.createElement('p');empty.className='muted';empty.textContent='No matching assets. Try a name or symbol from the supported list.';$('asset-list').append(empty);}
}
function clearForecast() {
  result=null; busy=false;
  $('forecast-results').hidden=true; $('forecast-summary').hidden=true; $('forecast-empty').hidden=false;
  $('job-status').classList.remove('active');
  $('job-status').textContent='Each model downloads on first use. Later runs use cached weights.';
  chart.update(history,null,range); updateButton();
}
function showHistory() {
  $('last-price').textContent=money(history.candles.at(-1).close);
  const candles=history.candles;
  const change=(candles.at(-1).close/candles.at(-2).close-1)*100;
  $('daily-change').textContent=`${percent(change)} last session`;
  $('daily-change').className=`daily-change ${change>=0?'positive':'negative'}`;
  $('price-caption').textContent=`Last completed close · ${date(history.as_of)}`;
  $('chart-note').textContent=`${history.asset.kind==='stock'?'Adjusted prices':'Daily candles'} · USD`;
  $('chart-message').hidden=true;chart.update(history,result,range);updateButton();
}
async function selectAsset(asset) {
  const generation=state.begin();selected=asset;history=null;clearError();clearForecast();drawAssets();
  $('asset-name').replaceChildren(document.createTextNode(asset.name+' '));
  const symbol=document.createElement('span');symbol.id='asset-symbol';symbol.textContent=asset.symbol;$('asset-name').append(symbol);
  $('asset-mark').textContent=asset.symbol.slice(0,1);$('asset-exchange').textContent=`${asset.exchange} · ${asset.currency}`;
  $('last-price').textContent='—';$('daily-change').textContent='';$('price-caption').textContent='Loading completed daily candles…';
  $('horizon-help').textContent=asset.kind==='stock'?'Trading days · skips weekends & holidays':'Calendar days · crypto trades every day';
  chartMessage('Loading daily price history',`Fetching completed candles for ${asset.symbol}.`,true);
  try {const data=await api(`/history?symbol=${encodeURIComponent(asset.symbol)}`);state.commit(generation,()=>{history=data;showHistory();});}
  catch(error) {state.commit(generation,()=>{chartMessage('Market data is unavailable','Use Try again to request fresh history.');$('price-caption').textContent='Daily history could not be loaded';showError('Unable to load market data',error,()=>selectAsset(selected));});}
}
function showResult(data) {
  result=data;history=data.history;busy=false;showHistory();
  $('forecast-empty').hidden=true;$('forecast-summary').hidden=false;$('forecast-results').hidden=false;
  $('projected-price').textContent=money(data.projected_close);
  $('projected-change').textContent=percent(data.change_pct);$('projected-change').className=data.change_pct>=0?'positive':'negative';
  $('projected-date').textContent=date(data.forecast.at(-1).date);
  $('results-caption').textContent=`${data.asset.symbol} · ${data.model.name} · ${data.horizon} ${data.asset.kind==='stock'?'trading':'calendar'} days · USD`;
  $('forecast-rows').replaceChildren();
  for (const point of data.forecast) {
    const row=document.createElement('tr');
    const change=(point.close/data.last_close-1)*100;
    for (const [index,value] of [date(point.date),money(point.close),percent(change)].entries()) {const cell=document.createElement('td');cell.textContent=value;if(index===2)cell.className=change>=0?'positive':'negative';row.append(cell);}
    $('forecast-rows').append(row);
  }
  const generated=new Date(data.generated_at).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
  $('forecast-provenance').textContent=`${data.model.id} · ${data.model.context} context candles · ${data.model.samples} averaged samples · ${data.model.device} · Generated ${generated}. Source: ${history.source}; observations through ${history.as_of}.`;
  $('job-status').textContent=`Forecast complete in ${data.elapsed_seconds.toFixed(1)}s. Results are estimates and can vary between runs.`;
  $('job-status').classList.remove('active');
  setModelStatus({state:'ready',device:data.model.device,model:data.model.id});updateButton();
}
const stageLabels={queued:'Queued. Your forecast will start shortly.',fetching_data:'Preparing completed daily candles…',loading_model:'Loading Kronos. The first run downloads the model weights and may take a few minutes.',predicting:'Kronos is generating and averaging three possible paths…'};
async function generate() {
  if (!history || !modelKey || busy) return;
  const requestedModel=models.find(model=>model.key===modelKey);
  const generation=state.begin();clearError();clearForecast();busy=true;updateButton();
  $('job-status').classList.add('active');$('job-status').textContent='Starting your forecast…';
  try {
    const job=await api('/forecasts',{method:'POST',body:JSON.stringify({symbol:selected.symbol,horizon,model:modelKey})});
    const started=Date.now();
    while(state.isCurrent(generation)) {
      const status=await api(`/forecasts/${job.id}`);
      if (!state.isCurrent(generation)) return;
      if (status.state==='complete') {showResult(status.result);return;}
      if (status.state==='failed') throw new Error(status.error);
      $('job-status').textContent=status.stage==='loading_model' ? `Loading ${requestedModel.name}. Its first use downloads the weights and may take a few minutes.` : stageLabels[status.stage] || 'Generating your forecast…';
      if(status.stage==='loading_model') $('connection-label').textContent='Loading model';
      if(Date.now()-started>20*60*1000) throw new Error('This forecast is taking longer than expected. Check the server and try again.');
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
  } catch(error) {state.commit(generation,()=>{busy=false;updateButton();$('job-status').textContent='Your forecast did not finish.';$('job-status').classList.remove('active');showError('Unable to generate forecast',error,generate);});}
}
async function initialize() {
  clearError();
  try {
    const health=await api('/health');setModelStatus(health.model);
    const [data,modelData]=await Promise.all([api('/assets'),api('/models')]);assets=data.assets;models=modelData.models;
    $('stock-count').textContent=assets.filter(asset=>asset.kind==='stock').length;
    $('crypto-count').textContent=assets.filter(asset=>asset.kind==='crypto').length;
    drawModels(modelData.default);$('auth-panel').hidden=true;$('auth-error').textContent='';
    await selectAsset(selected || assets.find(asset=>asset.symbol==='AAPL'));
  } catch(error) {
    $('connection-dot').classList.remove('connected');
    if (error.status===401) {$('auth-error').textContent=token?'That token was not accepted. Try again.':'';chartMessage('Server access is protected','Enter the server token above to begin.');}
    else {$('connection-label').textContent='Server unavailable';showError('Unable to connect',error,initialize);chartMessage('Waiting for the server','Check that the app is running, then try again.');}
  }
}
$('asset-search').addEventListener('input',drawAssets);
for(const kind of ['stock','crypto']) $(`filter-${kind}`).addEventListener('click',()=>{market=kind;$('asset-search').value='';for(const option of ['stock','crypto'])$(`filter-${option}`).setAttribute('aria-pressed',String(option===kind));drawAssets();if(selected?.kind!==kind && assets.length)selectAsset(assets.find(asset=>asset.kind===kind));});
document.querySelectorAll('[data-horizon]').forEach(button=>button.addEventListener('click',()=>{horizon=Number(button.dataset.horizon);state.begin();clearError();clearForecast();document.querySelectorAll('[data-horizon]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));if(!history && selected)selectAsset(selected);}));
document.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>{range=Number(button.dataset.range);document.querySelectorAll('[data-range]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));chart.update(history,result,range);}));
$('generate-button').addEventListener('click',generate);
$('model-select').addEventListener('change',()=>{modelKey=$('model-select').value;state.begin();clearError();clearForecast();updateModelHelp();if(!history && selected)selectAsset(selected);});
$('retry-button').addEventListener('click',()=>retryAction?.());
$('auth-panel').addEventListener('submit',event=>{event.preventDefault();token=$('access-token').value;$('access-token').value='';initialize();});
$('download-csv').addEventListener('click',()=>{if(!result)return;const url=URL.createObjectURL(new Blob([toCsv(result)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`stock-predictor-${result.asset.symbol}-${result.model.key}-${result.history.as_of}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
initialize();
