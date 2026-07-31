import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/freelancer/', '/api/'],
    },
    sitemap: 'https://targetdcorp.targetmediaconnect.com/sitemap.xml',
  };
}