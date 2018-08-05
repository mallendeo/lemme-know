'use strict'

export const toCLP = num => num.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })

export const toNum = price => Number(price.replace(/\./g, ''))

export const getAll = fn => {
  const next = async (page = 1, filters, cb, onEnd) => {
    const { list, totalPages, currPage } = await fn(page, filters)
    cb && cb(list, { totalPages, currPage })
    if (currPage >= totalPages) return onEnd && onEnd()
    return next(currPage + 1, filters, cb, onEnd)
  }

  return next
}
