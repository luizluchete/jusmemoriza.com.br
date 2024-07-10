import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { json, useLoaderData, useNavigate } from '@remix-run/react'
import { TextareaField } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '#app/components/ui/dialog'
import { Label } from '#app/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const materiaId = url.searchParams.get('materiaId')
	const materias = await prisma.materia.findMany({
		select: { id: true, name: true },
		where: { status: true },
		orderBy: { name: 'asc' },
	})
	const leis = materiaId
		? await prisma.lei.findMany({
				select: { id: true, name: true },
				where: { status: true, materiaId },
				orderBy: { name: 'asc' },
			})
		: []
	return json({ materias, leis })
}

export async function action({ request }: ActionFunctionArgs) {
	return json({})
}

export default function New() {
	const { materias, leis } = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const back = () => navigate('..')
	return (
		<Dialog defaultOpen onOpenChange={back}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Criar Flashcard</DialogTitle>
					<DialogDescription>
						Aqui você pode criar seus próprios flashcards
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="flex flex-col space-y-1">
						<Label htmlFor="materia" className="text-left">
							Matéria
						</Label>
						<Select>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Matéria" />
							</SelectTrigger>
							<SelectContent>
								{materias.map(({ id, name }) => (
									<SelectItem key={id} value={id}>
										{name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col space-y-1">
						<Label htmlFor="lei" className="text-left">
							Lei
						</Label>
						<Select>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Lei" />
							</SelectTrigger>
							<SelectContent>
								{leis.map(({ id, name }) => (
									<SelectItem key={id} value={id}>
										{name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col space-y-1">
						<Label htmlFor="frente" className="text-left">
							Frente
						</Label>
						<TextareaField
							className="col-span-3"
							labelProps={{}}
							textareaProps={{}}
							errors={null}
						/>
					</div>
					<div className="flex flex-col space-y-1">
						<Label htmlFor="verso" className="text-left">
							Verso
						</Label>
						<TextareaField
							className="col-span-3"
							labelProps={{}}
							textareaProps={{}}
							errors={null}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button type="submit">Criar flashcard</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
