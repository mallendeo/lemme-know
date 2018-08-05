import axios from 'axios'
import _ from 'lodash'
import { getAll } from '../helpers'

const HOST = 'https://www.paris.cl'
const API_URL = `${HOST}/store-api/pyload/_search`

export const getProducts = async (page = 1, filters, qty = 32) => {
  const body = _.set(
    { size: qty, from: (page - 1) * qty },
    'query.function_score.query.bool.must[0].range.price',
    { gte: '50001', lte: null }
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
