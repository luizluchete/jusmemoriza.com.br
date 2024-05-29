import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { CargoEditor } from './__cargo-editor'

export async function loader({ params }: LoaderFunctionArgs) {
	const cargoId = params.cargoId
	invariantResponse(cargoId, 'Not found', { status: 404 })
	const cargo = await prisma.cargo.findFirst({ where: { id: cargoId } })
	invariantResponse(cargo, 'Not found', { status: 404 })
	return json({ cargo })
}
export { action } from './__cargo-editor.server'

export default function () {
	const { cargo } = useLoaderData<typeof loader>()
	return <CargoEditor cargo={cargo} />
}
