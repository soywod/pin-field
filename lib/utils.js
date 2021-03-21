export function noop() {
  //
}

export function range(start, length) {
  return Array.from({length}, (_, i) => i + start);
}

export function omit(keys, input) {
  let output = Object.create({});

  for (let key in input) {
    if (!keys.includes(key)) {
      Object.assign(output, {[key]: input[key]});
    }
  }

  return output;
}

export function debug(scope, fn, msg = undefined) {
  console.debug(`[PIN Field] (${scope}) ${fn}${msg ? `: ${msg}` : ""}`);
}
