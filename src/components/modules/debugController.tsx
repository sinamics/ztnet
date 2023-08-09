import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { python } from "@codemirror/lang-python";

interface Idata {
	data: unknown;
	title: string;
	isOpen?: () => void;
}

const DebugMirror = ({ data, title }: Idata) => {
	const [isOpen, setIsOpen] = useState(false);

	if (!data) return null;

	return (
		<div
			tabIndex={0}
			onClick={() => setIsOpen(!isOpen)}
			className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
		>
			<input type="checkbox" />
			<div className="collapse-title">{title}</div>
			<div className="collapse-content" style={{ width: "100%" }}>
				<CodeMirror
					tabIndex={0}
					value={JSON.stringify(data, null, 2)}
					maxHeight="1500px"
					width="100%"
					theme={okaidia}
					extensions={[python()]}
					basicSetup={{
						lineNumbers: true,
						highlightActiveLineGutter: false,
						highlightActiveLine: false,
					}}
				/>
			</div>
		</div>
	);
};

export default DebugMirror;
