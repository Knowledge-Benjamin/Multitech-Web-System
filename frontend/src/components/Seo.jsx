import { useEffect } from 'react'

export default function Seo({
  title,
  description,
  path = '/',
  image,
  keywords = []
}) {
  useEffect(() => {
    const siteName = 'Multitech Business School'
    const defaultTitle = 'Multitech Business School | Higher Education in Uganda'
    const defaultDescription = 'Explore programmes, admissions, and academic opportunities at Multitech Business School in Uganda.'
    const resolvedTitle = title ? `${title} | ${siteName}` : defaultTitle
    const resolvedDescription = description || defaultDescription
    const resolvedKeywords = [...new Set(['Multitech', 'Multitech Business School', ...keywords])].join(', ')
    const canonicalPath = path.startsWith('/') ? path : `/${path}`
    const canonicalUrl = `${import.meta.env.VITE_SITE_URL || 'https://multitech-web-system.onrender.com'}${canonicalPath}`

    const setMeta = (selector, attr, value) => {
      let element = document.head.querySelector(selector)
      if (!element) {
        element = document.createElement('meta')
        document.head.appendChild(element)
      }
      if (attr === 'name') element.setAttribute('name', selector.replace('meta[name="', '').replace('"]', ''))
      if (attr === 'property') element.setAttribute('property', selector.replace('meta[property="', '').replace('"]', ''))
      element.setAttribute(attr, value)
      element.content = value
      return element
    }

    document.title = resolvedTitle

    const descriptionMeta = document.head.querySelector('meta[name="description"]') || document.createElement('meta')
    descriptionMeta.setAttribute('name', 'description')
    descriptionMeta.content = resolvedDescription
    if (!document.head.querySelector('meta[name="description"]')) document.head.appendChild(descriptionMeta)

    const keywordsMeta = document.head.querySelector('meta[name="keywords"]') || document.createElement('meta')
    keywordsMeta.setAttribute('name', 'keywords')
    keywordsMeta.content = resolvedKeywords
    if (!document.head.querySelector('meta[name="keywords"]')) document.head.appendChild(keywordsMeta)

    const robotsMeta = document.head.querySelector('meta[name="robots"]') || document.createElement('meta')
    robotsMeta.setAttribute('name', 'robots')
    robotsMeta.content = 'index,follow'
    if (!document.head.querySelector('meta[name="robots"]')) document.head.appendChild(robotsMeta)

    const ogTitle = document.head.querySelector('meta[property="og:title"]') || document.createElement('meta')
    ogTitle.setAttribute('property', 'og:title')
    ogTitle.content = resolvedTitle
    if (!document.head.querySelector('meta[property="og:title"]')) document.head.appendChild(ogTitle)

    const ogDescription = document.head.querySelector('meta[property="og:description"]') || document.createElement('meta')
    ogDescription.setAttribute('property', 'og:description')
    ogDescription.content = resolvedDescription
    if (!document.head.querySelector('meta[property="og:description"]')) document.head.appendChild(ogDescription)

    const ogType = document.head.querySelector('meta[property="og:type"]') || document.createElement('meta')
    ogType.setAttribute('property', 'og:type')
    ogType.content = 'website'
    if (!document.head.querySelector('meta[property="og:type"]')) document.head.appendChild(ogType)

    const ogSiteName = document.head.querySelector('meta[property="og:site_name"]') || document.createElement('meta')
    ogSiteName.setAttribute('property', 'og:site_name')
    ogSiteName.content = siteName
    if (!document.head.querySelector('meta[property="og:site_name"]')) document.head.appendChild(ogSiteName)

    if (image) {
      const ogImage = document.head.querySelector('meta[property="og:image"]') || document.createElement('meta')
      ogImage.setAttribute('property', 'og:image')
      ogImage.content = image
      if (!document.head.querySelector('meta[property="og:image"]')) document.head.appendChild(ogImage)
    }

    let canonicalLink = document.head.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute('href', canonicalUrl)
  }, [title, description, path, image, keywords])

  return null
}
