const EventEmitter = require("events");

class ReactionCollector extends EventEmitter {
    constructor(client, filter, options) {
        super();
      
        this.client = client;
        this.filter = filter;
        this.ended = false;
        this.collected = [];
        this.options = options;
        //     time: 30000,
        //     messageID: null,
        //     maxMatches: Infinity,
        //     allowedTypes: ["add", "remove"]
      
        this._timeout = options.time ? setTimeout(() => this.stop("time"), options.time) : null;
        this.awaitReactions = (type, ...args) => {
            return this.check(...args, type);
        };
      
        for (const allowedType of this.options.allowedTypes) {
            let type = allowedType.charAt(0).toUpperCase() + allowedType.substring(1); // add => Add
                    
            this.client.on(`messageReaction${type}`, this.awaitReactions.bind(this, allowedType));
        }
    }
  
    check(message, emoji, userID, type) {
        if (this.options.messageID && this.options.messageID !== message.id) {
            return false;
        }
            
        if (this.filter(message, emoji, userID, type)) {
            let cleanType = type.charAt(0).toUpperCase() + type.substring(1);
            this.collected.push({ message, emoji, userID, type });
            this.emit(`reaction${cleanType}`, message, emoji, userID);
          
            if (this.collected.length >= this.options.maxMatches) {
                this.stop("maxMatches");
            }
          
            return true;
        }
      
        return false;
    }
  
    stop(reason) {
        const noop = () => {};
      
        if (this.ended) {
            return;
        }
      
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
            
        this.ended = true;
        // Being lazy because quit making an alternative!
        this.client.removeListener("messageReactionAdd", this._events.reactionAdd || noop);
        this.client.removeListener("messageReactionRemove", this._events.reactionRemove || noop);
        this.client.removeListener("messageReactionRemoveAll", this._events
            .reactionRemoveAll || noop);
      
        this.emit("end", this.collected, reason);
      
        return this.removeAllListeners();
    }
}

module.exports = ReactionCollector;