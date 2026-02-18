const { loadBinding } = require("@node-rs/helper");

module.exports = loadBinding(__dirname, "nyx-audio", "nyx-audio");
