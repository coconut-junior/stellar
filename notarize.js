const { notarize } = require('@electron/notarize');
const { build } = require('./package.json');
require('dotenv').config();

const notarizeMacos = async (context) => {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  console.log(`preparing to notarize ${appOutDir}/${appName}.app`);
  console.log('notarizing... (typically takes less than an hour)');

  await notarize({
    appBundleId: build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    teamId: process.env.TEAM_ID,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    verbose: true,
  });
  console.log('--- notarization completed ---');
};

exports.default = notarizeMacos;
