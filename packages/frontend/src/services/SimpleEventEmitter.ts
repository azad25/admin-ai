/**
 * A simple event emitter implementation for browser compatibility
 * This replaces the Node.js EventEmitter which is not available in browsers
 */
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
   * Emit an event with arguments
   * @param event The event name
   * @param args Arguments to pass to listeners
   */
  public emit(event: string, ...args: any[]): boolean {
    console.log(`SimpleEventEmitter.emit called for event: ${event}`, args);
    if (!this.events[event]) {
      console.log(`No listeners found for event: ${event}`);
      return false;
    }
    console.log(`Found ${this.events[event].length} listeners for event: ${event}`);
    this.events[event].forEach(listener => {
      try {
        console.log(`Calling listener for event: ${event}`);
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    return true;
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