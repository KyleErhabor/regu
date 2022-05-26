const MessageCollector = require("../structures/MessageCollector.js");
const Constants = require("./Constants.js");
const sleep = (ms) => new Promise((res) => setTimeout(res, ms, ms));

class Util {
    static sleep(ms) {
        return sleep(ms);
    }
  
    static userTag(user) {
        return `${user.username}#${user.discriminator}`;
    }
  
    static base10(hex) {
        return parseInt(hex.replace("#", ""), 16);
    }
  
    static toTitleCase(str) {
        return str.toLowerCase().split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
            .join(" ");
    }
  
    static arrayUnique(arr) {
        let list = [];
      
        for (const item of arr) {
            if (!list.includes(item)) {
                list.push(item);
            }
        }
      
        return list;
    }
  
    static messagePrefix(content) {
        return Constants.BOT_PREFIXES.find((pre) => content.toLowerCase().startsWith(pre)) || null;
    }
  
    static messageArgs(content) {
        let prefix = Util.messagePrefix(content);
      
        if (prefix) {
            return content.substring(prefix.length).trim().split(/ +(?:--[\w=]+)*/g)
                .slice(1).filter((arg) => arg);
        }
      
        return null;
    }
  
    static messageFlags(content) {
        let flags = content.split(/ +/g)
            .filter((str) => str.startsWith("--") && str.slice(2).length >= 2)
            .map((str) => str.slice(2));
      
        if (Util.messagePrefix(content) === "--") {
            flags = flags.slice(1);
        }
      
        let flagObj = {};

        for (const flag of flags) {
            let [key, value] = flag.split("=");

            flagObj[key] = value || key;
        }

        return flagObj;
    }
  
    static messageCommand(bot, content) {
        let prefix = Util.messagePrefix(content);
      
        if (prefix) {
            let label = content.substring(prefix.length).trim().split(/ +(?:--[\w=]+)*/g)[0]
                .toLowerCase();
          
            return bot.commands.get(bot.aliases.get(label) || label) || null;
        }
      
        return null;
    }
  
    // responses => Array<String>
    static async messagePrompt(message, channel, text, time = 30000, responses = null) {
        if (responses) {
            responses = responses.map((res) => res.toString());
        }
      
        let msg = await channel.createMessage(text);
        // I know I shouldn't be doing `message._client`, but I can't be bothered.
        let collector = new MessageCollector(message._client, (msg) => {
            if (msg.author.id === message.author.id) {
                if (responses) {
                    return responses.includes(msg.content.toLowerCase());
                }
              
                return true;
            }
        }, { time, maxMatches: 1, channelID: channel.id });
      
        return new Promise((resolve, reject) => {
            collector.on("collect", (res) => {
                msg.delete().catch(() => {});
              
                return resolve(res);
            });
          
            collector.on("end", (collected) => {
                if (collected.length === 0) {
                    return reject(collected);
                }
            });
        });
    }
  
    static deleteMessage(msg, options) {
        if (typeof options.time === "number") {
            return sleep(options.time).then(() => msg.delete(options.reason));
        }
      
        throw new TypeError(`Invalid time: ${options.time}`);
    }
  
    static guildMe(bot, guild) {
        let me = guild.members.get(bot.user.id);
      
        if (me) {
            return Promise.resolve(me);
        }
      
        return guild.getRESTMember(bot.user.id);
    }
  
    static reply(message, content, file) {
        return message.channel.createMessage(`${message.author.mention}, ${content}`, file);
    }
}

module.exports = Util;