export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kodechirp.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/settings',
          '/settings/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
