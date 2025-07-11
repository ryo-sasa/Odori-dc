module.exports = function(app) {

  // ショートカットを押下した際の処理
  app.shortcut('dx_q_create', async ({ shortcut, ack }) => {
    try {
      await ack();

      // モーダルを開く
      await app.client.views.open({
        trigger_id: shortcut.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'dx_q_create',
          title: {
            type: 'plain_text',
            text: 'なんでも問い合わせフォーム',
            emoji: true
          },
          submit: {
            type: 'plain_text',
            text: '提出',
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
              block_id: 'subject',
              element: {
                type: 'plain_text_input',
                action_id: 'plain_text_input-action'
              },
              label: {
                type: 'plain_text',
                text: '件名',
                emoji: true
              }
            },
            {
              type: 'input',
              block_id: 'category',
              element: {
                type: 'static_select',
                placeholder: {
                  type: 'plain_text',
                  text: '選択してください',
                  emoji: true
                },
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'DX関連について',
                      emoji: true
                    },
                    value: 'value-0'
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: '歯科業務について',
                      emoji: true
                    },
                    value: 'value-1'
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'いろいろな相談',
                      emoji: true
                    },
                    value: 'value-2'
                  }
                ],
                action_id: 'static_select-action'
              },
              label: {
                type: 'plain_text',
                text: '問い合わせ種別',
                emoji: true
              }
            },
            {
              type: 'input',
              block_id: 'contents',
              element: {
                type: 'plain_text_input',
                multiline: true,
                action_id: 'plain_text_input-action'
              },
              label: {
                type: 'plain_text',
                text: '問い合わせ内容',
                emoji: true
              }
            },
            {
              type: 'input',
              block_id: 'user_select',
              element: {
                type: 'multi_users_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'ユーザ選択',
                  emoji: true
                },
                action_id: 'multi_users_select_action'
              },
              label: {
                type: 'plain_text',
                text: '誰かに伝えたいときは相手をえらんでください(空欄OK)',
                emoji: true
              },
              optional: true
            }
          ]
        }
      });
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  });

  // 問い合わせが提出されたときの処理
  app.view('dx_q_create', async ({ ack, body, view }) => {
    try {
      await ack();

      const createUser = body.user.id; // 問い合わせ作成者
      const category = view.state.values.category['static_select-action'].selected_option.text.text; // 問い合わせ種別
      const contents = view.state.values.contents['plain_text_input-action'].value; // 問い合わせ内容
      const subject = view.state.values.subject['plain_text_input-action'].value; // 問い合わせ件名
      const ccUsersArr = view.state.values.user_select.multi_users_select_action.selected_users || []; // CCに追加されたユーザのリスト

      const txt = `作成者　：<@${createUser}>\n` +
                  `種別　　：${category}\n` +
                  `件名　　：${subject}\n` +
                  `内容　　：${contents}`;

      const mentionList = []; // CCに追加されているユーザをメンション形式にしたリスト

      // CCユーザーへの通知
      for (let id of ccUsersArr) {
        mentionList.push(`<@${id}>`);
        await app.client.chat.postMessage({
          channel: id,
          text: `<@${createUser}>が問い合わせを作成しました。\n${txt}`
        });
      }

      // 問い合わせ担当者へ通知
      await app.client.chat.postMessage({
        channel: process.env.INQUIRE_MANAGER,
        text: `📋 問い合わせが届きました。\n${txt}`
      });

      // 問い合わせ作成者への通知
      await app.client.chat.postMessage({
        channel: createUser,
        text: `✅ 問い合わせを作成しました。\n${txt}\nCC: ${mentionList.join(', ')}`
      });
    } catch (error) {
      console.error('Error handling view submission:', error);
    }
  });

};