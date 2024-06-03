import React, { useState } from 'react'
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
	values: { label: string; id: string }[]
	onSelect: (id: string, label: string) => void
	placeholder?: string
	notFoundMessage?: string
	inputMessage?: string
}
export function Combobox({
	values,
	onSelect,
	placeholder,
	notFoundMessage,
	inputMessage,
}: ComboBoxProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="h-9 w-full justify-between"
					>
						{placeholder || 'Selecione ...'}
						<Icon
							name="arrow-down"
							className="ml-2 h-4 w-4 shrink-0 opacity-50"
						/>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-full">
					<Command>
						<CommandInput placeholder={inputMessage || 'Buscar'} />
						<CommandEmpty>{notFoundMessage || 'Nada encontrado'}</CommandEmpty>
						<CommandList>
							<CommandGroup>
								{values.map(item => (
									<CommandItem
										key={item.id}
										value={item.label}
										onSelect={currentValue => {
											setOpen(false)
											onSelect(item.id, item.label)
										}}
									>
										{item.label}
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
