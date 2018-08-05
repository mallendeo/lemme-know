'use strict'

const axios = require('axios')

const HOST = 'https://www.falabella.com'
const API_URL = `${HOST}/rest/model/falabella/rest/browse/BrowseActor`

const makeUrl = (page = 1, filters) => {
  const priceMap = {
    50: '277mZ',
    100: '27cuZ',
    200: '27cvZ',
    350: '27cwZ',
    500: '277oZ',
    1000: '27cx'
  }

  const categMap = {
    electro: 'Z1z0ztpy'
  }

  const prices = (filters.indexOf('lowprice') > -1
   ? Object.values(priceMap)
   : Object.values(priceMap).slice(1)
  ).join('')

  const categories = filters.map(filter => (categMap[filter] || '')).join('')

  const params = {
    currentPage: page,
    navState: `/search/N-${prices + categories}`
  }

  const paramsStr = encodeURIComponent(JSON.stringify(params))

  return `${API_URL}/get-product-record-list?${paramsStr}`
}

const getProducts = async (page, filters, retry = 0) => {
  const url = makeUrl(page, filters)

  try {
    const { data } = await axios(url, {
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      }
    })

    // curentPage is actually a Falabella's typo
    const { resultList, pagesTotal, curentPage } = data.state
    return {
      list: resultList,
      currPage: curentPage,
      totalPages: pagesTotal
    }
  } catch (e) {
    if (retry > 2) {
      console.error(e)
      return
    }
    
    console.log(e, 'Retrying...')
    return getProducts(page, filters, retry + 1)
  }
}

const getAllProducts = async (page = 1, filters, cb, onEnd) => {
  const { list, totalPages, currPage } = await getProducts(page, filters)
  cb && cb(list, { totalPages, currPage })
  if (currPage >= totalPages) return onEnd && onEnd()
  return getAllProducts(currPage + 1, filters, cb, onEnd)
}

module.exports = {
  getProducts,
  getAllProducts,
  HOST
}
