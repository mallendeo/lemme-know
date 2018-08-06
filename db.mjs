import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import bots from './bots'

const adapter = new FileSync('./data/db.json')
const db = low(adapter)

const botsConfig = Object.keys(bots).reduce((obj, bot) => {
  obj[bot] = { prices: {}, runCount: 0, lastRun: null }
  return obj
}, {})

db.defaults({
  ...botsConfig,
  pinnedMsg: process.env.PINNED_MSG,
  delta: 0.5,
  timeout: 30 * 60 * 1000
}).write()

export default db
