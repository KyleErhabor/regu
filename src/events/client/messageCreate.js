const { Util, Constants, EventListener } = require("../../index.js");

module.exports = class extends EventListener {
    async run(message) {
        if (message.author.bot) {
            return;
        }
            
        if (message.channel.guild) {
            if (message.channel.guild.unavailable) {
                return;
            }
          
            if (message.channel.permissionsOf(this.client.user.id).has("sendMessages")) {
                if (message.member) {
                    if (new RegExp(`^<@!?${this.client.user.id}> ?$`).test(message.content)) {
                        return Util.reply(message, `my prefix is \`${Constants
                            .PRIMARY_PREFIX}\` — Try out some commands (e.g. \`${Constants
                            .PRIMARY_PREFIX}help\`).`);
                    }
                }
            } else {
                return;
            }
        }
      
        let prefix = Util.messagePrefix(message.content);
      
        if (prefix) {
            let command = Util.messageCommand(this.client, message.content);
            let args = Util.messageArgs(message.content);
                    
            if (command) {
                try {
                    let res = await command.validate(message);
                  
                    if (res === null) {
                        return; // Silently reject. Used for stuff like `<Command>.enabled`
                    }
                  
                    if (args.length) {
                        let subcommand = command.subcommands
                            .find((sub) => sub.enabled && sub.name === args[0].toLowerCase());
                      
                        if (subcommand) {
                            args = args.slice(1);
                          
                            return await command[subcommand.label](message, args);
                        }
                    }
                  
                    return await command.run(message, args);
                } catch (ex) {
                    if (ex.friendly) {
                        return message.channel.createMessage(ex.message);
                    }
                  
                    return command.handleException(message, ex);
                }
            }
        }
    }
};