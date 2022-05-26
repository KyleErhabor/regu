const Constants = require("../../utils/Constants.js");
const Collection = require("../Collection.js");
const Util = require("../../utils/Util.js");
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

class Command {
    constructor(bot, fileName, categoryName, options) {
        this.client = bot;
      
        this.name = fileName.replace(".js", "");
        this.category = categoryName;
        this.usage = options.usage || "";
        this.description = options.description || "No synopsis.";
        this.fullDescription = options.fullDescription || null;
      
        this.cooldown = options.cooldown || 3;
        this.requiredArgs = options.requiredArgs || 0;
      
        this.nsfw = options.nsfw || false; // (false or undefined) or false omegalul
        this.enabled = has(options, "enabled") ? options.enabled : true;
        this.guildOnly = options.guildOnly || false;
        this.protected = options.protected || false;
      
        this.aliases = options.aliases || [];
        this.memberPermissions = options.memberPermissions || [];
        this.clientPermissions = options.clientPermissions || [];
        this.validatePermissions = options.validatePermissions || (() => true);
      
        this.subcommands = options.subcommands ? options.subcommands.map((sub) => Object.assign({
            name: null,
            usage: "",
            label: sub.name,
            description: "No synopsis.",
            fullDescription: null,
            enabled: true
        }, sub)) : [];
        this.flags = options.flags ? options.flags.map((flag) => Object.assign({
            name: null,
            value: null,
            description: "No synopsis."
        }, flag)) : [];
      
        this.ratelimits = new Collection();
        this.ratelimitNoticed = new Set();
    }
  
    async run() {
        this.client.logger.warn(`Command ${this.name} (${this.category}) has no run method.`);
    }
  
    async validate(message) {
        const invalidate = (reason) => {
            let err = new Error(reason);
            err.friendly = true;
          
            throw err;
        };
      
        if (!this.enabled) {
            return null;
        }
      
        if (this.client.globalRatelimit.has(message.author.id)) {
            return null;
        }
      
        // Ratelimit checks.
        if (!Constants.BOT_STAFF.includes(message.author.id) &&
            !Constants.BOT_DEVELOPERS.includes(message.author.id)) {
            this.client.globalRatelimit.add(message.author.id);
            setTimeout(() => this.client.globalRatelimit.delete(message.author.id), 1000);

            let ratelimitRemaining = this.ratelimits.get(message.author.id);

            if (ratelimitRemaining) {
                if (!this.ratelimitNoticed.includes(message.author.id)) {
                    this.ratelimitNoticed.add(message.author.id);
                    setTimeout(() => {
                        return this.ratelimitNoticed.delete(message.author.id);
                    }, ratelimitRemaining);

                    return invalidate("You are being ratelimited. Try again in " +
                                      `**${(ratelimitRemaining / 1000).toFixed(1)}** seconds.`);
                }
            } else {
                this.ratelimits.set(message.author.id, this.cooldown * 1000);
                setTimeout(() => this.ratelimits.delete(message.author.id), this.cooldown * 1000);
            }
        }
      
        // Boolean checks.
        if (this.guildOnly && !message.channel.guild) {
            return invalidate(`${Constants.Emojis.LOCK} The \`${this
                .name}\` command can only be run in a guild.`);
        }
      
        if (this.nsfw && !message.channel.nsfw) {
            return invalidate(`${Constants.Emojis.UNDERAGE} The \`${this
                .name}\` command can only be run in NSFW channels.`);
        }
      
      
        // Permission checks
        if (message.channel.guild) {
            let memberPermissions = this.sanitizePermissions(this.memberPermissions
                .filter((perm) => !message.member.permission.has(perm)));

            if (memberPermissions.length) {
                return invalidate("You do not have permission to run this command.\n\nMissing: " +
                                  `\`${memberPermissions.join("`, `")}\``);
            }
          
            let me = await Util.guildMe(this.client, message.channel.guild).catch(() => {});
            let botPermissions = this.sanitizePermissions(this.clientPermissions
                .filter((perm) => !me.permission.has(perm)));

            if (botPermissions.length) {
                return invalidate("I do not have permission to perform this action.\n\nMissing: " +
                                  `\`${botPermissions.join("`, `")}\``);
            }
        }
      
        let res = await this.validatePermissions(message);
      
        if (!res || typeof res === "string") {
            return invalidate(res || "You do not have permission to run this command.");
        }
      
        let args = Util.messageArgs(message.content);
      
        if (args.length < this.requiredArgs) {
            await this.buildHelp(message, this, null);
          
            return null;
        }
      
        let subcommand = this.subcommands
            .find((sub) => sub.enabled && sub.name === args[0].toLowerCase());
      
        if (subcommand) {
            if (has(subcommand, "requiredArgs") && args.length - 1 < subcommand.requiredArgs) {
                await this.buildHelp(message, this, subcommand);
              
                return null;
            }
        }
      
        return true;
    }
  
