import { type LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { ProductEditor } from './__product-editor'
export async function loader({ request }: LoaderFunctionArgs) {
	const combos = await prisma.combo.findMany({
		select: { id: true, name: true },
	})
	return json({ combos })
}
export { action } from './__product-editor.server'

export default function New() {
	return <ProductEditor />
}
