import 'react-quill/dist/quill.snow.css'
import { useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import { ErrorList, type ListOfErrors } from './forms'

const toolBarOptions = {
	toolbar: [
		[{ header: [1, 2, 3, 4, 5, 6, false] }],
		[{ size: [] }],
		['bold', 'italic', 'underline', 'strike', 'blockquote'],
		[{ color: [] }, { background: [] }],
		[
			{ list: 'ordered' },
			{ list: 'bullet' },
			{ indent: '-1' },
			{ indent: '+1' },
		],
		['clean'],
	],
}

type Props = {
	inputProps: Omit<JSX.IntrinsicElements['input'], 'className'>
	label?: string
	errors?: ListOfErrors
}
export function RichText({ errors, label, inputProps }: Props) {
	const [text, setText] = useState(inputProps.defaultValue || '')
	const customInputRef = useRef<ReactQuill>(null)

	return (
		<div>
			<input
				onFocus={() => {
					customInputRef.current?.focus()
				}}
				hidden
				id={inputProps.id}
				value={text}
				name={inputProps.name}
				onChange={e => setText(e.target.value)}
			/>
			{label && <label htmlFor={inputProps.name}>{label}</label>}
			<ReactQuill
				theme="snow"
				className="bg-white "
				modules={toolBarOptions}
				value={Array.isArray(text) ? text.join('') : text.toString()}
				ref={customInputRef}
				onChange={setText}
			/>
			{errors ? (
				<div className="px-1 pb-3 pt-1 text-red-500">
					<ErrorList errors={errors} />
				</div>
			) : null}
		</div>
	)
}
