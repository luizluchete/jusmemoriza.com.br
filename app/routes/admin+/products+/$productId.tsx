import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { ProductEditor } from './__product-editor'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const productId = params.productId
	const product = await prisma.product.findUnique({
		select: {
			id: true,
			name: true,
			hotmartLink: true,
			productIdHotmart: true,
			description: true,
		},
		where: { id: productId },
	})
	invariantResponse(product, 'Product Not found', { status: 404 })
	const combos = await prisma.combo.findMany({
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
	})
	return json({ product, combos })
}

export { action } from './__product-editor.server'

export default function ProductId() {
	const { product, combos } = useLoaderData<typeof loader>()
	return <ProductEditor product={product} combos={combos} />
}
