import { Form } from '@remix-run/react'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useIsPending } from './misc.tsx'

export const GOOGLE_PROVIDER_NAME = 'google'
// to add another provider, set their name here and add it to the providerNames below

export const providerNames = [GOOGLE_PROVIDER_NAME] as const
export const ProviderNameSchema = z.enum(providerNames)
export type ProviderName = z.infer<typeof ProviderNameSchema>

export const providerLabels: Record<ProviderName, string> = {
	[GOOGLE_PROVIDER_NAME]: 'Google',
} as const

export const providerIcons: Record<ProviderName, React.ReactNode> = {
	[GOOGLE_PROVIDER_NAME]: <Icon name="google-logo" />,
} as const

export function ProviderConnectionForm({
	redirectTo,
	type,
	providerName,
}: {
	redirectTo?: string | null
	type: 'Connect' | 'Login' | 'Cadastro'
	providerName: ProviderName
}) {
	const label = providerLabels[providerName]
	const formAction = `/auth/${providerName}`
	const isPending = useIsPending({ formAction })
	return (
		<Form
			className="flex items-center justify-center gap-2"
			action={formAction}
			method="POST"
		>
			{redirectTo ? (
				<input type="hidden" name="redirectTo" value={redirectTo} />
			) : null}
			<StatusButton
				type="submit"
				className="w-full"
				status={isPending ? 'pending' : 'idle'}
			>
				<span className="inline-flex items-center gap-1.5">
					{providerIcons[providerName]}
					<span>
						{type} com {label}
					</span>
				</span>
			</StatusButton>
		</Form>
	)
}
