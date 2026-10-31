export class BrowserInference {
  worker = null;
  pending = null;
  counter = 0;

  cancel() {
    this.worker?.terminate();
    this.worker = null;
    this.pending?.reject(new DOMException('Forecast cancelled.', 'AbortError'));
    this.pending = null;
  }

  predict(input, model, provider, onStatus) {
    if (this.pending) this.cancel();
    if (!this.worker) {
      this.worker = new Worker(new URL('./inference-worker.js', import.meta.url), {type:'module'});
      this.worker.onmessage = ({data}) => {
        const pending = this.pending;
        if (!pending || data.requestId !== pending.id) return;
        if (data.type === 'status') return pending.onStatus(data.message);
        this.pending = null;
        if (data.type === 'error') pending.reject(new Error(data.message));
        else pending.resolve(data);
      };
      this.worker.onerror = () => {
        const pending = this.pending;
        this.pending = null;
        this.worker.terminate(); this.worker = null;
        pending?.reject(new Error('Browser inference stopped. Try Mini with WebAssembly, or free device memory and retry.'));
      };
    }
    return new Promise((resolve,reject) => {
      const id = ++this.counter;
      this.pending = {id,resolve,reject,onStatus};
      this.worker.postMessage({requestId:id,input,model,provider});
    });
  }
}
