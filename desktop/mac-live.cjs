const base = require('../package.json').build;
module.exports = { ...base, appId: 'cn.changan.health.live', productName: '常安开发体验', directories: { ...base.directories, output: '../mac-live' }, files: [...base.files, 'desktop/dev-mode.json'] };
