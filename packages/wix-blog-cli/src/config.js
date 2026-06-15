const path = require('path');
const root = path.resolve(__dirname, '..');
module.exports = {
  root,
  dataDir: process.env.WIX_BLOG_DATA_DIR || path.join(root, 'data'),
  site: {
    name: process.env.WIX_BLOG_SITE_NAME || 'Example Wix Site',
    siteId: process.env.WIX_BLOG_SITE_ID || '00000000-0000-0000-0000-000000000000',
    baseUrl: process.env.WIX_BLOG_BASE_URL || 'https://example.com',
    dashboardPostsUrl: process.env.WIX_BLOG_DASHBOARD_POSTS_URL || 'https://manage.wix.com/dashboard/<site-id>/blog/posts',
    sourceLanguage: process.env.WIX_BLOG_SOURCE_LANGUAGE || 'bg',
    targetLanguage: process.env.WIX_BLOG_TARGET_LANGUAGE || 'en',
  },
  cdpUrl: process.env.WIX_CDP_URL || 'http://127.0.0.1:18800',
  glossary: [
    [/Top Apartments/gi, 'Top Kvartiri'],
    [/top apartments/gi, 'Top Kvartiri'],
    [/Топ Квартири/g, 'Top Kvartiri'],
  ],
};
