import workerUrl from '../workers/inference-worker.js?worker&url';

export const inferenceWorkerUrl = workerUrl;

export class BrowserInference {
  worker = null;
  pending = null;
  counter = 0;

  cancel() {
    this.worker?.terminate();
    this.worker = null;
    const pending = this.pending;
    this.pending = null;
    pending?.reject(new DOMException('Forecast cancelled.', 'AbortError'));
  }

  predict(input, model, provider, onStatus) {
    this.cancel();
    return new Promise((resolve, reject) => {
      const id = ++this.counter;
      const pending = {id, resolve, reject, onStatus};
      this.pending = pending;
      const start = selected => {
        let worker;
        const fail = error => {
          if (this.pending !== pending || (worker && this.worker !== worker)) return;
          worker?.terminate();
          this.worker = null;
          if (selected === 'webgpu') {
            onStatus('GPU forecast failed. Retrying with WebAssembly · CPU…');
            start('wasm');
          } else {
            this.pending = null;
            reject(error);
          }
        };
        try {
          worker = new Worker(workerUrl, {type:'module'});
          this.worker = worker;
          worker.onmessage = ({data}) => {
            if (this.pending !== pending || this.worker !== worker || data.requestId !== id) return;
            if (data.type === 'status') return onStatus(data.message);
            if (data.type === 'error') return fail(new Error(data.message));
            if (data.type !== 'result') return;
            // Drop the runtime heap, sessions and GPU buffers between runs. Downloads
            // remain in Cache Storage, but dynamic horizon allocations must not accumulate.
            worker.terminate();
            this.worker = null;
            this.pending = null;
            resolve(data);
          };
          worker.onerror = () => fail(new Error('Browser inference stopped. Try Mini with WebAssembly, or free device memory and retry.'));
          worker.onmessageerror = () => fail(new Error('Browser inference returned an unreadable response.'));
          worker.postMessage({requestId:id,input,model,provider:selected});
        } catch (error) { fail(error); }
      };
      start(provider);
    });
  }
}
