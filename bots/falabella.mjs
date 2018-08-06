import axios from 'axios'
import { toNum } from '../helpers'

const HOST = 'https://www.falabella.com'
const API_URL = `${HOST}/rest/model/falabella/rest/browse/BrowseActor`

export const CATEG_MAPPING = {
  electro: '1z0ztpy',
  home: '1z141va',
  beds: '1z0wutu'
}

export const getProducts = async (page, category) => {
  const params = {
    currentPage: page,
    navState: `/search/N-${CATEG_MAPPING[category]}`
  }

  const paramsStr = encodeURIComponent(JSON.stringify(params))
  const url = `${API_URL}/get-product-record-list?${paramsStr}`

  const { data } = await axios(url, {
    headers: {
      'content-type': 'application/json'
    }
  })

  // curentPage is actually a Falabella's typo
  const { resultList, pagesTotal, curentPage } = data.state

  const list = resultList
    .filter(prod => prod.isCCAvailable || prod.isHDAvailable)
    .map(prod => {
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
}
