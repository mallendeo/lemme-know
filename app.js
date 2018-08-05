'use strict'

const cron = require('cron')
const moment = require('moment')
const throttle = require('lodash/throttle')
const Telegraf = require('telegraf')

const db = require('./db')
const falabella = require('./bots/falabella')

const { BOT_TOKEN, CHAT_ID } = process.env
if (!BOT_TOKEN || !CHAT_ID) {
  throw Error('BOT_TOKEN and CHAT_ID are required')
}

moment.tz.setDefault('America/Santiago')

const bot = new Telegraf(BOT_TOKEN)
const send = (...args) => bot.telegram.sendMessage(CHAT_ID, ...args)
const toCLP = num => num.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })

const editPinMsg = msg => bot.telegram.editMessageText(
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

bot.startPolling()

send('Starting bot...')

const toNum = price => Number(price.replace(/\./g, ''))

const notify = throttle(props => {
  const { done, currPage, totalPages } = props
  const runs = db.get('runCount').value()
  if (done) {
    const lastRun = db.get('lastRun').value()
    editPinMsg(`Run ${runs} done!

\`${moment(lastRun).format('HH:mm DD/MM/YYYY')}\``)
    return
  }

  const progress = `Page ${currPage} of ${totalPages}`
  editPinMsg(`Run #${runs}: ${progress}`)
}, 5000)

const checkPrices = () => {
  db.update('runCount', n => n + 1).write()
  
  falabella.getAllProducts(1, ['lowprice'], (list, { totalPages, currPage }) => {
    notify({ currPage, totalPages })

    list.forEach(prod => {
      const url = falabella.HOST + prod.url
      prod.prices.forEach(price => {
        const key = `${prod.productId}:${price.type}`
        const prevPrice = db.get(`prices.${key}`).value()
        const prices = [
          price.originalPrice,
          price.formattedLowestPrice,
          price.formattedHighestPrice
        ].filter(p => typeof p !== 'undefined').map(toNum)

        const lowestPrice = Math.min(...prices)
        
        if (prevPrice) {
          const delta = Math.abs(1 - lowestPrice / prevPrice)
          if (delta >= 0.5 && lowestPrice < prevPrice) {
            send(
              `${url}\n` +
              `Then: ${toCLP(prevPrice)}\n` +
              `Now: ${toCLP(lowestPrice)}\n` +
              `Delta: ${Math.round(delta * 10000) / 100}%`,
              'Markdown'
            )
          }
        }
  
        db.set(`prices.${key}`, lowestPrice).value()
      })
    })

    db.write()
  }, () => {
    // done
    db.set('lastRun', Date.now()).write()
    notify({ done: true })
  })
}

new cron.CronJob({
  cronTime: '*/30 * * * *',
  onTick: checkPrices,
  start: true,
  runOnInit: true
})

process.stdin.resume()

const exitHandler = async err => {
  try {
    db.write()
    await send(`Bot crashed: ${err.message}`)
  } catch (e) {
    console.error(e.stack)
    console.error(err.stack)
  } finally {
    if (err) console.error(err.stack)
    process.exit()
  }
}

process.on('exit', exitHandler)
process.on('SIGINT', exitHandler)
process.on('SIGUSR1', exitHandler)
process.on('SIGUSR2', exitHandler)
process.on('uncaughtException', exitHandler)
