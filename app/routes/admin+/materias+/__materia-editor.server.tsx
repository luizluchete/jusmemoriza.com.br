import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.js'
import { redirectWithToast } from '#app/utils/toast.server.js'
import { materiaSchemaEditor } from './__materia-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: materiaSchemaEditor })
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { nome, cor, id, status } = submission.value
	const materia = await prisma.materia.upsert({
		where: { id: id ?? '__new__' },
		create: {
			name: nome,
			color: cor,
			status: status ?? false,
		},
		update: {
			name: nome,
			color: cor,
			status: status ?? false,
		},
	})
	return redirectWithToast(`/admin/materias/${materia.id}`, {
		type: 'success',
		description: `Matéria ${id ? 'atualizada' : 'criada'} com sucesso`,
	})
}
