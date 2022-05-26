const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

class EventListener {
    constructor(client, emitter, fileName, options = {}) {
        this.client = client;
        this.emitter = emitter;
      
        this.once = options.once || false;
        this.enabled = has(options, "enabled") ? options.enabled : true;
        this.eventName = fileName.replace(".js", "");
    }
  
    async run() {
        this.client.logger.warn(`Event ${this.listenerName} has no run method.`);
    }
}

module.exports = EventListener;