const ADDRESSES = require('../helper/coreAssets.json')
const { sumTokensExport } = require('../helper/unwrapLPs')

const HEDGEHOG_CORE = '0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e'

module.exports = {
  methodology: 'TVL is the native S and USDC held in the HedgehogCore hub pool contracts as protocol-owned liquidity.',
  sonic: {
    tvl: sumTokensExport({
      owners: [HEDGEHOG_CORE],
      tokens: [ADDRESSES.null, ADDRESSES.sonic.USDC_e],
    }),
  },
}
