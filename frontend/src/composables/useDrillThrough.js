import { useRouter, useRoute } from 'vue-router'
import { DEFAULT_FILTER, filterToQuery, stripFilterKeys } from '../lib/filters.js'

// Navigate to the Delivery Queue tab pre-filtered by a patch on top of the
// default filter — the click target for every KPI card, donut slice, bar,
// artist and department control across Overview/Production.
export function useDrillThrough() {
  const router = useRouter()
  const route = useRoute()

  function goToQueue(patch) {
    router.push({
      path: '/delivery',
      query: {
        ...stripFilterKeys(route.query),
        ...filterToQuery({ ...DEFAULT_FILTER, ...patch })
      }
    })
  }

  return { goToQueue }
}
