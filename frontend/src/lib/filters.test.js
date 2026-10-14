import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTER,
  filterFromQuery,
  filterToQuery,
  isDefaultFilter,
  describeFilter,
  stripFilterKeys,
  hasFilterParams
} from './filters.js'
import { CLASS } from './format.js'

describe('filterFromQuery / filterToQuery', () => {
  it('round-trips a non-default filter through a route query', () => {
    const query = filterToQuery({ ...DEFAULT_FILTER, status: CLASS.WIP, dept: 'Compositing' })
    expect(query).toEqual({ status: CLASS.WIP, dept: 'Compositing' })
    expect(filterFromQuery(query)).toEqual({ ...DEFAULT_FILTER, status: CLASS.WIP, dept: 'Compositing' })
  })

  it('omits default fields entirely so URLs stay short', () => {
    expect(filterToQuery(DEFAULT_FILTER)).toEqual({})
  })

  it('normalizes vue-router array query values to their first entry', () => {
    expect(filterFromQuery({ status: [CLASS.DONE, CLASS.WIP] }).status).toBe(CLASS.DONE)
  })

  it('ignores unknown query keys', () => {
    expect(filterFromQuery({ dark_theme: 'true', status: CLASS.RETAKE })).toEqual({
      ...DEFAULT_FILTER,
      status: CLASS.RETAKE
    })
  })
})

describe('isDefaultFilter', () => {
  it('is true only when every field matches the default', () => {
    expect(isDefaultFilter(DEFAULT_FILTER)).toBe(true)
    expect(isDefaultFilter({ ...DEFAULT_FILTER, q: 'anees' })).toBe(false)
  })
})

describe('describeFilter', () => {
  it('produces one chip per non-default field', () => {
    const chips = describeFilter({ ...DEFAULT_FILTER, status: CLASS.DONE, artist: 'Anees' })
    expect(chips.map((c) => c.key).sort()).toEqual(['artist', 'status'])
  })

  it('each chip clears only its own field', () => {
    const chips = describeFilter({ ...DEFAULT_FILTER, dept: 'Compositing' })
    expect(chips).toEqual([{ key: 'dept', label: 'Compositing', clear: { dept: 'all' } }])
  })
})

describe('stripFilterKeys', () => {
  it('removes only the filter fields, keeping unrelated query params', () => {
    const out = stripFilterKeys({ dark_theme: 'true', status: CLASS.WIP, q: 'x' })
    expect(out).toEqual({ dark_theme: 'true' })
  })
})

describe('hasFilterParams', () => {
  it('is false for unrelated params only (e.g. Kitsu context, our own dev cache-busters)', () => {
    expect(hasFilterParams({ dark_theme: 'true', v: '6', demo: '1' })).toBe(false)
    expect(hasFilterParams({})).toBe(false)
  })

  it('is true as soon as one real filter field is present, even if "empty"', () => {
    expect(hasFilterParams({ dept: 'Compositing' })).toBe(true)
    expect(hasFilterParams({ q: '' })).toBe(true)
  })
})

describe('scope', () => {
  it('defaults to tasks and is omitted from the query', () => {
    expect(DEFAULT_FILTER.scope).toBe('tasks')
    expect(filterToQuery(DEFAULT_FILTER)).toEqual({})
  })

  it('round-trips shots scope and counts as a filter param', () => {
    const query = filterToQuery({ ...DEFAULT_FILTER, scope: 'shots', status: CLASS.DONE })
    expect(query).toEqual({ scope: 'shots', status: CLASS.DONE })
    expect(filterFromQuery(query).scope).toBe('shots')
    expect(hasFilterParams({ scope: 'shots' })).toBe(true)
  })

  it('shows a removable chip that switches back to tasks', () => {
    const chips = describeFilter({ ...DEFAULT_FILTER, scope: 'shots' })
    expect(chips).toHaveLength(1)
    expect(chips[0].clear).toEqual({ scope: 'tasks' })
  })
})
