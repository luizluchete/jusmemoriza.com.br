import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server.js'
import { LeiEditor } from './__lei-editor'

export { action } from './__lei-editor.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const leiId = params.leiId
	invariantResponse(leiId, 'Not found', { status: 404 })
	const lei = await prisma.lei.findFirst({ where: { id: leiId } })
	invariantResponse(lei, 'Not found', { status: 404 })
	return json({ lei })
}
export default function () {
	const { lei } = useLoaderData<typeof loader>()
	return <LeiEditor lei={lei} />
}
