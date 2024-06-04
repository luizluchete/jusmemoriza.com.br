import { type MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'
import { Button } from '#app/components/ui/button'

export const meta: MetaFunction = () => [{ title: 'JusMemoriza' }]

export default function Index() {
	return (
		<main className="font-poppins grid h-full place-items-center">
			<h1 className="text-4xl font-bold">JusMemoriza</h1>
			<Button asChild variant="default" size="lg">
				<Link to="/login">Entrar</Link>
			</Button>
		</main>
	)
}
