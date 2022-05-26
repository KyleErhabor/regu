const { Util, Command, Constants, CommandError } = require("../../index.js");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            usage: "[command|category] (subcommand)",
            description: "Displays the help manual.",
            fullDescription: "The help manual is the base to understanding the bot and how it " +
            "works. The help embed uses a very basic structure to keep things simple. To search " +
            "for a specific command or category, the name must be passed as the first argument. " +
            "The second argument will be used to search for subcommands in a command, but " +
            "ignored if the first argument was a category or neither.\n\nExamples:\n   - " + [
                "Get all categories mapped by their commands: `help`.",
                "Get all commands in a category: `help main`.",
                "Search for info on a command: `help anilist`",
                "Search for info on a subcommand: `help anilist user`"
            ].join("\n   - "),
            cooldown: 2,
            protected: true,
            flags: [{
                name: "noembed",
                description: "Sends the help manual as plain text. This is automatically chosen " +
                "if the bot does not have permission to `Embed Links`."
            }]
        });
    }
  
    async run(message, [search, subcommand]) {
        let flags = Util.messageFlags(message.content);
      
        if (!search) {
            return this._sendNormal(message, flags);
        }
      
        let name = search.toLowerCase();
        subcommand = subcommand && subcommand.toLowerCase();
      
        let command = this.client.commands.get(name);
      
        if (command) {
            if (subcommand) {
                let sub = command.subcommands
                    .find((sub) => sub.enabled && sub.name.toLowerCase() === subcommand);
              
                if (sub) {
                    return this._sendSubcommand(message, command, sub, flags);
                }
              
                return CommandError.ERR_NOT_FOUND(message, `subcommand of command ${command
                    .name}\``, search);
            }
          
            return this._sendCommand(message, command, flags);
        }
      
        let commands = this.commandList;
        let category = commands[Util.toTitleCase(search)];
      
        if (category) {
            return this._sendCategory(message, category, flags);
        }
      
        return CommandError.ERR_NOT_FOUND(message, "command or category", search);
    }
  
    _sendNormal(message, flags) {
        let commands = this.commandList;
        let hasEmbeds = !message.channel.guild ||
        message.channel.permissionsOf(this.client.user.id).has("embedLinks");
        let description = [
            `Use \`${Constants.PRIMARY_PREFIX}help <category>\` to get more info on a category.`,
            `Use \`${Constants.PRIMARY_PREFIX}help <command>\` to get more info on a command.`,
            `Use \`${Constants.PRIMARY_PREFIX}help <command> <subcommand>\` to get more info ` +
            "on a command subcommand.",
            `Append \`--noembed\` to get the help manual in plain text; helpful on mobile.`
        ].map((str) => `   - ${str}`);
      
        if (flags.noembed || !hasEmbeds) {
            description.pop();
          
            let content = `__**Help Manual**__\n${description.join("\n")}\n\n` +
            Object.keys(commands).map((category) => {
                return `**${category}**: \`${commands[category]
                    .map((command) => command.name).join("`, `")}\``;
            }).join("\n");
          
            return message.channel.createMessage(content);
        }
      
        return message.channel.createMessage({
            embed: {
                title: "Help Manual",
                description: description.join("\n"),
                color: Util.base10(Constants.Colors.DEFAULT),
                fields: Object.keys(commands).map((category) => {
                    return {
                        name: category,
                        value: commands[category].map((command) => `\`${command.name}\``).join(", ")
                    };
                })
            }
        });
    }
  
    _sendCategory(message, category, flags) {
        let hasEmbeds = !message.channel.guild ||
        message.channel.permissionsOf(this.client.user.id).has("embedLinks");
        let prefix = Util.messagePrefix(message.content);
      
        if (flags.noembed || !hasEmbeds) {
            let content = `__**Category: ${category[0].category}**__\n\n${category
                .map((command) => {
                    return `**${prefix + command.name}**: ${command.description}`;
                }).join("\n")}`;
          
            return message.channel.createMessage(content);
        }
      
        return message.channel.createMessage({
            embed: {
                title: `${category[0].category} Category`,
                color: Util.base10(Constants.Colors.DEFAULT),
                description: category.map((command) => {
                    return `**${prefix + command.name}**: ${command.description}`;
                }).join("\n")
            }
        });
    }
  
    _sendCommand(message, command, flags) {
        return command.buildHelp(message, command, null, { time: null, usePlain: flags.noembed });
    }
  
    _sendSubcommand(message, command, subcommand, flags) {
        return command.buildHelp(message, command, subcommand, {
            time: null,
            usePlain: flags.noembed
        });
    }
  
    get commandList() {
        let commands = {};
      
        for (const [, command] of this.client.commands) {
            if (commands[command.category]) {
                commands[command.category].push(command);
            } else {
                commands[command.category] = [command];
            }
        }
      
        return commands;
    }
};