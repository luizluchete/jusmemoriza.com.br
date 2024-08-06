import { type LoaderFunctionArgs } from '@remix-run/node'
import { pdfQuiz } from './pdf.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const pdf = await pdfQuiz()
	return new Response(pdf, {
		status: 200,
		headers: { 'Content-Type': 'application/pdf' },
	})
}
