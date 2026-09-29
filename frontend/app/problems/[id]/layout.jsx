export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id || 'Challenge';

  const formattedTitle = rawId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    title: formattedTitle,
    description: `Solve ${formattedTitle} on KodeChirp. Analyze constraints, verify invariants, and test solutions in isolated execution sandboxes.`,
    openGraph: {
      title: `${formattedTitle} | KodeChirp`,
      description: `Solve ${formattedTitle} on KodeChirp. Analyze constraints, verify invariants, and test solutions in isolated execution sandboxes.`,
    },
  };
}

export default function ProblemDetailLayout({ children }) {
  return children;
}
