'use strict'

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({
  prices: {},
  lastRun: null,
  runCount: 0,
  pinnedMsg: process.env.PINNED_MSG
}).write()

module.exports = db
