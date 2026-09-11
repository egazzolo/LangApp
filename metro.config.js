const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// The activity schema is shared with Deno Edge Functions.
config.resolver.resolveRequest = (context, moduleName, platform) =>
  context.resolveRequest(context, moduleName === 'npm:zod@4.4.3' ? 'zod' : moduleName, platform);
module.exports = config;
