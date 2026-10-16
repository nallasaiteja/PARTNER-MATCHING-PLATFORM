import React, { useEffect } from 'react';

export interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  schema?: Record<string, any>;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalPath = '',
  keywords = 'matrimony, partner matching, telugu matrimony, verified profiles, assisted matchmaking',
  ogImage = '/brand-og.png',
  ogType = 'website',
  schema,
}) => {
  useEffect(() => {
    // 1. Page Title
    const fullTitle = `${title} | Partner Matching Platform`;
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (nameAttr: string, nameValue: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, nameValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Standard Meta
    setMeta('name', 'description', description);
    setMeta('name', 'keywords', keywords);

    // 3. Canonical URL
    const canonicalUrl = `${window.location.origin}${canonicalPath || window.location.pathname}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // 4. Open Graph Tags
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:site_name', 'Partner Matching Platform');
    setMeta('property', 'og:image', `${window.location.origin}${ogImage}`);

    // 5. Twitter Cards
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', `${window.location.origin}${ogImage}`);

    // 6. JSON-LD Structured Data Schema Markup
    const defaultSchema = schema || {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Partner Matching Platform',
      url: window.location.origin,
      logo: `${window.location.origin}/vite.svg`,
      description: 'Trusted community partner matching and assisted matchmaking service.',
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]#page-structured-data');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      scriptTag.setAttribute('id', 'page-structured-data');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(defaultSchema);
  }, [title, description, canonicalPath, keywords, ogImage, ogType, schema]);

  return null;
};
