import cron from 'cron'
import moment from 'moment'
import throttle from 'lodash/throttle'

import db from './db'
import bots from './bots'
import { editPinMsg, send } from './tg'
import { toCLP, capitalize } from './helpers'

const state = Object.keys(bots).reduce((obj, bot) => {
  obj[bot] = { done: false, currPage: 0, totalPages: 0 }
  return obj
}, {})

moment.tz.setDefault('America/Santiago')

send('Starting bot...', null, null, true)

const notify = throttle(() => {
  const msg = Object.keys(bots).map(bot => {
    const { done, currPage, totalPages } = state[bot]
    const runs = db.get(`${bot}.runCount`).value()
    const name = capitalize(bot)

    if (done) {
      const lastRun = db.get(`${bot}.lastRun`).value()

      return ( 
        `*${name}*: run ${runs} done!\n` +
        `\`${moment(lastRun).format('HH:mm DD/MM/YYYY')}\``
      )
    }

    const progress = `page ${currPage} of ${totalPages}`
    return `*${name}*: #${runs}, ${progress}`
  }).join('\n\n')

  editPinMsg(msg)
}, 5000)

const saveDb = throttle(() => db.write(), 1000)

const checkPrices = () => {
  Object.keys(bots).forEach(bot => {
    db.update(`${bot}.runCount`, n => n + 1)
    saveDb()

    bots[bot].getAllProducts(1, undefined, (list, { totalPages, currPage }) => {
      state[bot].totalPages = totalPages
      state[bot].currPage = currPage
      notify()

      list.forEach(prod => {
        const prevPrice = db.get(`${bot}.prices.${prod.id}`).value()
        if (prevPrice) {
          const delta = Math.abs(1 - prod.price / prevPrice)
          if (delta >= 0.5 && prod.price < prevPrice) {
            send(
              `${url}\n` +
              `Then: ${toCLP(prevPrice)}\n` +
              `Now: ${toCLP(prod.price)}\n` +
              `Delta: ${Math.round(delta * 10000) / 100}%`,
              'Markdown'
            )
          }
        }
  
        db.set(`${bot}.prices.${prod.id}`, prod.price).value()
      })
  
      saveDb()
    }, () => {
      db.set(`${bot}.lastRun`, Date.now()).write()
      state[bot].done = true
      notify()
    })
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
