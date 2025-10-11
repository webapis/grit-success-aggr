/**
 * Creates a pipeline of asynchronous functions.
 * Each function receives the output of the previous one.
 *
 * @param {...Function} fns - A sequence of async functions to execute.
 * @returns {function(any): Promise<any>} A function that takes an initial value and returns a promise resolving to the final value.
 */
export const pipe = (...fns) => async (initialValue) =>
  fns.reduce(async (acc, fn) => {
    return fn(await acc);
  }, Promise.resolve(initialValue));