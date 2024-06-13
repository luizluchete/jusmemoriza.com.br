import { parseWithZod } from '@conform-to/zod'
import { json, type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server'
import { redirectWithToast } from '#app/utils/toast.server'
import { bancaSchemaEditor } from './__banca-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = await parseWithZod(formData, { schema: bancaSchemaEditor.superRefine(
		async (data,ctx) => {
			const exists = await prisma.banca.findFirst({where:{name:{equals:data.nome, mode: 'insensitive'}, id:{not:{equals:data.id}}}})
			if(exists){
				ctx.addIssue({
					path:['nome'],
					code:z.ZodIssueCode.custom,
					message:'Já existe uma banca com esse nome'
				})
			}


	}),async:true })

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { nome, id, status } = submission.value
	await prisma.banca.upsert({
		where: { id: id ?? '__new__' },
		create: {
			name: nome,
			status: status ?? false,
		},
		update: {
			name: nome,
			status: status ?? false,
		},
	})
	return redirectWithToast(`/admin/bancas`, {
		type: 'success',
		description: `Banca ${id ? 'atualizada' : 'criada'} com sucesso`,
	})
}
