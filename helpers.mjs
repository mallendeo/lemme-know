export const wait = (ms = 1000) => new Promise(r => setTimeout(r, ms))

export const toCLP = num =>
  num.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP'
  })

export const toNum = price => Number(price.replace(/\./g, ''))

export const capitalize = str => str.replace(/^\w/, c => c.toUpperCase())
