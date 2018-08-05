import axios from 'axios'
import { getAll, toNum } from '../helpers'

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

export const getProducts = async (page, filters, retry = 0) => {
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

    const list = resultList.map(prod => {
      const url = HOST + prod.url

      const prices = prod.prices.map(price =>
        Math.min(...[
          price.originalPrice,
          price.formattedLowestPrice,
          price.formattedHighestPrice
        ]
          .filter(p => typeof p !== 'undefined')
          .map(toNum)
        )
      )

      return {
        url,
        price: Math.min(...prices),
        id: prod.productId
      }
    })

    return {
      list,
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

export const getAllProducts = getAll(getProducts)
