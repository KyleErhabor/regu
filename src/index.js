module.exports = {
    Util: require("./utils/Util.js"),
    Client: require("./structures/Regu.js"),
    Logger: require("./structures/Logger.js"),
    Constants: require("./utils/Constants.js"),
    Command: require("./structures/Command/Command.js"),
    Collection: require("./structures/Collection.js"),
    CommandError: require("./structures/CommandError.js"),
    EventListener: require("./structures/EventListener.js"),
    MessageCollector: require("./structures/MessageCollector.js"),
    ReactionCollector: require("./structures/ReactionCollector.js"),
    CommandCategory: {
        Anime: require("./structures/Command/Anime.js")
    }
};