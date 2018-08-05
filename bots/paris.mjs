import axios from 'axios'
import _ from 'lodash'
import { getAll } from '../helpers'

const HOST = 'https://www.paris.cl'
const API_URL = `${HOST}/store-api/pyload/_search`

// FIXME:
// paris.cl will throw a 500 error after the 10000th item
// possible workaround is to filter products by category
export const getProducts = async (page = 1, filters, qty = 100) => {
  const body = _.set(
    { size: qty, from: (page - 1) * qty },
    'query.function_score.query.bool.must[0].range.price',
    { gte: '150000' }
  )

  const { data: { hits: { total, hits } } } = await axios.post(API_URL, body)

  const list = hits.map(({ _source: prod }) => ({
    price: Math.min(...[
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
    totalPages: Math.floor(total / qty)
  }
}

export const getAllProducts = getAll(getProducts)
