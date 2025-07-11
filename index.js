const { App } = require('@slack/bolt');
const callHandler = require('./shortcut-call');
const questionHandler = require('./shortcut-question');
const calltestHandler = require('./shortcut-call-test');

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN
});

// 外部ファイルで app を使ってハンドラを登録
callHandler(app);
questionHandler(app);
calltestHandler(app);

// 起動
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();