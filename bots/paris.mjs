import axios from 'axios'
import _set from 'lodash/set'

const HOST = 'https://www.paris.cl'
const API_URL = `${HOST}/store-api/pyload/_search`
const PROD_QTY = 100

export const CATEG_MAPPING = {
  electro: 'Electro',
  home: 'Muebles',
  beds: 'Dormitorio',
  tecno: 'Tecno',
  kitchen: 'Línea Blanca'
}

// paris.cl will throw a 500 error after the 10000th item
// A workaround is to filter products by category
export const getProducts = async (page, category) => {
  if (!category) throw Error('`category` argument is required')
  if (!CATEG_MAPPING[category]) throw Error(`Category ${category} not found`)

  const body = _set(
    { size: PROD_QTY, from: (page - 1) * PROD_QTY },
    `query.function_score.query.bool.must[0].term['cat_1.raw']`,
    CATEG_MAPPING[category]
  )

  const { data } = await axios.post(API_URL, body)
  const { hits: { total, hits } } = data

  const list = hits.map(({ _source: prod }) => ({
    price:
      Math.min(...[
        prod.price,
        prod.price_tc,
        prod.price_internet
      ].filter(p => p)),
    url: prod.product_can,
    id: prod.id_prod
  }))

  return {
    list,
    currPage: page,
    totalPages: Math.floor(total / PROD_QTY)
  }
}
