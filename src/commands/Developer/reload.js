const { Command, Constants, CommandError } = require("../../index.js");
const { promises: fs } = require("fs");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            usage: "<command|category|all>",
            description: "Reload a command, category or everything.",
            fullDescription: "You can pass an asterisk (`*`) as an alias for \"all\".",
            requiredArgs: 1,
            protected: true,
            validatePermissions: (message) => Constants.BOT_DEVELOPERS.includes(message.author.id),
            subcommands: [
                {
                    name: "command",
                    label: "runCommand",
                    usage: "<label>",
                    description: "Reload a command.",
                    fullDescription: "This is useful when both a command and category share the " +
                    "same name (anime).",
                    requiredArgs: 1
                },
                {
                    name: "category",
                    label: "runCategory",
                    usage: "<title>",
                    description: "Reload a category.",
                    fullDescription: "This is useful when both a command and category share the " +
                    "same name (anime).",
                    requiredArgs: 1
                }
            ]
        });
    }
  
    async run(message, [arg]) {
        let search = arg.toLowerCase();
      
        if (search === "all" || search === "*") {
            return this._reloadAll(message);
        }
      
        let command = this.client.commands.get(this.client.aliases.get(search) || search);
      
        if (command) {
            return this._reloadCommand(message, command);
        }
      
        let categories = [];
      
        for (const [, command] of this.client.commands) {
            if (!categories.includes(command.category)) {
                categories.push(command.category);
            }
        }
      
        let category = categories.find((category) => category.toLowerCase() === search);
      
        if (category) {
            return this._reloadCategory(message, category);
        }
      
        return CommandError.ERR_NOT_FOUND(message, "command or category", arg);
    }
  
    async runCommand(message, [arg]) {
        let search = arg.toLowerCase();
      
        let command = this.client.commands.get(this.client.aliases.get(search) || search);
      
        if (command) {
            return this._reloadCommand(message, command);
        }
      
        return CommandError.ERR_NOT_FOUND(message, "command", arg);
    }
  
    async runCategory(message, [arg]) {
        let search = arg.toLowerCase();
      
        let categories = [];
      
        for (const [, command] of this.client.commands) {
            if (!categories.includes(command.category)) {
                categories.push(command.category);
            }
        }
      
        let category = categories.find((category) => category.toLowerCase() === search);
      
        if (category) {
            return this._reloadCategory(message, category);
        }
      
        return CommandError.ERR_NOT_FOUND(message, "category", arg);
    }
  
    _reloadAll(message) {
        for (const [, command] of this.client.commands) {
            delete require.cache[require.resolve(`../${command.category}/${command.name}.js`)];
        }
      
        this.client.commands.clear();
        this.client.aliases.clear();
        this.client.globalRatelimit.clear();
      
        this.client.init(["connect"]).then(() => {
            return message.channel.createMessage(`${Constants.Emotes
                .CHECKMARK} Reloaded all comands.`);
        });
    }
  
    _reloadCommand(message, command) {
        delete require.cache[require.resolve(`../${command.category}/${command.name}.js`)];
        this.client.commands.delete(command.name);
      
        for (const alias of command.aliases) {
            this.client.aliases.delete(alias);
        }
      
        command = new (require(`../${command.category}/${command
            .name}.js`))(this.client, `${command.name}.js`, command.category);
      
        this.client.commands.set(command.name, command);
      
        for (const alias of command.aliases) {
            this.client.aliases.set(alias, command.name);
        }
      
        return message.channel.createMessage(`${Constants.Emotes
            .CHECKMARK} Reloaded command \`${command.name}\`.`);
    }
  
    _reloadCategory(message, categoryName) {
        let commands = this.client.commands.filter((command) => command.category === categoryName);
      
        for (const [, command] of commands) {
            delete require.cache[require.resolve(`../${command.category}/${command.name}.js`)];
            this.client.commands.delete(command.name);
          
            for (const alias of command.aliases) {
                this.client.aliases.delete(alias);
            }
        }
      
        return fs.readdir(`src/commands/${categoryName}/`).then((commandFiles) => {
            for (const commandFile of commandFiles) {
                let command = new (require(`../${categoryName}/${commandFile}`))(this
                    .client, commandFile, categoryName);
              
                this.client.commands.set(command.name, command);
              
                for (const alias of command.aliases) {
                    this.client.aliases.set(alias, command.name);
                }
            }
          
            return message.channel.createMessage(`${Constants.Emotes
                .CHECKMARK} Reloaded category \`${categoryName}\`.`);
        });
    }
};