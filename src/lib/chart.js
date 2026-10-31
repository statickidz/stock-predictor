import { historyForRange } from './state.js';

const NS = 'http://www.w3.org/2000/svg';
const number = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});
const shortDate = (value) => new Date(value + 'T00:00:00Z').toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});

function element(name, attributes, text) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createChart(svg, wrapper, tooltip) {
  let history = null, result = null, range = 3, points = [], layout = null, cursor = -1, crosshair = null, marker = null, touchPointer = null;
  function draw() {
    svg.replaceChildren();
    tooltip.hidden = true;
    cursor = -1; crosshair = null; marker = null;
    if (!history) {
      points = []; layout = null;
      svg.setAttribute('aria-label', 'Waiting for completed daily price history.');
      return;
    }
    const observed = historyForRange(history.candles, range);
    const forecast = result?.forecast || [];
    points = [...observed.map(point => ({...point, predicted: false})), ...forecast.map(point => ({...point, predicted: true}))];
    const width = wrapper.clientWidth, height = wrapper.clientHeight;
    const left = width < 450 ? 12 : 19, right = width - (width < 450 ? 59 : 67), top = 32, bottom = height - Math.max(72, height * .23) - 50;
    const futureCount = forecast.length || 10;
    const total = observed.length + futureCount;
    const prices = points.map(point => point.close);
    const min = Math.min(...prices), max = Math.max(...prices);
    const pad = Math.max((max - min) * .17, max * .005);
    const low = min - pad, high = max + pad;
    const x = (index) => left + index / (total - 1) * (right - left);
    const y = (price) => bottom - (price - low) / (high - low) * (bottom - top);
    layout = {x, y, left, right, width, height, total};
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-label', `${history.asset.name} historical daily closing prices and volume through ${history.as_of}${result ? ` and ${forecast.length} projected closing prices and volumes through ${forecast.at(-1).date}` : '. Generate a forecast to add projected prices.'}`);
    const cutoff = x(observed.length - 1);
    svg.append(element('rect', {x:cutoff, y:top-18, width:right-cutoff, height:bottom-top+18, class:'forecast-ground'}));
    for (let index=0; index<5; index++) {
      const value = low + index / 4 * (high-low), lineY = y(value);
      svg.append(element('line', {x1:left, y1:lineY, x2:right, y2:lineY, class:'chart-grid'}));
      svg.append(element('text', {x:right+9, y:lineY+3, class:'chart-axis'}, number.format(value)));
    }
    svg.append(element('line', {x1:cutoff,y1:top-18,x2:cutoff,y2:bottom,class:'forecast-divider'}));
    if (right-cutoff > 47) svg.append(element('text', {x:cutoff+(right-cutoff)/2,y:top-6,'text-anchor':'middle',class:'chart-region-label'}, result ? 'FORECAST' : 'NEXT'));
    const path = (items, offset=0) => items.map((point, index) => `${index ? 'L' : 'M'}${x(index+offset).toFixed(2)},${y(point.close).toFixed(2)}`).join(' ');
    svg.append(element('path', {d:path(observed), class:'history-line'}));
    const finalObserved = observed.at(-1);
    svg.append(element('circle', {cx:cutoff,cy:y(finalObserved.close),r:3,fill:'#4d6657',stroke:'#fff','stroke-width':1.5}));
    if (forecast.length) {
      svg.append(element('path', {d:path([finalObserved,...forecast],observed.length-1),class:'forecast-line'}));
      svg.append(element('circle',{cx:x(points.length-1),cy:y(points.at(-1).close),r:3.2,fill:'#bf5a35',stroke:'#fff','stroke-width':1.5}));
    }
    const volumeBase = height - 37, volumeTop = bottom + 28;
    const maxVolume = Math.max(1, ...points.map(point => point.volume || 0));
    const compact = new Intl.NumberFormat('en-US', {notation:'compact', maximumFractionDigits:1});
    svg.append(element('text', {x:left,y:volumeTop-8,class:'chart-axis'}, 'Volume'));
    svg.append(element('text', {x:right+9,y:volumeTop+3,class:'chart-axis'}, compact.format(maxVolume)));
    const barWidth = Math.max(.5, Math.min(10,(right-left)/(total-1)*.65));
    points.forEach((point,index)=>{
      const barHeight=(point.volume || 0)/maxVolume*(volumeBase-volumeTop);
      svg.append(element('rect',{x:x(index)-barWidth/2,y:volumeBase-barHeight,width:barWidth,height:barHeight,class:point.predicted?'volume-bar projected':'volume-bar'}));
    });
    const ticks = width < 450 ? 3 : 5;
    for (let index=0; index<ticks; index++) {
      const pointIndex = Math.round(index/(ticks-1)*(observed.length-1));
      if (index === ticks-1 && right-cutoff<60) continue;
      svg.append(element('text', {x:x(pointIndex),y:height-12,'text-anchor':index === 0 ? 'start' : 'middle',class:'chart-axis'},shortDate(observed[pointIndex].date)));
    }
    if (forecast.length && right-cutoff>50) svg.append(element('text',{x:right,y:height-12,'text-anchor':'end',class:'chart-axis'},shortDate(forecast.at(-1).date)));
    crosshair = element('line', {x1:0,x2:0,y1:top-18,y2:volumeBase,class:'chart-crosshair',visibility:'hidden','aria-hidden':'true'});
    marker = element('circle', {cx:0,cy:0,r:4,class:'chart-cursor-point',visibility:'hidden','aria-hidden':'true'});
    svg.append(crosshair, marker);
  }
  function inspect(index, touchY) {
    if (!points.length) return;
    cursor = Math.max(0, Math.min(points.length-1,index));
    const point = points[cursor];
    tooltip.textContent = `${shortDate(point.date)} · ${point.predicted ? 'Projected close' : 'Historical close'}\nUSD ${number.format(point.close)}\n${point.predicted ? 'Projected volume' : 'Volume'} · ${number.format(point.volume ?? 0)}`;
    tooltip.hidden = false;
    const anchorX = layout.x(cursor), anchorY = layout.y(point.close);
    crosshair.setAttribute('x1', anchorX); crosshair.setAttribute('x2', anchorX);
    crosshair.setAttribute('visibility', 'visible');
    marker.setAttribute('cx', anchorX); marker.setAttribute('cy', anchorY);
    marker.setAttribute('visibility', 'visible');
    const inset = 8, gap = 14;
    const width = tooltip.offsetWidth, height = tooltip.offsetHeight;
    const preferredLeft = anchorX + gap + width <= layout.width - inset ? anchorX + gap : anchorX - width - gap;
    tooltip.style.left = Math.max(inset, Math.min(preferredLeft, layout.width - width - inset)) + 'px';
    tooltip.style.top = Math.max(inset, Math.min((touchY ?? anchorY) - height - (touchY == null ? gap : 32), layout.height - height - inset)) + 'px';
  }
  function dismiss() {
    cursor = -1;
    tooltip.hidden = true;
    crosshair?.setAttribute('visibility', 'hidden');
    marker?.setAttribute('visibility', 'hidden');
  }
  function inspectPointer(event) {
    if (!layout || !points.length) return;
    const box = wrapper.getBoundingClientRect();
    inspect(Math.round((event.clientX - box.left - layout.left) / (layout.right - layout.left) * (layout.total - 1)),
      event.pointerType === 'touch' ? event.clientY - box.top : undefined);
  }
  wrapper.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.pointerType !== 'mouse') {
      touchPointer = event.pointerId;
      wrapper.setPointerCapture(event.pointerId);
    }
    inspectPointer(event);
  });
  wrapper.addEventListener('pointermove', event => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' || event.pointerId === touchPointer) inspectPointer(event);
  });
  wrapper.addEventListener('pointerup', event => {
    if (event.pointerId === touchPointer) touchPointer = null;
    // Touch selection stays visible after lifting a finger; native capture releases automatically.
  });
  wrapper.addEventListener('pointercancel', () => { touchPointer = null; dismiss(); });
  wrapper.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') dismiss(); });
  document.addEventListener('pointerdown', event => { if (!wrapper.contains(event.target)) dismiss(); });
  wrapper.addEventListener('blur', () => { if (touchPointer == null) dismiss(); });
  wrapper.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      inspect(event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : cursor < 0 ? 0 : cursor + (event.key === 'ArrowRight' ? 1 : -1));
      const announcement = wrapper.querySelector('[data-chart-announcement]');
      if (announcement) announcement.textContent = tooltip.textContent;
    }
    if (event.key === 'Escape') dismiss();
  });
  new ResizeObserver(draw).observe(wrapper);
  return {update(nextHistory,nextResult=null,nextRange=range) { history=nextHistory; result=nextResult; range=nextRange; cursor=-1; draw(); }};
}
