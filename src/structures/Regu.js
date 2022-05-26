const { promises: fs } = require("fs");
const { Client } = require("eris");
const Collection = require("./Collection.js");
const Logger = require("./Logger.js");

class Regu extends Client {
    constructor(...args) {
        super(...args);
      
        this.logger = new Logger();
        this.commands = new Collection();
        this.aliases = new Collection();
        this.globalRatelimit = new Set();
        this.animeAccessTokens = new Collection();
    }
  
    async loadCommands() {
        await fs.readdir("src/commands/").then((categories) => {
            for (const category of categories) {
                fs.readdir(`src/commands/${category}`).then((commands) => {
                    for (const commandFile of commands) {
                        let command = new (require(`../commands/${category}/` +
                                                   commandFile))(this, commandFile, category);
                      
                        this.commands.set(command.name, command);
                      
                        for (const alias of command.aliases) {
                            this.aliases.set(alias, command.name);
                        }
                    }
                });
            }
        });
      
        return this;
    }
  
    async loadEvents() {
        await fs.readdir("src/events/").then((categories) => {
            const events = { process, client: this };
          
            for (const category of categories) {
                fs.readdir(`src/events/${category}`).then((eventFiles) => {
                    for (const eventFile of eventFiles) {
                        let eventEmitter = events[category];
                      
                        let event = new (require(`../events/${category}/` +
                                                 eventFile))(this, eventEmitter, eventFile);
                                            
                        if (event.enabled) {
                            eventEmitter[event.once ? "once" : "on"](event
                                .eventName, (...args) => event.run(...args));
                        }
                    }
                });
            }
        });
      
        return this;
    }
  
    async init(disabled = []) {
        if (!disabled.includes("commands")) {
            await this.loadCommands();
        }
      
        if (!disabled.includes("events")) {
            await this.loadEvents();
        }
      
        if (!disabled.includes("connect")) {
            await this.connect();
        }
      
        return this;
    }
  
    async gracefulExit(code) {
        this.commands.clear();
        this.aliases.clear();
      
        if (this.ready) {
            this.disconnect({ reconnect: false }); // Why does this not return a promise?
        }
      
        if (this.server) {
            await this.server.close().catch((err) => this.logger.error(err));
        }
      
        if (this.db.driver) {
            await this.db.close().catch((err) => this.logger.error(err));
        }
      
        return process.exit(code);
    }
}

module.exports = Regu;