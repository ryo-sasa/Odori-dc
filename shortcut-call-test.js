// ✅ 呼び出しアプリ 完全版（対象者を院長・水野愛梨の2名に限定、コメント・種別選択・応答パターン付き）
const timeouts = {}; // タイムアウトを管理するオブジェクト

module.exports = function(app) {

  app.shortcut('call_someone_test', async ({ shortcut, ack }) => {
    try {
      await ack();

      await app.client.views.open({
        trigger_id: shortcut.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'call_someone_submit',
          title: {
            type: 'plain_text',
            text: '呼び出しフォーム',
            emoji: true
          },
          submit: {
            type: 'plain_text',
            text: '呼び出す',
            emoji: true
          },
          close: {
            type: 'plain_text',
            text: 'キャンセル',
            emoji: true
          },
          blocks: [
            {
              type: 'input',
              block_id: 'room_name',
              element: {
                type: 'static_select',
                action_id: 'static_select-action',
                placeholder: {
                  type: 'plain_text',
                  text: '部屋を選択してください',
                  emoji: true
                },
                options: [
                  ...['Unit1','Unit2','Unit3','Unit4','Unit5','Unit6','Unit7','Unit8','Unit9','Counseling','受付','キッズルーム','アクティビティルーム']
                    .map(unit => ({
                      text: { type: 'plain_text', text: unit },
                      value: unit
                    }))
                ]
              },
              label: {
                type: 'plain_text',
                text: '部屋名',
                emoji: true
              }
            },
            {
              type: 'input',
              block_id: 'target_user',
              element: {
                type: 'multi_users_select',
                action_id: 'multi_users_select_action',
                placeholder: {
                  type: 'plain_text',
                  text: '呼び出したいユーザーを選択',
                  emoji: true
                }
              },
              label: {
                type: 'plain_text',
                text: '呼び出す相手',
                emoji: true
              }
            },
            {
              type: 'input',
              block_id: 'purpose',
              element: {
                type: 'static_select',
                action_id: 'purpose_select_action',
                placeholder: {
                  type: 'plain_text',
                  text: '用途を選んでください',
                  emoji: true
                },
                options: [
                { text: { type: 'plain_text', text: 'チェック' }, value: 'チェック' },
                { text: { type: 'plain_text', text: 'デンタル' }, value: 'デンタル' },
                { text: { type: 'plain_text', text: '説明' }, value: '説明' },
                { text: { type: 'plain_text', text: 'コメント欄参照' }, value: 'コメント欄参照' }
              ]
              },
              label: {
                type: 'plain_text',
                text: '呼び出し種別',
                emoji: true
              }
            },
          {
            type: 'input',
            block_id: 'comment',
            optional: true,
            element: {
              type: 'plain_text_input',
              action_id: 'comment_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: '伝えたいことがあれば入力してください'
              }
            },
            label: {
              type: 'plain_text',
              text: 'コメント（任意）',
              emoji: true
            }
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error opening modal:', error);
  }
});

app.view('call_someone_submit', async ({ ack, body, view }) => {
  try {
    await ack();

    const requester = body.user.id;
    const roomName = view.state.values.room_name['static_select-action'].selected_option.text.text;
    const selected = view.state.values.target_user.multi_static_select_action.selected_options;
    const targetUsers = selected.map(option => option.value);
    const purpose = view.state.values.purpose.purpose_select_action.selected_option.value;
    const comment = view.state.values.comment?.comment_input?.value || '';

    if (!targetUsers.length) return;

    const mentionList = targetUsers.map(user => `<@${user}>`).join(', ');

    const notificationText = `\uD83D\uDCE2 *呼び出し通知*\n` +
      `\uD83D\uDD39 呼び出し元：${roomName}\n` +
      `\uD83D\uDD39 呼び出し者：<@${requester}>\n` +
      `\uD83D\uDD39 呼び出し対象：${mentionList}\n` +
      `\uD83D\uDCCD 種別：${purpose}\n` +
      (comment ? `\u2709\uFE0F コメント：${comment}\n` : '');

    for (let id of targetUsers) {
      await app.client.chat.postMessage({
        channel: id,
        text: notificationText,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: notificationText }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '今行きます', emoji: true },
                style: 'primary',
                value: `${requester},${id},${roomName},今行きます`,
                action_id: 'respond_call'
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'お待ちください', emoji: true },
                style: 'danger',
                value: `${requester},${id},${roomName},お待ちください`,
                action_id: 'respond_call'
              }
            ]
          }
        ]
      });

      const timeoutId = setTimeout(async () => {
        await app.client.chat.postMessage({
          channel: id,
          text: `\u23F3 *まだ対応が記録されていません*\n${notificationText}`
        });
      }, 90000);

      timeouts[id] = timeoutId;
    }

    await app.client.chat.postMessage({
      channel: requester,
      text: `✅ 呼び出しを送信しました。\n${notificationText}`
    });

  } catch (error) {
    console.error('Error handling view submission:', error);
  }
});

app.action('respond_call', async ({ ack, body }) => {
  try {
    await ack();

    const [requester, responder, roomName, responseText] = body.actions[0].value.split(',');

    if (timeouts[responder]) {
      clearTimeout(timeouts[responder]);
      delete timeouts[responder];
    }

    await app.client.chat.postMessage({
      channel: requester,
      text: `✅ <@${responder}> が ${roomName} への呼び出しに「${responseText}」と応答しました。`
    });

    await app.client.chat.postMessage({
      channel: responder,
      text: `📬 応答「${responseText}」を記録しました。`
    });
  } catch (error) {
    console.error('Error handling button action:', error);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
  };