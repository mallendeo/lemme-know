import Telegraf from 'telegraf'
import db from './db'

const { BOT_TOKEN, CHAT_ID } = process.env
if (!BOT_TOKEN || !CHAT_ID) {
  throw Error('BOT_TOKEN and CHAT_ID are required')
}

export const bot = new Telegraf(BOT_TOKEN)

export const send = (...args) => bot.telegram.sendMessage(CHAT_ID, ...args)

export const editPinMsg = msg => bot.telegram.editMessageText(
  CHAT_ID,
  db.get('pinnedMsg').value(),
  null,
  msg,
  { parse_mode: 'Markdown' }
)

bot.help(async ctx => {
  const { message } = ctx.update
  const reply = await ctx.replyWithMarkdown(`\`\`\`
Message ID: ${message.message_id}
Chat ID: ${message.chat.id}
From: ${JSON.stringify(message.from, null, 2)}
\`\`\``)
  ctx.replyWithMarkdown(`\`\`\`
Previous reply ID: ${reply.message_id}
Bot data: ${JSON.stringify(reply.from, null, 2)}
\`\`\``)
})

bot.hears(/\/setpin/, async ctx => {
  const msg = await send('Bot status')
  db.set('pinnedMsg', msg.message_id).write()
  bot.telegram.pinChatMessage(msg.chat.id, msg.message_id)
  ctx.reply(`Pin set`)
})

bot.hears(/\/settimeout (\d+)/, async ctx => {
  const num = Number(ctx.match[1])
  if (num < 5) {
    ctx.reply(`Must be greater than 5 minutes`)
    return
  }

  const ms = Number(num) * 1000 * 60
  db.set('timeout', ms).write()
  ctx.reply(`Timeout set to ${num} minutes (${ms} ms)`)
})

bot.hears(/\/setdelta (.+)/, async ctx => {
  const num = Number(ctx.match[1])
  const delta = Math.round(num * 100) / 10000
  db.set('delta', delta).write()
  ctx.reply(`Delta set to ${delta} (${num}%)`)
})

bot.startPolling()
