import * as falabella from './falabella'
import * as paris from './paris'
import { wait } from '../helpers'

const wrapper = bot => {
  const getProducts = async (page = 1, category) => {
    if (!category) throw Error('`category` argument is required')
    if (!bot.CATEG_MAPPING[category]) {
      throw Error(`Category ${category} not found`)
    }
    
    if (page < 1) throw Error('`page` must be greater than 0')

    return bot.getProducts(page, category)
  }

  const getAllProducts = (...args) =>
    new Promise((resolve, reject) => {
      let retry = 0
      const next = async (page = 1, categ, cb) => {
        if (!categ) throw Error('`categ` argument is required')

        try {
          const { list, totalPages, currPage } = await getProducts(page, categ)
          cb && cb(list, { totalPages, currPage })
    
          if (currPage >= totalPages) return resolve()

          retry = 0
          next(currPage + 1, categ, cb)
        } catch (e) {
          console.error(e.stack)

          if (++retry - 1 < 4) {
            await wait(5000)
            next(page, categ, cb)
            return
          }

          reject(e.stack)
        }
      }
  
      return next(...args)
    })

  return {
    ...bot,
    categories: Object.keys(bot.CATEG_MAPPING),
    getAllProducts,
    getProducts
  }
}

export default {
  falabella: wrapper(falabella),
  paris: wrapper(paris)
}
