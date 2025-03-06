/**
 * A simple event emitter implementation for browser compatibility
 * This replaces the Node.js EventEmitter which is not available in browsers
 */
import { logger } from '../utils/logger';

export class SimpleEventEmitter {
  private events: Record<string, Array<(...args: any[]) => void>> = {};

  /**
   * Register an event listener
   * @param event The event name
   * @param listener The callback function
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  /**
   * Remove an event listener
   * @param event The event name
   * @param listener The callback function to remove
   */
  public off(event: string, listener: (...args: any[]) => void): this {
    if (!this.events[event]) {
      return this;
    }
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  /**
   * Emit an event with the given arguments
   * @param event The event to emit
   * @param args The arguments to pass to the event handlers
   */
  public emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }

    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        logger.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Register a one-time event listener
   * @param event The event name
   * @param listener The callback function
   */
  public once(event: string, listener: (...args: any[]) => void): this {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Listen for any event
   * @param listener The callback function that receives event name and arguments
   */
  public onAny(listener: (event: string, ...args: any[]) => void): this {
    const anyWrapper = (event: string) => {
      return (...args: any[]) => {
        listener(event, ...args);
      };
    };
    
    // Store the original listener and the wrapper
    if (!this._anyListeners) {
      this._anyListeners = [];
    }
    
    const entry = { listener, wrappers: {} as Record<string, (...args: any[]) => void> };
    this._anyListeners.push(entry);
    
    // Add a wrapper for each existing event
    Object.keys(this.events).forEach(event => {
      const wrapper = anyWrapper(event);
      entry.wrappers[event] = wrapper;
      this.on(event, wrapper);
    });
    
    return this;
  }

  /**
   * Remove all listeners for an event, or all events
   * @param event Optional event name
   */
  public removeAllListeners(event?: string): this {
    if (event) {
      this.events[event] = [];
    } else {
      this.events = {};
      if (this._anyListeners) {
        this._anyListeners = [];
      }
    }
    return this;
  }

  // Private property to track "any" listeners
  private _anyListeners?: Array<{
    listener: (event: string, ...args: any[]) => void;
    wrappers: Record<string, (...args: any[]) => void>;
  }>;
} 