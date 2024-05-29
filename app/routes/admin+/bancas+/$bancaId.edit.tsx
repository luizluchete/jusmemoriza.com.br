import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server'
import { BancaEditor } from './__banca-editor'

export { action } from './__banca-editor.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const bancaId = params.bancaId
	invariantResponse(bancaId, 'Not found', { status: 404 })
	const banca = await prisma.banca.findFirst({ where: { id: bancaId } })
	invariantResponse(banca, 'Not found', { status: 404 })
	return json({ banca })
}

export default function () {
	const { banca } = useLoaderData<typeof loader>()
	return <BancaEditor banca={banca} />
}
