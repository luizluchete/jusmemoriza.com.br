import { useSubmit, useSearchParams, Form } from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import { CheckboxField } from '#app/components/forms'
import { Combobox } from '#app/components/ui/combobox'
import { Icon } from '#app/components/ui/icon'
import { Label } from '#app/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#app/components/ui/radio-group'
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '#app/components/ui/sheet'

export function SheetFilterFlashcards({
	title,
	materias,
	leis,
	titulos,
	capitulos,
	artigos,
}: {
	title: string
	materias: { id: string; name: string }[]
	leis: { id: string; name: string }[]
	titulos: { id: string; name: string }[]
	capitulos: { id: string; name: string }[]
	artigos: { id: string; name: string }[]
}) {
	const formRef = useRef<HTMLFormElement>(null)
	const submit = useSubmit()
	const [searchParams] = useSearchParams()
	const searchFavorite = !!searchParams.get('favorite')
	const materiaId = searchParams.getAll('materiaId')
	const leiId = searchParams.getAll('leiId')
	const tituloId = searchParams.getAll('tituloId')
	const capituloId = searchParams.getAll('capituloId')
	const artigoId = searchParams.getAll('artigoId')
	const searchMaterias = materias.filter(({ id }) => materiaId.includes(id))

	const searchLeis = leis.filter(({ id }) => leiId.includes(id))

	const searchTitulos = titulos.filter(({ id }) => tituloId.includes(id))

	const searchCapitulos = capitulos.filter(({ id }) => capituloId.includes(id))

	const searchArtigos = artigos.filter(({ id }) => artigoId.includes(id))
	const [materiasSelected, setMateriasSelected] = useState(searchMaterias)
	const [leisSelected, setLeisSelected] = useState(searchLeis)
	const [titulosSelected, setTitulosSelected] = useState(searchTitulos)
	const [capitulosSelected, setCapitulosSelected] = useState(searchCapitulos)
	const [artigosSelected, setArtigosSelected] = useState(searchArtigos)

	useEffect(() => {
		if (formRef.current) {
			submit(formRef.current)
		}
	}, [
		materiasSelected,
		leisSelected,
		titulosSelected,
		capitulosSelected,
		artigosSelected,
		submit,
	])

	return (
		<Sheet>
			<SheetTrigger className="mb-1 flex w-full items-center justify-center rounded-md border border-primary py-1 text-primary hover:bg-primary/80 hover:text-primary-foreground">
				<Icon name="magnifying-glass" className="h-6 w-6" />
				<span>Filtros</span>
			</SheetTrigger>
			<SheetContent className="w-[400px] sm:w-[540px]">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>
				<Form
					className="flex flex-col space-y-1"
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
					{titulosSelected.map(({ id }) => (
						<input key={id} type="hidden" value={id} name="tituloId" />
					))}
					{capitulosSelected.map(({ id }) => (
						<input key={id} type="hidden" value={id} name="capituloId" />
					))}
					{artigosSelected.map(({ id }) => (
						<input key={id} type="hidden" value={id} name="artigoId" />
					))}
					<input
						type="hidden"
						defaultValue={searchParams.get('tipo') || ''}
						name="tipo"
					/>

					<Combobox
						placeholder="Matérias..."
						inputMessage='Buscar por "Matérias"'
						values={materias
							.filter(({ id }) => !materiasSelected.some(p => p.id === id))
							.map(({ id, name }) => ({
								label: name,
								id,
							}))}
						onSelect={(id, name) => {
							setMateriasSelected(prev => [...prev, { id, name }])
						}}
					/>
					<Combobox
						placeholder="Leis..."
						inputMessage='Buscar por "Leis"'
						values={leis
							.filter(({ id }) => !leisSelected.some(p => p.id === id))
							.map(({ id, name }) => ({
								label: name,
								id,
							}))}
						onSelect={(id, name) => {
							setLeisSelected(prev => [...prev, { id, name }])
						}}
					/>
					<Combobox
						placeholder="Títulos da Leis..."
						inputMessage='Buscar por "Títulos das Leis"'
						values={titulos
							.filter(({ id }) => !titulosSelected.some(p => p.id === id))
							.map(({ id, name }) => ({
								label: name,
								id,
							}))}
						onSelect={(id, name) => {
							setTitulosSelected(prev => [...prev, { id, name }])
						}}
					/>
					<Combobox
						placeholder="Capítulos..."
						inputMessage='Buscar por "Capítulos"'
						values={capitulos
							.filter(({ id }) => !capitulosSelected.some(p => p.id === id))
							.map(({ id, name }) => ({
								label: name,
								id,
							}))}
						onSelect={(id, name) => {
							setCapitulosSelected(prev => [...prev, { id, name }])
						}}
					/>
					<Combobox
						placeholder="Artigos..."
						inputMessage='Buscar por "Artigos"'
						values={artigos
							.filter(({ id }) => !artigosSelected.some(p => p.id === id))
							.map(({ id, name }) => ({
								label: name,
								id,
							}))}
						onSelect={(id, name) => {
							setArtigosSelected(prev => [...prev, { id, name }])
						}}
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
					<div>
						<span className="font-semibold">Listar: </span>
						<RadioGroup
							name="tipo"
							className="rounded-md border border-primary p-1"
							defaultValue={searchParams.get('tipo') || 'default'}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="default" id="default" />
								<Label htmlFor="default">Padrão</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="sabia" id="sabia" />
								<Label htmlFor="sabia">Sabia</Label>
							</div>

							<div className="flex items-center space-x-2">
								<RadioGroupItem value="duvida" id="duvida" />
								<Label htmlFor="duvida">Dúvida</Label>
							</div>

							<div className="flex items-center space-x-2">
								<RadioGroupItem value="nao_sabia" id="nao_sabia" />
								<Label htmlFor="nao_sabia">Não Sabia</Label>
							</div>
						</RadioGroup>
					</div>
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
						{titulosSelected.length ? (
							<FilteredItem
								name="Título: "
								items={titulosSelected}
								setItems={setTitulosSelected}
							/>
						) : null}
						{capitulosSelected.length ? (
							<FilteredItem
								name="Capítulo: "
								items={capitulosSelected}
								setItems={setCapitulosSelected}
							/>
						) : null}
						{artigosSelected.length ? (
							<FilteredItem
								name="Artigo: "
								items={artigosSelected}
								setItems={setArtigosSelected}
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
