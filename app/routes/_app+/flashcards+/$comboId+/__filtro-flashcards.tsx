import {
	useSubmit,
	useSearchParams,
	Form,
	useLoaderData,
} from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import { CheckboxField } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { MultiCombobox } from '#app/components/ui/multi-combobox'
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '#app/components/ui/sheet'
import { type loader } from './type.$type'

export function SheetFilterFlashcards({ title }: { title: string }) {
	const formRef = useRef<HTMLFormElement>(null)
	const submit = useSubmit()
	const { leis, materias } = useLoaderData<typeof loader>()

	const [searchParams] = useSearchParams()
	const searchFavorite = !!searchParams.get('favorite')
	const materiaId = searchParams.getAll('materiaId')
	const leiId = searchParams.getAll('leiId')
	const searchMaterias = materias.filter(({ id }) => materiaId.includes(id))
	const searchLeis = leis.filter(({ id }) => leiId.includes(id))
	const [materiasSelected, setMateriasSelected] = useState(searchMaterias)
	const [leisSelected, setLeisSelected] = useState(searchLeis)

	useEffect(() => {
		if (formRef.current) {
			submit(formRef.current)
		}
	}, [materiasSelected, leisSelected, submit])

	return (
		<Sheet>
			<SheetTrigger className="mb-1 flex w-full max-w-md items-center justify-center rounded-md border border-primary py-1 text-primary hover:bg-primary/80 hover:text-primary-foreground">
				<Icon name="magnifying-glass" className="h-6 w-6" />
				<span>Filtros</span>
			</SheetTrigger>
			<SheetContent className="w-[400px] overflow-auto sm:w-[540px]">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>
				<Form
					className="flex flex-col space-y-2"
					ref={formRef}
					id="search-flashcards"
					onChange={e => submit(e.currentTarget)}
				>
					{materiasSelected.map(({ id }) => (
						<input key={id} type="hidden" value={id} name="materiaId" />
					))}
					{leisSelected.map(({ id }) => (
						<input key={id} type="hidden" value={id} name="leiId" />
					))}

					<MultiCombobox
						placeholder="Matérias..."
						inputMessage='Buscar por "Matérias"'
						options={materias
							.filter(({ id }) => !materiasSelected.some(p => p.id === id))
							.map(({ id, name }) => ({
								label: name,
								id,
							}))}
					/>

					<CheckboxField
						labelProps={{
							children: 'Somente Favoritos ?',
						}}
						buttonProps={{
							defaultChecked: searchFavorite,
							form: 'search-quizzes-form',
							name: 'favorite',
							type: 'checkbox',
						}}
					/>
					<Button type="submit">Buscar</Button>
				</Form>
				<div className="mt-5">
					<h2 className="text-xl font-semibold">Filtrar por:</h2>
					<div className="flex flex-col space-y-1">
						{materiasSelected.length ? (
							<FilteredItem
								name="Matéria: "
								items={materiasSelected}
								setItems={setMateriasSelected}
							/>
						) : null}
						{leisSelected.length ? (
							<FilteredItem
								name="Lei: "
								items={leisSelected}
								setItems={setLeisSelected}
							/>
						) : null}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	)
}

function FilteredItem({
	items,
	setItems,
	name,
}: {
	items: { id: string; name: string }[]
	setItems: React.Dispatch<
		React.SetStateAction<
			{
				id: string
				name: string
			}[]
		>
	>
	name: string
}) {
	return (
		<div className="flex space-x-2 rounded-md  border p-1">
			<div className="flex items-center justify-center space-x-0.5 text-left">
				<div
					onClick={() => setItems([])}
					className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-primary p-1 text-primary"
				>
					<Icon name="x" className="h-20 w-20" />
				</div>
				<span className="font-semibold">{name}</span>
			</div>
			<div className="flex-start flex flex-col space-y-0.5">
				{items.map(({ id, name }) => (
					<div
						key={id}
						className="flex max-w-max items-center space-x-0.5 rounded-md bg-gray-50 px-1 py-0.5 text-[10px]"
					>
						<span>{name}</span>
						<button
							onClick={() => setItems(prev => prev.filter(p => p.id !== id))}
						>
							<div className="flex h-4 w-4 items-center justify-center rounded-full border border-primary p-1 text-primary">
								<Icon name="x" className="h-5 w-5" />
							</div>
						</button>
					</div>
				))}
			</div>
		</div>
	)
}
