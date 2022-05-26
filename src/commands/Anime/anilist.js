const {
    Util,
    Constants,
    CommandError,
    ReactionCollector,
    CommandCategory: { Anime: Command }
} = require("../../index.js");
const commaify = require("comma-number");
const ANILIST_URL = "https://anilist.co";

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            usage: "<anime|title> (title)",
            description: "Search AniList.co",
            fullDescription: "By default, the anime subcommand is chosen.",
            requiredArgs: 1,
            aliases: ["al"],
            flags: [
                {
                    name: "noembed",
                    description: "Displays the result in plain text. This is automatically " +
                    "selected if the bot lacks permission to `Embed Links`."
                },
                {
                    name: "all",
                    description: "Displays a collection of anime similar by name. This is useful " +
                    "if you don't remember the exact name of an anime, or getting the wrong " +
                    "anime. Select a number between one and the number of results chosen."
                }
            ],
            subcommands: [
                {
                    name: "anime",
                    usage: "<title>",
                    enabled: true,
                    requiredArgs: 1,
                    description: "Search for an anime.",
                    fullDescription: "The anime subcommand fetches an anime from AniList based " +
                    "on the provided name. By default, this subcommand is chosen by this command " +
                    "and the `anime` command.\n\nThis subcommand can show information in three " +
                    "different ways:\n" + [
                        "A normal Discord embed showcasing its data in a clean format and " +
                        "paginator. Missing data will often not be shown or replaced with " +
                        "\"???\" and/or \"N/A\".",
                      
                        "The same info as #1, except a pencil and paper reaction to edit the " +
                        "media on your anime list. This is only available to authenticated " +
                        `users (\`${Constants.PRIMARY_PREFIX}login\`).`,
                      
                        "A simplified version of the info shown with plain text/no embeds. This " +
                        "is useful for mobile users, when the bot lacks permission to `Embed " +
                        "Links` or when you prefer just seeing plain text (`--noembed` flag)."
                    ].map((str, index) => `\`${index + 1}.\` ${str}`).join("\n") + "\n\n" +
                    "As described in the first way, the embed will add reactions for the use " +
                    "of scrolling through information. If anything goes wrong adding reactions, " +
                    "the paginator will not work (e.g. Missing permissions, blocked, etc).\n\n" +
                    "**Table of Contents**\n" + [
                        "General Info",
                        "Additions (favorites, review count, studios, rankings, etc)"
                    ].map((str, index) => `\`Page #${index + 1}:\` ${str}`).join("\n")
                    // fullDescription: "This subcommand supports the `--noembed` and `--all` " +
                    // "flags. "
                }
            ]
        });
    }
  
    async run(message, args) {
        return this.anime(message, args, { replaced: true });
    }
  
    async anime(message, args, userData) {
        let addNSFW = message.channel.nsfw ? "" : ", isAdult: false";
        let flags = Util.messageFlags(message.content);
        let query = `
        query AnimeData($search: String, $perPage: Int, $loggedIn: Boolean!, $simple: Boolean!) {
          Page(perPage: $perPage) {
            media(type: ANIME, search: $search${addNSFW}) {
              id @include(if: $loggedIn)
              idMal
              format
              status
              siteUrl
              episodes
              meanScore
              popularity
              source(version: 2)
              description(asHtml: false)
              genres @skip(if: $simple)
              hashtag @skip(if: $simple)
              synonyms @skip(if: $simple)
              updatedAt @skip(if: $simple)
              favourites @skip(if: $simple)
              isLocked @include(if: $loggedIn)
              trailer @skip(if: $simple) { id site }
              externalLinks @skip(if: $simple) { url site }
              tags @skip(if: $simple) { name isMediaSpoiler }
              startDate { day month year }
              endDate { day month year }
              coverImage @skip(if: $simple) { extraLarge color }
              title {
                english
                romaji
                native
                userPreferred @include(if: $loggedIn)
              }
              relations @skip(if: $simple) {
                edges {
                  relationType
                  node {
                    siteUrl
                    title {
                      english
                      romaji
                      native
                      userPreferred @include(if: $loggedIn)
                    }
                  }
                }
              }
              characters @skip(if: $simple) {
                edges {
                  role
                  node { siteUrl name { full native } }
                }
              }
              staff @skip(if: $simple) {
                edges {
                  role
                  node { siteUrl name { full native } }
                }
              }
              streamingEpisodes @skip(if: $simple) { url site title }
              rankings {
                rank
                type
                allTime
                year @skip(if: $simple)
                season @skip(if: $simple)
              }
              mediaListEntry @include(if: $loggedIn) @skip(if: $simple) {
                notes
                status
                repeat
                private
                priority
                progress
                updatedAt
                createdAt
                score(format: POINT_100)
                user { name }
                startedAt { day month year }
                completedAt { day month year }
              }
              stats {
                scoreDistribution { score amount }
                statusDistribution { status amount }
              }
              reviews(sort: RATING_DESC) @skip(if: $simple) {
                pageInfo { total }
                nodes { id score rating summary ratingAmount }
              }
            }
          }
        }`;
      
        let variables = {
            search: args.join(" "),
            perPage: 1,
            loggedIn: !userData.replaced,
            simple: !!(message.channel.guild && (flags.noembed || !message.channel
                .permissionsOf(this.client.user.id).has("embedLinks")) || flags.noembed)
        };
      
        let media = (await this.requestAL(query, variables, message, userData
            .replaced ? null : userData)).data.Page.media;
      
        let data = null;
      
        if (media.length) {
            if (flags.all) {
                data = await this._awaitResponse(message, media, variables, "anime", variables
                    .simple);
            } else {
                [data] = media;
            }
        } else {
            return CommandError.ERR_NOT_FOUND(message, "anime", variables.search);
        }
            
        if (data) {
            data.name = (variables.loggedIn ? data.title.userPreferred : null) ||
            data.title.english || data.title.romaji || data.title.native;
            data.siteUrl = `${data.siteUrl}/${data.name.replace(/[^\w ]+/g, "")
                .replace(/ /g, "-")}`;
          
            if (data.idMal && !variables.simple) {
                data.externalLinks.push({
                    site: "MyAnimeList",
                    url: `https://myanimelist.net/anime/${data.idMal}/${(data.title.romaji ||
                        data.name).replace(/[^\w]+/g, "_")}`
                });
            }
          
            if (data.reviews) {
                data.reviews.nodes.forEach((review) => {
                    review.siteUrl = `${ANILIST_URL}/review/${review.id}/`;
                });
            }
          
            return this._sendAnime(message, data, variables);
        }
    }
  
    async _sendAnime(message, data, variables) {
        const getTitle = (title) => (variables.loggedIn ? title.userPreferred : null) ||
        title.english || title.romaji || title.native;
        const base = {
            url: data.siteUrl,
            timestamp: new Date(data.updatedAt * 1000),
            color: Util.base10(data.coverImage.color || Constants.Colors.DEFAULT),
            thumbnail: { url: data.coverImage.extraLarge }
        };
        const getFormat = (format) => {
            if (!format) {
                return "???";
            }
          
            if (format === "TV" || format === "OVA" || format === "ONA") {
                return format;
            }
          
            return Util.toTitleCase(format.replace(/_/g, " "));
        };
        const startDate = (start, end) => {
            let dates = [];
          
            if (start.day || start.month || start.year) {
                dates.push(`${start.month || "??"}/${start.day || "??"}/${start.year || "????"}`);
            } else {
                dates.push("???");
            }
          
            if (end.day || end.month || end.year) {
                dates.push(`${end.month || "??"}/${end.day || "??"}/${end.year || "????"}`);
            } else {
                dates.push("???");
            }
          
            return dates.join(" -> ") || "N/A";
        };
      
        let mediaSource = Util.toTitleCase((data.source || "???").replace(/_/g, " "));
        let mediaStatus = Util.toTitleCase((data.status || "Unknown").replace(/_/g, " "));
        let mediaRank = data.rankings.find((rank) => rank.allTime && rank.type === "RATED");
        let mediaScore = `${data.meanScore || "???"}/100`;
        let mediaMembers = `${commaify(data.popularity)} members`;
      
        let needsRelationsPage = false;
        let response = null;
      
        if (variables.simple) {
            let content = `__**${data.name}**__ (<${data.siteUrl}>)\n` +
            `${this.parseALMarkdown(data.description)}\n\n` + [
                `**Media**: ${getFormat(data.format)} (Episodes: ${commaify(data
                    .episodes) || "???"} | Source: ${mediaSource})`,
                `**Status**: ${mediaStatus} ${mediaRank ? `(Ranked #${mediaRank.rank})` : ""}`,
                `**Score**: ${mediaScore} (${mediaMembers})`,
                `**Airing Dates**: ${startDate(data.startDate, data.endDate)}`
            ].map((str) => `• ${str}`).join("\n");
          
            response = await message.channel.createMessage(content);
        } else {
            let description = this.parseALMarkdown(data.description);
            let formattedRelations = data.relations.edges.map(({ node: media }) => {
                return `[${getTitle(media.title)}](${media.siteUrl})`;
            }).join(" | ");

            description = description.length + formattedRelations.length + 2 > 2048
                ? description
                : description + "\n\n" + formattedRelations;
          
            if (formattedRelations.length &&
                description.length + formattedRelations.length + 2 > 2048) {
                needsRelationsPage = true;
            }
            
            response = await message.channel.createMessage({
                embed: {
                    ...base,
                    description,
                    title: data.name,
                    footer: { text: "Last Update" },
                    fields: [
                        {
                            name: "Media",
                            value: `${getFormat(data.format)} (Episodes: ${commaify(data
                                .episodes || "???")} | Source: ${mediaSource})`,
                            inline: true
                        },
                        {
                            name: "Status",
                            value: `${mediaStatus} ${mediaRank ? `(Ranked #${mediaRank
                                .rank})` : ""}`,
                            inline: true
                        },
                        {
                            name: "Score",
                            value: `${mediaScore} (${mediaMembers})`,
                            inline: true
                        },
                        {
                            name: "Airing Dates",
                            value: startDate(data.startDate, data.endDate),
                            inline: true
                        },
                        {
                            name: "Groups",
                            value: [
                                data.genres.length ? `**Genres**: ${data.genres.join(", ")}` : null,
                                data.tags.length ? `**Tags**: ${data.tags.map((tag) => {
                                    let spoiler = tag.isMediaSpoiler ? "||" : "";

                                    return `${spoiler}${tag.name}${spoiler}`;
                                }).join(", ")}` : null
                            ].filter((entry) => entry !== null).join("\n")
                        }
                    ]
                }
            });
        }
      
        if (!variables.simple && !message.channel.guild ||
            message.channel.permissionsOf(this.client.user.id).has("addReactions")) {
            let emojis = [
                Constants.Emojis.TRACK_PREVIOUS,
                Constants.Emojis.ARROW_BACKWARDS,
                Constants.Emojis.ARROW_FORWARD,
                Constants.Emojis.TRACK_NEXT,
                Constants.Emojis.STOP_BUTTON,
                variables.loggedIn ? Constants.Emojis.PENCIL_PAPER : null
            ].filter((entry) => entry !== null);
          
            try {
                for (const emoji of emojis) {
                    await Util.sleep(1000); // eslint-disable-line no-await-in-loop
                    await response.addReaction(emoji); // eslint-disable-line no-await-in-loop
                }
            } catch (ex) {
                if (ex.code === 10008 || ex.code === 30010 ||
                    ex.code === 50013 || ex.code === 90001) {
                    if (message.channel.permissionsOf(this.client.user.has).has("manageMessages")) {
                        response.removeReactions();
                    }
                  
                    return;
                }
            }
          
            const collector = new ReactionCollector(this.client, (msg, emoji, userID) => {
                return message.author.id === userID && emojis.includes(emoji.name);
            }, {
                time: 900000, // 15 minutes.
                maxMatches: Infinity,
                messageID: response.id,
                allowedTypes: ["add", "remove", "removeAll"]
            });
            const embeds = [
                { ...response.embeds[0] },
                { // Additions
                    ...base,
                    title: `${data.name} -> Additions`,
                    description: (() => {
                        let results = [];
                      
                        results.push(`Favorites: ${commaify(data.favourites)} ${Constants.Emotes
                            .HEART}`);
                      
                        results.push(`Reviews: [${commaify(data.reviews.pageInfo.total)}](${data
                            .siteUrl}/reviews)`);
                      
                        if (data.synonyms.length) {
                            results.push(`Alternative Titles: \`${data.synonyms.join("`, `")}\``);
                        }
                      
                        if (data.externalLinks.length) {
                            results.push(`External Links: ${data.externalLinks
                                .map((link) => `[${link.site}](${link.url})`).join(", ")}`);
                        }
                      
                        if (data.rankings.length) {
                            results.push("", data.rankings.map((rank) => {
                                if (rank.allTime) {
                                    if (rank.type === "RATED") {
                                        return `${Constants.Emojis
                                            .STAR} #${rank.rank} Highest Rated All Time.`;
                                    } else if (rank.type === "POPULAR") {
                                        return `${Constants.Emojis
                                            .HEART} #${rank.rank} Most Popular All Time.`;
                                    }
                                } else if (rank.year && !rank.season) {
                                    if (rank.type === "RATED") {
                                        return `${Constants.Emojis
                                            .STAR} #${rank.rank} Highest Rated ${rank.year}.`;
                                    } else if (rank.type === "POPULAR") {
                                        return `${Constants.Emojis
                                            .HEART} #${rank.rank} Most Popular ${rank.year}.`;
                                    }
                                } else if (rank.year && rank.season) {
                                    if (rank.type === "RATED") {
                                        return `${Constants.Emojis
                                            .STAR} #${rank.rank} Highest Rated ${Util
                                            .toTitleCase(rank.season)} ${rank.year}.`;
                                    } else if (rank.type === "POPULAR") {
                                        return `${Constants.Emojis
                                            .HEART} #${rank.rank} Most Popular ${Util
                                            .toTitleCase(rank.season)} ${rank.year}.`;
                                    }
                                }
                              
                                return "???";
                            }).join("\n"));
                        }
                      
                        return results.join("\n");
                    })()
                },
                needsRelationsPage ? {
                    title: `${data.name} -> Relations`,
                    fields: ((relations) => {
                        let types = {};

                        for (const { relationType, node: media } of relations) {
                            let title = getTitle(media.title);
                            let typeData = types[relationType]; // Array or undefined.
                          
                            if (typeData) {
                                typeData.push(`[${title}](${media.siteUrl})`);
                            } else {
                                types[relationType] = [`[${title}](${media.siteUrl})`];
                            }
                        }
                                            
                        return Object.keys(types).map((type) => {
                            let medias = types[type];
                            let mediaList = [];
                          
                            for (const media of medias) {
                                // This is a bad way of avoiding the 1024 limit,
                                // but I can't be bothered.
                                if (mediaList.join(", ").length + media.length > 1024) {
                                    break;
                                }
                              
                                mediaList.push(media);
                            }
                          
                            return {
                                name: Util.toTitleCase(type.replace(/_/g, " ")),
                                value: mediaList.join(", ")
                                // value: medias.join(", ")
                            };
                        });
                    })(data.relations.edges)
                } : null
            ].filter((struct) => struct !== null);
          
            let pageNumber = 1;
          
            collector.on("reactionAdd", (msg, emoji) => {
                if (message.channel.permissionsOf(this.client.user.id).has("manageMessages")) {
                    msg.removeReaction(emoji.name, message.author.id);
                }
              
                switch (emoji.name) {
                    case Constants.Emojis.TRACK_PREVIOUS: {
                        if (pageNumber === 1) {
                            return;
                        }
                      
                        pageNumber = 1;
                        break;
                    }
                    
                    case Constants.Emojis.ARROW_BACKWARDS: {
                        if (pageNumber === 1) {
                            return;
                        }
                      
                        pageNumber -= 1;
                        break;
                    }
                    
                    case Constants.Emojis.ARROW_FORWARD: {
                        if (pageNumber === embeds.length) {
                            return;
                        }
                      
                        pageNumber += 1;
                        break;
                    }
                    
                    case Constants.Emojis.TRACK_NEXT: {
                        if (pageNumber === embeds.length) {
                            return;
                        }
                      
                        pageNumber = embeds.length;
                        break;
                    }
                    
                    case Constants.Emojis.STOP_BUTTON: {
                        return collector.stop("stop");
                    }
                    
                    default: {
                        return;
                    }
                }
              
                return response.edit({
                    embed: {
                        ...embeds[pageNumber - 1],
                        footer: { text: `Page ${pageNumber}/${embeds.length} | Last Update` }
                    }
                });
            });
          
            collector.on("end", () => {
                if (message.channel && message.channel.guild &&
                    message.channel.permissionsOf(this.client.user.id).has("manageMessages")) {
                    return response.removeReactions();
                }
            });
        }
    }
  
    async _awaitResponse(message, data, variables, type, simple) {
        const getTitle = (info) => {
            if (type === "anime" || type === "manga") {
                let title = null;
              
                if (variables.loggedIn) {
                    title = info.title.userPreferred;
                }
              
                if (title) {
                    return title;
                }
              
                return info.title.english || info.title.romaji || info.title.native;
            }
        };
      
        let content = null;
      
        if (simple) {
            content = `**${Util.toTitleCase(type)} Titles Matching "${variables.search}"**\n` +
            data.map((info, index) => {
                return `\`${index + 1}.\` __${getTitle(info)}__ (<${info.siteUrl}>)`;
            }).join("\n") + "\n\n" +
            `Select a number between 1 and ${data.length} | Type "cancel" to cancel.`;
        } else {
            content = {
                embed: {
                    color: Util.base10(Constants.Colors.DEFAULT),
                    title: `${Util.toTitleCase(type)} Titles Matching "${variables.search}"`,
                    description: data.map((info, index) => {
                        return `\`${index + 1}.\` __${getTitle(info)}__ <${info.siteUrl}>`;
                    }).join("\n"),
                    footer: {
                        text: `Select a number between 1 and ${data
                            .length} | Type "cancel" to cancel.`
                    }
                }
            };
        }
      
        let msg = await Util.messagePrompt(message, message.channel, content, 30000, [
            "cancel",
            ...data.map((info, index) => index + 1)
        ]).catch(() => {});
      
        if (msg) {
            if (msg.content === "cancel") {
                return;
            }
          
            return data[parseInt(msg.content, 10) - 1];
        }
    }
};