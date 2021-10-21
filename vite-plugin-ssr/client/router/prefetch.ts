import { assertUsage } from '../../shared/utils'
import { route } from '../../shared/route'
import { addComputedUrlProps } from '../../shared/addComputedurlProps'
import { getGlobalContext } from './getGlobalContext'
import { navigationState } from '../navigationState'
import { loadPageFiles } from '../loadPageFiles'
import { isExternalLink } from './utils/isExternalLink'
import { isNotNewTabLink } from './utils/isNotNewTabLink'

export { addLinkPrefetch, prefetch }

const prefetchLinksHandled = new Map<string, boolean>()

async function prefetch(url: string) {
  const prefetchUrl = getPrefetchUrl(url)
  if(!shouldPrefetch(prefetchUrl)) return
  prefetchLinksHandled.set(prefetchUrl, true)
  const globalContext = await getGlobalContext()
  const pageContext = {
    url,
    _noNavigationnChangeYet: navigationState.noNavigationChangeYet,
    ...globalContext
  }
  addComputedUrlProps(pageContext)
  const routeContext = await route(pageContext)
  if('pageContextAddendum' in routeContext) {
    const _pageId = routeContext.pageContextAddendum._pageId
    if(_pageId) {
      loadPageFiles({_pageId})
    }
  }
}

function addLinkPrefetch(prefetchOption: boolean, currentUrl: string) {
  // no need to add listeners on current url links
  prefetchLinksHandled.set(getPrefetchUrl(currentUrl), true)
  const linkTags = [...document.getElementsByTagName('A')] as HTMLElement[]
  linkTags.forEach(async (v) => {
    const url = v.getAttribute('href')
    if(url && isNotNewTabLink(v)) {
      const prefetchUrl = getPrefetchUrl(url)
      if(!shouldPrefetch(prefetchUrl)) return
      const prefetchOptionWithOverride = getPrefetchOverride(prefetchOption, v)
      if(prefetchOptionWithOverride) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if(entry.isIntersecting) {
              onVisible(url)
              observer.disconnect()
            }
          })
        })
        observer.observe(v)
      } else {
        v.addEventListener('mouseover', () => onVisible(url))
        v.addEventListener('touchstart', () => onVisible(url))
      }
    }
  })

  function onVisible(url: string) {
    prefetch(url)
  }

  function getPrefetchOverride(prefetchOption: boolean, link: HTMLElement): boolean {
    const prefetchAttribute = link.getAttribute('data-prefetch')
    if(typeof prefetchAttribute === 'string') {
      const options = ['true', 'false']
      assertUsage(options.includes(prefetchAttribute), `data-prefetch got invalid value: "${prefetchAttribute}", available options: ${options.map(v => `"${v}"`).join(', ')}`)
    }
    if(prefetchAttribute === 'true') {
      return true
    } else if(prefetchAttribute === 'false') {
      return false
    }

    return prefetchOption
  }
}

function getPrefetchUrl(url: string) {
  return url.split('?')[0]?.split('#')[0] || ''
}

function shouldPrefetch(prefetchUrl: string) {
  if(isExternalLink(prefetchUrl)) return false
  if(prefetchLinksHandled.has(prefetchUrl)) return false

  return true
}
