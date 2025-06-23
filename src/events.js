// src/events.js
import { EventEmitter } from 'events';

export const emitter = new EventEmitter();

/**
 * Emits an event and awaits all async listeners.
 * @param {string} eventName - The name of the event.
 * @param {any} payload - The data to send to the listeners.
 * @returns {Promise<void>}
 */
export async function emitAsync(eventName, payload) {
  const listeners = emitter.listeners(eventName);

  await Promise.all(
    listeners.map(listener => {
      try {
        const result = listener(payload);
        return result instanceof Promise ? result : Promise.resolve(result);
      } catch (err) {
        console.error(`Error in listener for event "${eventName}":`, err);
        return Promise.resolve(); // prevent blocking other listeners
      }
    })
  );
}
