import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
	unstable_parseMultipartFormData,
	unstable_createMemoryUploadHandler,
	redirect,
} from '@remix-run/node'
import {
	Form,
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
import { prisma } from '#app/utils/db.server'
import { useDoubleCheck, useIsPending, getComboImgSrc } from '#app/utils/misc'

const MAX_SIZE = 1024 * 1024 * 3 // 3MB

const DeleteImageSchema = z.object({
	intent: z.literal('delete'),
})

const NewImageSchema = z.object({
	intent: z.literal('submit'),
	image: z
		.instanceof(File)
		.refine(file => file.size > 0, 'Image is required')
		.refine(file => file.size <= MAX_SIZE, 'Image size must be less than 3MB'),
})

const ImageComboSchema = z.discriminatedUnion('intent', [
	DeleteImageSchema,
	NewImageSchema,
])

export async function loader({ params }: LoaderFunctionArgs) {
	const comboId = params.comboId
	invariantResponse(comboId, 'Combo not found', { status: 404 })
	const combo = await prisma.combo.findUnique({
		where: { id: comboId },
		select: {
			id: true,
			name: true,
			color: true,
			image: { select: { id: true } },
		},
	})
	invariantResponse(combo, 'Combo not found', { status: 404 })
	return json({ combo })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const comboId = params.comboId
	invariantResponse(comboId, 'Combo not found', { status: 404 })
	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)

	const submission = await parseWithZod(formData, {
		schema: ImageComboSchema.transform(async data => {
			if (data.intent === 'delete') return { intent: 'delete' }
			if (data.image.size <= 0) return z.NEVER
			return {
				intent: data.intent,
				image: {
					contentType: data.image.type,
					blob: Buffer.from(await data.image.arrayBuffer()),
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
		await prisma.comboImage.deleteMany({ where: { comboId } })
		return redirect(`/admin/combos/${comboId}`)
	}

	await prisma.$transaction(async $prisma => {
		await $prisma.comboImage.deleteMany({ where: { comboId } })
		await $prisma.combo.update({
			where: { id: comboId },
			data: { image: { create: image } },
		})
	})

	return redirect(`/admin/combos/${comboId}`)
}

export default function ImageComboRoute() {
	const data = useLoaderData<typeof loader>()

	const doubleCheckDeleteImage = useDoubleCheck()

	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const [form, fields] = useForm({
		id: 'combo-image',
		constraint: getZodConstraint(ImageComboSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ImageComboSchema })
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
				<div
					className="flex h-24 w-24 items-center justify-center rounded-full p-4"
					style={{ backgroundColor: data.combo.color ?? 'gray' }}
				>
					<img
						src={
							newImageSrc ??
							(data.combo ? getComboImgSrc(data.combo.image?.id) : '')
						}
						className="h-full w-full rounded-full object-cover"
						alt={data.combo?.name ?? data.combo?.id}
					/>
				</div>

				<ErrorList errors={fields.image.errors} id={fields.image.id} />
				<div className="flex gap-4">
					{/*
						We're doing some kinda odd things to make it so this works well
						without JavaScript. Basically, we're using CSS to ensure the right
						buttons show up based on the input's "valid" state (whether or not
						an image has been selected). Progressive enhancement FTW!
					*/}
					<input
						{...getInputProps(fields.image, { type: 'file' })}
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
						<label htmlFor={fields.image.id}>
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
						Salvar
					</StatusButton>
					<Button
						variant="destructive"
						className="peer-invalid:hidden"
						{...form.reset.getButtonProps()}
					>
						<Icon name="trash">Resetar</Icon>
					</Button>
					{data.combo.image?.id ? (
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
									? 'Tem certeza?'
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
