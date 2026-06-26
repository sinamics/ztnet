import { useModalStore } from "~/utils/store";

interface Props {
	checked: boolean;
	deAuthorizeWarning: boolean;
	onAuthorize: (authorized: boolean) => void;
}

/**
 * Authorization checkbox. Owns the de-authorize confirmation flow (so the column
 * factory can stay stable); `onAuthorize` performs the actual mutation.
 */
export const AuthorizedCell = ({ checked, deAuthorizeWarning, onAuthorize }: Props) => {
	const callModal = useModalStore((state) => state.callModal);

	const handleChange = (authorized: boolean) => {
		if (deAuthorizeWarning && !authorized) {
			callModal({
				title: "Warning",
				description: "Are you sure you want to deauthorize this member?",
				yesAction: () => onAuthorize(authorized),
			});
			return;
		}
		onAuthorize(authorized);
	};

	return (
		<span className="flex items-center justify-center gap-2">
			<label className="label cursor-pointer justify-center">
				<input
					type="checkbox"
					checked={checked}
					onChange={(event) => handleChange(event.target.checked)}
					className="checkbox-success checkbox checkbox-xs sm:checkbox-sm"
				/>
			</label>
		</span>
	);
};
