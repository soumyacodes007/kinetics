type ConsoleMethod = (...args: unknown[]) => void;

interface ConsoleSnapshot {
  log: ConsoleMethod;
  info: ConsoleMethod;
  debug: ConsoleMethod;
}

function noop(): void {}

export async function withSuppressedStdout<T>(fn: () => Promise<T>): Promise<T> {
  const stdout = process.stdout;
  const originalWrite = stdout.write.bind(stdout);
  const originalConsole: ConsoleSnapshot = {
    log: console.log,
    info: console.info,
    debug: console.debug
  };

  const mutedWrite: typeof stdout.write = ((chunk: any, encoding?: any, cb?: any) => {
    if (typeof encoding === "function") {
      encoding();
      return true;
    }
    if (typeof cb === "function") {
      cb();
    }
    return true;
  }) as typeof stdout.write;

  stdout.write = mutedWrite;
  console.log = noop;
  console.info = noop;
  console.debug = noop;

  try {
    return await fn();
  } finally {
    stdout.write = originalWrite;
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  }
}
