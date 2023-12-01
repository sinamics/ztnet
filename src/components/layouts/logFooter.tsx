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
	const {
		data: organizationLogs,
		refetch: refetchLogs,
		isLoading: logsLoading,
	} = api.org.getLogs.useQuery({
		organizationId: orgId,
	});
	return (
		<>
			<button
				className={`fixed z-10 flex items-center justify-center flex-col text-6xl ${
					asideOpen ? "right-[calc(50%+1rem)]" : "right-[calc(42%+1rem)]"
				} ${
					logsOpen ? "bottom-[calc(350px/2+2.5rem)]" : "bottom-[0px]"
				} rounded-full p-2 shadow-md transition-all duration-150`}
				aria-label="Toggle logs"
				onClick={() => toggleLogs()}
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
				<p className="text-xs">LOG</p>
			</button>
			<div
				className={`absolute bg-base-200 shadow-md transition-all duration-150 ${
					sidebarOpen ? "left-64" : "left-0"
				} ${asideOpen ? "right-72" : "right-0"} ${
					logsOpen ? "bottom-0 h-52" : "bottom-0 h-0"
				} overflow-hidden`}
			>
				<div className="flex justify-between">
					<p>Last 100 Activity Logs</p>
					{logsLoading ? (
						<div className="flex items-center">
							<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
							<p>Fetching logs...</p>
						</div>
					) : (
						<button onClick={() => refetchLogs()}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
								className="w-6 h-6 mr-5"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
								/>
							</svg>
						</button>
					)}
				</div>
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
