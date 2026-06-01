const capabilities = require("../core/capabilities");
const capabilityRouters = require("./capabilityRouters");

module.exports = {
    [capabilities.VideoStreamCapability.TYPE]: capabilityRouters.VideoStreamCapabilityRouter,
    [capabilities.TextToSpeechCapability.TYPE]: capabilityRouters.TextToSpeechCapabilityRouter,
    [capabilities.MapManagementCapability.TYPE]: capabilityRouters.MapManagementCapabilityRouter,
};
