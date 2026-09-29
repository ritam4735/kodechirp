const FEATURE_METADATA = {
  chirps: {
    title: 'Chirps — Developer Discourse',
    description: 'A new way for developers to share algorithmic ideas, code snippets, and technical insights. Coming soon to KodeChirp.',
  },
  flights: {
    title: 'Flights — Video Walkthroughs',
    description: 'Bite-sized video walkthroughs and technical explanations landing soon on KodeChirp.',
  },
  flocks: {
    title: 'Flocks — Developer Communities',
    description: 'Find your flock, build with purpose, and grow alongside developers who share your curiosity on KodeChirp.',
  },
  nest: {
    title: 'Nest — Saved Knowledge Hub',
    description: 'Your personal sanctuary for saved chirps, bookmarked problems, and curated learning paths on KodeChirp.',
  },
};

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.feature;
  const config = FEATURE_METADATA[slug] || {
    title: 'Upcoming Feature',
    description: 'Preview upcoming features preparing to take flight on KodeChirp.',
  };

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: `${config.title} | KodeChirp`,
      description: config.description,
    },
  };
}

export default function ComingSoonFeatureLayout({ children }) {
  return children;
}
