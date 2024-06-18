import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, useFetcher, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { getUserImgSrc } from '#app/utils/misc'
import { NameSchema } from '#app/utils/user-validation'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			image: {
				select: { id: true },
			},
		},
	})

	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})
	return json({
		user,
		hasPassword: Boolean(password),
	})
}

const profileUpdateActionIntent = 'update-profile'
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	switch (intent) {
		case profileUpdateActionIntent: {
			return profileUpdateAction({ request, userId, formData })
		}

		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}
export default function () {
	const data = useLoaderData<typeof loader>()
	return (
		<div className="flex flex-col gap-12">
			<div className="flex justify-center">
				<div className="relative h-52 w-52">
					<img
						src={getUserImgSrc(data.user.image?.id)}
						alt={data.user.email}
						className="h-full w-full rounded-full object-cover"
					/>
					<Button
						asChild
						variant="outline"
						className="absolute -right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full p-0"
					>
						<Link
							preventScrollReset
							to="photo"
							title="Change profile photo"
							aria-label="Change profile photo"
						>
							<Icon name="camera" className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			</div>
			<UpdateProfile />
			<div className="col-span-6 my-6 h-1 border-b-[1.5px] border-foreground" />
			<div className="col-span-full flex flex-col gap-6">
				<div>
					<Link to={data.hasPassword ? 'password' : 'password/create'}>
						<Icon name="dots-horizontal">
							{data.hasPassword ? 'Alterar Senha' : 'Criar uma senha'}
						</Icon>
					</Link>
				</div>
			</div>
		</div>
	)
}

const ProfileFormSchema = z.object({
	name: NameSchema,
})
async function profileUpdateAction({ userId, formData }: ProfileActionArgs) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ProfileFormSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const data = submission.value

	await prisma.user.update({
		select: { name: true },
		where: { id: userId },
		data: {
			name: data.name,
		},
	})

	return json({
		result: submission.reply(),
	})
}

type ProfileActionArgs = {
	request: Request
	userId: string
	formData: FormData
}
function UpdateProfile() {
	const data = useLoaderData<typeof loader>()

	const fetcher = useFetcher<typeof profileUpdateAction>()

	const [form, fields] = useForm({
		id: 'edit-profile',
		constraint: getZodConstraint(ProfileFormSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProfileFormSchema })
		},
		defaultValue: {
			name: data.user.name,
		},
	})

	return (
		<fetcher.Form method="POST" {...getFormProps(form)}>
			<div className="grid grid-cols-6 gap-x-10">
				<Field
					className="col-span-3"
					labelProps={{ htmlFor: fields.name.id, children: 'Nome' }}
					inputProps={getInputProps(fields.name, { type: 'text' })}
					errors={fields.name.errors}
				/>
			</div>

			<ErrorList errors={form.errors} id={form.errorId} />

			<div className="mt-8 flex justify-center">
				<StatusButton
					type="submit"
					size="wide"
					name="intent"
					value={profileUpdateActionIntent}
					status={fetcher.state !== 'idle' ? 'pending' : form.status ?? 'idle'}
				>
					Salvar alterações
				</StatusButton>
			</div>
		</fetcher.Form>
	)
}
