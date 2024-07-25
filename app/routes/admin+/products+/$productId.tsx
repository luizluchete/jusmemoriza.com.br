import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useParams } from '@remix-run/react'

export async function loader({ request }: LoaderFunctionArgs) {
	return json({})
}

export default function ProductId() {
	const { productId } = useParams()
	return (
		<div>
			<h1>productId - {productId}</h1>
		</div>
	)
}
