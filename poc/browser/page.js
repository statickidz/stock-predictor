const $ = id => document.getElementById(id);
let worker;
let input;
let activeInput;
let busy = false;
let generation = 0;

function setBusy(value) {
  busy = value;
  for (const id of ['validate', 'forecast', 'provider', 'input']) $(id).disabled = value;
  $('cancel').disabled = !value;
}

function status(message, error = false) {
  $('status').textContent = message;
  $('status').toggleAttribute('data-error', error);
}

function getWorker() {
  if (worker) return worker;
  worker = new Worker('./worker.js', {type: 'module'});
  worker.onmessage = ({data}) => {
    if (data.type === 'status') return status(data.message);
    setBusy(false);
    if (data.type === 'error') return status(data.message, true);
    status(data.maxError === null ? 'Forecast complete.' : `Validation passed. Maximum close error: ${data.maxError.toFixed(6)} USD.`);
    $('metrics').textContent = `${data.provider} · load ${(data.loadMs/1000).toFixed(2)}s · inference ${(data.inferenceMs/1000).toFixed(2)}s`;
    const body = $('results').querySelector('tbody');
    body.replaceChildren();
    data.closes.forEach((close, i) => {
      const row = document.createElement('tr');
      for (const value of [activeInput.future_dates[i], close.toFixed(2)]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      body.append(row);
    });
    $('results').hidden = false;
  };
  worker.onerror = event => {
    status(`Worker failed: ${event.message}. Check the runtime installation and browser console.`, true);
    worker.terminate(); worker = null; setBusy(false);
  };
  return worker;
}

async function run(parity) {
  if (busy) return;
  const current = ++generation;
  setBusy(true);
  $('results').hidden = true;
  $('metrics').textContent = '';
  status('Preparing input…');
  try {
    if (parity || !input) {
      const response = await fetch('./models/fixture.json');
      if (!response.ok) throw new Error('Fixture missing. Run scripts/export_browser.py first.');
      activeInput = await response.json();
    } else activeInput = input;
    if (current !== generation) return;
    $('source').textContent = activeInput.label || 'Uploaded market input';
    getWorker().postMessage({input: activeInput, parity, provider: $('provider').value});
  } catch (error) { if (current === generation) { status(error.message, true); setBusy(false); } }
}

$('input').addEventListener('change', async event => {
  input = undefined;
  $('results').hidden = true;
  try {
    const file = event.target.files[0];
    if (!file) { $('source').textContent = 'Synthetic parity fixture (not market data)'; return; }
    if (file.size > 2_000_000) throw new Error('Input must be smaller than 2 MB.');
    input = JSON.parse(await file.text());
    $('source').textContent = input.label || file.name;
    status('Input loaded. Choose Run forecast.');
  } catch (error) { status(`Cannot read input: ${error.message}`, true); }
});
$('validate').onclick = () => run(true);
$('forecast').onclick = () => run(false);
$('cancel').onclick = () => {
  generation++;
  worker?.terminate(); worker = null; setBusy(false);
  status('Cancelled. The next run will reload the models.');
};
if (!navigator.gpu) $('provider').value = 'wasm';
