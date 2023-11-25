import { api } from "~/utils/api";
import { useLogAsideStore } from "~/utils/store";
import CodeMirror from "@uiw/react-codemirror";
import { useRouter } from "next/router";
import { okaidia } from "@uiw/codemirror-theme-okaidia";

const formatLogsData = (logs) => {
	return logs
		?.map((log) => {
			const date = new Date(log.createdAt).toLocaleString();
			const action = log.action;
			const performedBy = log.performedBy.name;
			return `${log.id} ${date} - ${performedBy}- ${action}`;
		})
		.join("\n");
};

export const LogsFooter = ({ sidebarOpen, asideOpen }) => {
	const query = useRouter().query;
	const orgId = query.orgid as string;
	const { open: logsOpen, toggle: toggleLogs } = useLogAsideStore();
	const { data: organizationLogs } = api.org.getLogs.useQuery({
		orgId,
	});

	return (
		<>
			<button
				className={`fixed z-20 flex items-center justify-center text-6xl ${
					asideOpen ? "right-[calc(50%+1rem)]" : "right-[calc(42%+1rem)]"
				} ${
					logsOpen ? "bottom-[calc(350px/2+2.5rem)]" : "bottom-[0px]"
				} rounded-full p-2 shadow-md transition-all duration-150`}
				aria-label="Toggle logs"
				onClick={toggleLogs}
			>
				{logsOpen ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="1.5"
						stroke="currentColor"
						className="w-6 h-6 text-white"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M19.5 8.25l-7.5 7.5-7.5-7.5"
						/>
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="1.5"
						stroke="currentColor"
						className="w-6 h-6 text-white"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M4.5 15.75l7.5-7.5 7.5 7.5"
						/>
					</svg>
				)}
			</button>
			<div
				className={`absolute bg-base-200 shadow-md transition-all duration-150 ${
					sidebarOpen ? "left-64" : "left-0"
				} ${asideOpen ? "right-72" : "right-0"} ${
					logsOpen ? "bottom-0 h-52" : "bottom-0 h-0"
				} overflow-hidden`}
			>
				<p>User Activity Logs</p>
				<CodeMirror
					value={formatLogsData(organizationLogs)}
					maxHeight="210px"
					width="100%"
					className="custom-scrollbar custom-overflow"
					theme={okaidia}
					basicSetup={{
						lineNumbers: false,
						highlightActiveLineGutter: false,
						highlightActiveLine: false,
					}}
				/>
			</div>
		</>
	);
};
