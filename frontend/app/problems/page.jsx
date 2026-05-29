import { redirect } from 'next/navigation';

// Redirect old /problems list URL to /questions
export default function ProblemsRedirectPage() {
  redirect('/questions');
}
