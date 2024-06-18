import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	json,
	redirect,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { getUserImgSrc, useDoubleCheck, useIsPending } from '#app/utils/misc'

const MAX_SIZE = 1024 * 1024 * 3 // 3MB
const DeleteImageSchema = z.object({
	intent: z.literal('delete'),
})
const NewImageSchema = z.object({
	intent: z.literal('submit'),
	photoFile: z
		.instanceof(File)
		.refine(file => file.size > 0, 'Escolha uma imagem')
		.refine(file => file.size <= MAX_SIZE, 'A imagem deve ser menor que 3MB'),
})
const PhotoFormSchema = z.discriminatedUnion('intent', [
	DeleteImageSchema,
	NewImageSchema,
])

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			image: { select: { id: true } },
		},
	})
	invariantResponse(user, 'User not found', { status: 404 })
	return json({ user })
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)

	const submission = await parseWithZod(formData, {
		schema: PhotoFormSchema.transform(async data => {
			if (data.intent === 'delete') return { intent: 'delete' }
			if (data.photoFile.size <= 0) return z.NEVER
			return {
				intent: data.intent,
				image: {
					contentType: data.photoFile.type,
					blob: Buffer.from(await data.photoFile.arrayBuffer()),
				},
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { image, intent } = submission.value

	if (intent === 'delete') {
		await prisma.userImage.deleteMany({ where: { userId } })
		return redirect('/profile')
	}

	await prisma.$transaction(async $prisma => {
		await $prisma.userImage.deleteMany({ where: { userId } })
		await $prisma.user.update({
			where: { id: userId },
			data: { image: { create: image } },
		})
	})

	return redirect('/profile')
}

export default function () {
	const data = useLoaderData<typeof loader>()

	const doubleCheckDeleteImage = useDoubleCheck()

	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const [form, fields] = useForm({
		id: 'profile-photo',
		constraint: getZodConstraint(PhotoFormSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: PhotoFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})
	const isPending = useIsPending()
	const pendingIntent = isPending ? navigation.formData?.get('intent') : null
	const lastSubmissionIntent = fields.intent.value
	const [newImageSrc, setNewImageSrc] = useState<string | null>(null)
	return (
		<div>
			<Form
				method="POST"
				encType="multipart/form-data"
				className="flex flex-col items-center justify-center gap-10"
				onReset={() => setNewImageSrc(null)}
				{...getFormProps(form)}
			>
				<img
					src={
						newImageSrc ?? (data.user ? getUserImgSrc(data.user.image?.id) : '')
					}
					className="h-52 w-52 rounded-full object-cover"
					alt={data.user?.name ?? data.user?.id}
				/>
				<ErrorList errors={fields.photoFile.errors} id={fields.photoFile.id} />
				<div className="flex gap-4">
					{/*
						We're doing some kinda odd things to make it so this works well
						without JavaScript. Basically, we're using CSS to ensure the right
						buttons show up based on the input's "valid" state (whether or not
						an image has been selected). Progressive enhancement FTW!
					*/}
					<input
						{...getInputProps(fields.photoFile, { type: 'file' })}
						accept="image/*"
						className="peer sr-only"
						required
						tabIndex={newImageSrc ? -1 : 0}
						onChange={e => {
							const file = e.currentTarget.files?.[0]
							if (file) {
								const reader = new FileReader()
								reader.onload = event => {
									setNewImageSrc(event.target?.result?.toString() ?? null)
								}
								reader.readAsDataURL(file)
							}
						}}
					/>
					<Button
						asChild
						className="cursor-pointer peer-valid:hidden peer-focus-within:ring-2 peer-focus-visible:ring-2"
					>
						<label htmlFor={fields.photoFile.id}>
							<Icon name="pencil-1">Alterar</Icon>
						</label>
					</Button>
					<StatusButton
						name="intent"
						value="submit"
						type="submit"
						className="peer-invalid:hidden"
						status={
							pendingIntent === 'submit'
								? 'pending'
								: lastSubmissionIntent === 'submit'
									? form.status ?? 'idle'
									: 'idle'
						}
					>
						Salvar Foto
					</StatusButton>
					<Button
						variant="destructive"
						className="peer-invalid:hidden"
						{...form.reset.getButtonProps()}
					>
						<Icon name="trash">Cancelar</Icon>
					</Button>
					{data.user.image?.id ? (
						<StatusButton
							className="peer-valid:hidden"
							variant="destructive"
							{...doubleCheckDeleteImage.getButtonProps({
								type: 'submit',
								name: 'intent',
								value: 'delete',
							})}
							status={
								pendingIntent === 'delete'
									? 'pending'
									: lastSubmissionIntent === 'delete'
										? form.status ?? 'idle'
										: 'idle'
							}
						>
							<Icon name="trash">
								{doubleCheckDeleteImage.doubleCheck
									? 'Você tem certeza?'
									: 'Excluir'}
							</Icon>
						</StatusButton>
					) : null}
				</div>
				<ErrorList errors={form.errors} />
			</Form>
		</div>
	)
}
