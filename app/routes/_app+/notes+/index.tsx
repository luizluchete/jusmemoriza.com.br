import { type LoaderFunctionArgs, json } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
	return json({})
}
export default function Index() {
	return (
		<div>
			<h1>notes</h1>
		</div>
	)
}
