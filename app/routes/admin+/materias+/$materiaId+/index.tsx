import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary'
import { prisma } from '#app/utils/db.server'
import { MateriaEditor } from '../__materia-editor'

export { action } from '../__materia-editor.server'
export async function loader({ request, params }: LoaderFunctionArgs) {
	invariantResponse(params.materiaId, 'Not found', { status: 404 })
	const materia = await prisma.materia.findFirst({
		where: { id: params.materiaId },
	})
	invariantResponse(materia, 'Not found', { status: 404 })
	return json({ materia })
}

export default function () {
	const { materia } = useLoaderData<typeof loader>()
	return <MateriaEditor materia={materia} />
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>Não existe nehuma matéria com o id "{params.materiaId}"</p>
				),
			}}
		/>
	)
}
