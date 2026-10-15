declare global {
  var _compilerQueue: {
    c: { active: number, waiting: number, queue: ((pos: number) => void)[] };
    java: { active: number, waiting: number, queue: ((pos: number) => void)[] };
  } | undefined;
}

export const compilerQueueState = globalThis._compilerQueue || {
  c: { active: 0, waiting: 0, queue: [] },
  java: { active: 0, waiting: 0, queue: [] }
};

if (process.env.NODE_ENV !== 'production') {
  globalThis._compilerQueue = compilerQueueState;
}

// 6 parallel workers: local GCC in Docker compiles in ~50ms, processing 30+ students in <0.5s safely within 512MB RAM
const MAX_CONCURRENT_TASKS = 6;

export function acquireWorker(lang: 'c' | 'java'): Promise<void> {
  return new Promise((resolve) => {
    const q = compilerQueueState[lang];
    if (q.active < MAX_CONCURRENT_TASKS) {
      q.active++;
      resolve();
    } else {
      q.queue.push(resolve as any);
      q.waiting = q.queue.length;
    }
  });
}

export function releaseWorker(lang: 'c' | 'java') {
  const q = compilerQueueState[lang];
  if (q.queue.length > 0) {
    const next = q.queue.shift();
    q.waiting = q.queue.length;
    if (next) next(0);
  } else {
    if (q.active > 0) q.active--;
  }
}
