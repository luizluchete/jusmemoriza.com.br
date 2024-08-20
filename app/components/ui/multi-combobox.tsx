'use client'
import React, { useState } from 'react'
import { cn } from '#app/utils/misc'
import { Button } from './button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from './command'
import { Icon } from './icon'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

type ComboBoxProps = {
	options?: { label: string; id: string }[]
	side?: 'top' | 'bottom'
	selectedValues?: { label: string; id: string }[]
	placeholder?: string
	notFoundMessage?: string
	name?: string
	icon?: React.ReactNode
	setSelectedValues?: React.Dispatch<
		React.SetStateAction<
			{
				id: string
				label: string
			}[]
		>
	>
}
export function MultiCombobox({
	name,
	options = [],
	icon,
	placeholder,
	notFoundMessage,
	selectedValues = [],
	setSelectedValues,
	side = 'bottom',
}: ComboBoxProps) {
	const [open, setOpen] = useState(false)

	function onSelect(id: string, label: string) {
		if (setSelectedValues) {
			setSelectedValues(prevSelected => {
				const isSelected = prevSelected.find(item => item.id === id)
				if (isSelected) {
					return prevSelected.filter(item => item.id !== id)
				}
				return [...prevSelected, { id, label }]
			})
		}
	}

	return (
		<>
			{selectedValues.map(({ id }) => (
				<input key={id} type="hidden" hidden value={id} name={name} />
			))}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="h-9 w-full justify-between"
					>
						<div className="flex w-full items-center justify-between">
							<div className="flex space-x-2">
								{icon ? icon : null}
								<span className="text-ellipsis text-nowrap">
									{placeholder || 'Selecione ...'}
								</span>{' '}
							</div>

							{selectedValues.length > 0 ? (
								<span className="text-ellipsis text-nowrap text-xs opacity-50">
									{selectedValues.length} selecionado
								</span>
							) : null}
						</div>

						<Icon
							name="arrow-down"
							className="ml-2 h-4 w-4 shrink-0 opacity-50"
						/>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-full" side={side}>
					<Command>
						<CommandInput
							placeholder="Busca rápida"
							onChangeCapture={e => e.stopPropagation()}
						/>
						<CommandEmpty>{notFoundMessage || 'Nada encontrado'}</CommandEmpty>
						<CommandList>
							<CommandGroup>
								{options.map(item => (
									<CommandItem
										className="cursor-pointer"
										key={item.id}
										value={item.label}
										onSelect={currentValue => {
											onSelect(item.id, item.label)
										}}
									>
										<div className="flex space-x-2">
											<div className="flex h-5 w-5 items-center justify-center rounded-sm border border-primary shadow-sm hover:shadow-2xl">
												<Icon
													name="check"
													className={cn(
														'h-4 w-4',
														selectedValues.find(({ id }) => id === item.id)
															? 'opacity-100'
															: 'opacity-0',
													)}
												/>
											</div>
											<span className="text-wrap opacity-80">{item.label}</span>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</>
	)
}
