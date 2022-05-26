"use strict";

const EventEmitter = require("events");

class MessageCollector extends EventEmitter {
    constructor(client, filter, options) {
        if (!client || !filter || !options) {
            throw new TypeError("All three parameters (client, filter, options) are required. " +
                                `Received ${arguments.length}/3 arguments.`);
        }
            
        super();
      
        this.client = client;
        this.filter = filter;
        this.options = Object.assign({ time: 30000, maxMatches: Infinity }, options);
        this.collected = [];
        this.ended = false;
        this.awaitMessage = (message) => this.check(message);
        this.client.on("messageCreate", this.awaitMessage);
      
        if (options.time) {
            setTimeout(() => this.stop("time"), options.time);
        }
    }
  
    check(message) {
        if (this.options.channelID && this.options.channelID !== message.channel.id) {
            return false;
        }
            
        if (this.filter(message)) {
            this.collected.push(message);
            this.emit("collect", message);
          
            if (this.collected.length >= this.options.maxMatches) {
                this.stop("maxMatches");
            }
          
            return true;
        }
      
        return false;
    }
  
    stop(reason) {
        if (this.ended) {
            return;
        }
      
        this.ended = true;
        this.client.removeListener("messageCreate", this.awaitMessage);
        this.emit("end", this.collected, reason);
    }
}

module.exports = MessageCollector;