    buildHelp(message, command, subcommand, options = { time: 60000, usePlain: false }) {
        // Pre-stuff
        command = command || Util.messageCommand(this.client, message.content);
        let prefix = Util.messagePrefix(message.content);
      
        // Now, let's start
        let content = null;
        let canSendEmbeds = !message.channel.guild ||
        message.channel.permissionsOf(this.client.user.id).has("embedLinks");
      
        if (!options.usePlain && canSendEmbeds) {
            if (subcommand) {
                content = {
                    embed: {
                        color: Util.base10(Constants.Colors.DEFAULT),
                        title: `${subcommand.name} ${subcommand.usage}`,
                        description: subcommand.fullDescription || subcommand.description ||
                        "No full description."
                    }
                };
            } else {
                content = {
                    embed: {
                        title: `${command.aliases.length
                            ? `[${command.name}|${command.aliases.join("|")}]`
                            : command.name} ${command.usage}`,
                        color: Util.base10(Constants.Colors.DEFAULT),
                        description: command.fullDescription || command.description ||
                        "No full description.",
                        fields: []
                    }
                };
              
                if (command.flags.length) {
                    content.embed.fields.push({
                        name: "Flags",
                        value: command.flags.map((flag) => {
                            return `${Constants.Emojis.WHITE_MEDIUM_SQUARE} \`--${flag
                                .name}${flag.value ? `=${flag.value}` : ""}\` ${flag.description}`;
                        }).join("\n")
                    });
                }
              
                if (command.subcommands.length) {
                    content.embed.fields.push({
                        name: "Subcommands",
                        value: command.subcommands.map((subcommand) => {
                            return `**${prefix + command.name} ${subcommand
                                .name}** — ${subcommand.description}`;
                        }).join("\n")
                    });
                }
            }
        } else if (subcommand) {
            content = `**Subcommand**: \`${subcommand.name} ${subcommand.usage}\` | ${subcommand
                .description || "No description."}\n\n` +
            command.fullDescription || "No full description.";
        } else {
            content = `**Command**: \`${command.aliases.length
                ? `[${command.name}|${command.aliases.join("|")}]`
                : command.name} ${command.usage}\` | ${command
                .description || "No description."}\n\n` +
            command.fullDescription || "No full description.";
          
            if (command.flags.length) {
                content += "\n\n**Flags**\n" + command.flags.map((flag) => {
                    return `${Constants.Emojis.WHITE_MEDIUM_SQUARE} \`--${flag
                        .name}${flag.value ? `=${flag.value}` : ""}\` ${flag.description}`;
                }).join("\n");
            }
          
            if (command.subcommands.length) {
                content += "\n\n**Subcommands**\n" + command.subcommands.map((subcommand) => {
                    return `__${prefix} ${command.name} ${subcommand
                        .name}__ — ${subcommand.description}`;
                }).join("\n");
            }
        }
      
        return message.channel.createMessage(content).then((msg) => {
            if (options.time) {
                return Util.deleteMessage(msg, { time: options.time });
            }
        });
    }
  
    findMember(message, args, options = { strict: false, singleArg: false }) {
        let members = message.channel.guild.members;
        let member = null;
      
        let [arg] = args;
            
        if (/^<@!?(\d{17,18})>$/.test(arg)) {
            member = members.get(arg.match(/^<@!?(\d{17,18})>$/)[1]);
        } else {
            member = members.get(arg);
        }
      
        if (member) {
            return member;
        }
      
        return members.map((member) => member).sort((a, b) => {
            if (b.username.toLowerCase() < a.username.toLowerCase()) {
                return 1;
            } else if (b.username.toLowerCase() > a.username.toLowerCase()) {
                return -1;
            }
          
            return 0;
        }).find((member) => {
            let search = (options.singleArg ? args[0] : args.join(" ")).toLowerCase();
          
            if (options.strict) {
                return Util.userTag(member).toLowerCase() === search ||
                member.username.toLowerCase() === search;
            }
          
            return Util.userTag(member).toLowerCase() === search ||
            member.username.toLowerCase() === search ||
            member.username.toLowerCase().includes(search);
        });
    }
  
    handleException(message, err) {
        return this.client.logger.error(`Command Exception (${this
            .category}/${this.name}): ${err.stack}`);
    }
  
    checkStatus(res, convert = "json", statusCodes = []) {
        if (res.ok || statusCodes.includes(res.status)) {
            return res[convert]();
        }
      
        let err = new Error(`${res.status} ${res.statusText}`);
        err.code = res.status;
      
        throw err;
    }
  
    sanitizePermissions(perms) {
        let permissions = {
            createInstantInvite: "Create Instant Invites",
            kickMembers: "Kick Members",
            banMembers: "Ban Members",
            administrator: "Administrator",
            manageChannels: "Manage Channels",
            manageGuild: "Manage Guild",
            addReactions: "Add Reactions",
            viewAuditLogs: "View Audit Logs",
            voicePrioritySpeaker: "Priority Speaker",
            stream: "Stream",
            readMessages: "Read Messages",
            sendMessages: "Send Messages",
            sendTTSMessages: "Send TTS Messages",
            manageMessages: "Manage Messages",
            embedLinks: "Embed Links",
            attachFiles: "Attach Files",
            readMessageHistory: "Read Message History",
            mentionEveryone: "Mention Everyone",
            externalEmojis: "Use External Emojis",
            viewGuildAnalytics: "View Guild Analytics",
            voiceConnect: "Connect",
            voiceSpeak: "Speak",
            voiceMuteMembers: "Mute Members",
            voiceDeafenMembers: "Deafen Members",
            voiceMoveMembers: "Move Members",
            voiceUseVAD: "Use Voice Activation Detection",
            changeNickname: "Change Nickname",
            manageNicknames: "Manage Nicknames",
            manageRoles: "Manage Roles",
            manageWebhooks: "Manage Webhooks",
            manageEmojis: "Manage Emojis"
        };
      
        return perms.map((perm) => permissions[perm] || "???");
    }
}

module.exports = Command;