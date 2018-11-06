import moment from 'moment-timezone'
import throttle from 'lodash/throttle'

import db from './db'
import bots from './bots'
import { editPinMsg, send, bot as tgBot } from './tg'
import { toCLP, capitalize, wait } from './helpers'

console.log('node version', process.version)

const state = Object.keys(bots).reduce(
  (obj, bot) => {
    obj[bot] = {
      done: false,
      currPage: 0,
      totalPages: 0,
      totalProducts: 0
    }
    return obj
  },
  { timeout: null }
)

moment.tz.setDefault('America/Santiago')

send('Starting bot...', null, null, true)

const createStatusMsg = () =>
  Object.keys(bots)
    .map(bot => {
      const { done, currPage, totalPages } = state[bot]
      const runs = db.get(`${bot}.runCount`).value()
      const name = capitalize(bot)

      if (done) {
        const lastRun = db.get(`${bot}.lastRun`).value()

        return (
          `*${name}*: run ${runs} done!\n` +
          `*Total products*: ${state[bot].totalProducts}\n` +
          `*Finished*: \`${moment(lastRun).format('HH:mm DD/MM/YYYY')}\``
        )
      }

      const { categories } = bots[bot]
      const categ = state[bot].currCategory
      if (categ) {
        const cProg = `${categories.indexOf(categ) + 1}/${categories.length}`
        const prog =
          `**${capitalize(categ)} (${cProg})**:` +
          ` page ${currPage} of ${totalPages}`

        return `*${name}*: #${runs}, ${prog}`
      }
    })
    .join('\n\n')

const notify = throttle(() => {
  editPinMsg(createStatusMsg()).catch(err => console.error(err.message))
}, 5000)

const saveDb = throttle(() => db.write(), 1000)

const checkPrices = () => {
  Object.keys(bots).forEach(async bot => {
    db.update(`${bot}.runCount`, n => n + 1).write()

    const gotProdsCb = (list, nav) => {
      state[bot].done = false
      state[bot].running = true
      state[bot].totalPages = nav.totalPages
      state[bot].currPage = nav.currPage
      notify()

      list.forEach(prod => {
        state[bot].totalProducts += 1

        const prevPrice = db.get(`${bot}.prices.${prod.id}`).value()
        if (prevPrice) {
          const delta = Math.abs(1 - prod.price / prevPrice)
          const trigger = db.get('delta').value() || 0.5

          if (delta >= trigger && prod.price < prevPrice) {
            const msg =
              `${prod.url}\n` +
              `Then: ${toCLP(prevPrice)}\n` +
              `Now: ${toCLP(prod.price)}\n` +
              `Delta: ${Math.round(delta * 10000) / 100}%`

            send(msg, 'Markdown')
          }
        }

        db.set(`${bot}.prices.${prod.id}`, prod.price).value()
      })

      saveDb()

      return state.run
    }

    state[bot].totalProducts = 0
    for (const categ of bots[bot].categories) {
      state[bot].currCategory = categ

      state.run && (await bots[bot].getAllProducts(1, categ, gotProdsCb))

      db.set(`${bot}.lastRun`, Date.now()).write()
      state[bot].running = false
      state[bot].done = true
      notify()
    }
  })
}

const run = () => {
  state.run = true
  state.timeout && clearTimeout(state.timeout)

  const ms = db.get('timeout').value()
  checkPrices()

  state.timeout = setTimeout(run, ms)
}

// starts in 1 minute
setTimeout(run, 60000)

// Telegram
// ---------------
tgBot.hears(/\/status/, ctx => {
  const msg = createStatusMsg()
  msg && ctx.replyWithMarkdown(msg)
})

tgBot.hears(/\/run/, async ctx => {
  if (state.run) {
    ctx.reply(`Process already running`)
    return
  }

  run()
  ctx.reply(`Process started`)
})

tgBot.hears(/\/stop/, async ctx => {
  state.run = false
  ctx.reply('Process stopped')
})

// Process
// ---------------
process.stdin.resume()

const exitHandler = async err => {
  try {
    db.write()
    send(`Bot crashed${err.message ? `: ${err.message}` : ''}`)
    await wait()
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
