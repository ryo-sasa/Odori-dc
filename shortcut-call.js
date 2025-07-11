const timeouts = {}; // タイムアウトを管理するオブジェクト

module.exports = function(app) {

  // 呼び出しショートカット
  app.shortcut('call_someone', async ({ shortcut, ack }) => {
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
            }
          ]
        }
      });
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  });

  // モーダルの送信処理
  app.view('call_someone_submit', async ({ ack, body, view }) => {
    try {
      await ack();

      const requester = body.user.id;
      const roomName = view.state.values.room_name['static_select-action'].selected_option.text.text;
      const targetUsers = view.state.values.target_user.multi_users_select_action.selected_users;

      if (!targetUsers.length) return;

      const mentionList = targetUsers.map(user => `<@${user}>`).join(', ');

      const notificationText = `📢 *呼び出し通知*\n` +
        `🔹 呼び出し元：${roomName}\n` +
        `🔹 呼び出し者：<@${requester}>\n` +
        `🔹 呼び出し対象：${mentionList}`;

      // 管理チャンネルに通知
      if (process.env.INQUIRE_CH) {
        await app.client.chat.postMessage({
          channel: process.env.INQUIRE_CH,
          text: `📋 *呼び出しがありました*\n${notificationText}`
        });
      }

      // 対象者に通知（ボタン付き）
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
                  text: { type: 'plain_text', text: '対応します', emoji: true },
                  style: 'primary',
                  value: `${requester},${id},${roomName}`,
                  action_id: 'respond_call'
                }
              ]
            }
          ]
        });

        // 5分後リマインダーをセットし、IDを保存
        const timeoutId = setTimeout(async () => {
          await app.client.chat.postMessage({
            channel: id,
            text: `⏳ *まだ対応が記録されていません*\n${notificationText}`
          });
        }, 90000);

        timeouts[id] = timeoutId; // ユーザーごとにタイムアウトIDを保存
      }

      // 呼び出し者に通知
      await app.client.chat.postMessage({
        channel: requester,
        text: `✅ 呼び出しを送信しました。\n${notificationText}`
      });

    } catch (error) {
      console.error('Error handling view submission:', error);
    }
  });

  // ボタン押下時（対応します）
  app.action('respond_call', async ({ ack, body }) => {
    try {
      await ack();

      const [requester, responder, roomName] = body.actions[0].value.split(',');

      // もしリマインダーが設定されていたらクリアする
      if (timeouts[responder]) {
        clearTimeout(timeouts[responder]);
        delete timeouts[responder]; // 削除
      }

      await app.client.chat.postMessage({
        channel: requester,
        text: `✅ <@${responder}> が ${roomName} への呼び出しに対応しました！`
      });

      await app.client.chat.postMessage({
        channel: responder,
        text: `📬 対応を記録しました。呼び出し者に通知済みです。`
      });
    } catch (error) {
      console.error('Error handling button action:', error);
    }
  });

};