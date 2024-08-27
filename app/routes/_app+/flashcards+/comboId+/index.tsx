import { type LoaderFunctionArgs, redirect } from '@remix-run/node'

export function loader({ params }: LoaderFunctionArgs) {
	const comboId = params.comboId
	return redirect(`/flashcards/${comboId}/type/initial`)
}
