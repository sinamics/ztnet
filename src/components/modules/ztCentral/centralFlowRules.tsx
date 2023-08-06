import { toast } from "react-hot-toast";
import { api } from "~/utils/api";
import CodeMirror from "@uiw/react-codemirror";
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { classname } from "@uiw/codemirror-extensions-classname";
import { python } from "@codemirror/lang-python";
import { useEffect, useState } from "react";
import { EditorView } from "@codemirror/view";
// import { useDebounce } from "usehooks-ts";
import { type CustomBackendError } from "~/types/errorHandling";
import { useRouter } from "next/router";

interface IProp {
  central?: boolean;
}

const initialErrorState = { error: null, line: null };
export const CentralFlowRules = ({ central = true }: IProp) => {
  const { query } = useRouter();

  const {
    data: defaultFlowRoute,
    // isLoading,
    mutate: fetchFlowRoute,
  } = api.network.getFlowRule.useMutation();

  // Local state to store changes to the flow route
  const {
    data: networkById,
    isLoading: loadingNetwork,
    error: errorNetwork,
    refetch: refetchNetworkById,
  } = api.network.getNetworkById.useQuery({
    nwid: query.id as string,
    central,
  });

  const [flowRoute, setFlowRoute] = useState(networkById?.network?.rulesSource);
  const [ruleError, setRuleError] = useState(initialErrorState);
  // const debouncedFlowRoute = useDebounce(flowRoute, 500);

  const { mutate: updateFlowRoute } = api.network.setFlowRule.useMutation({
    onSuccess: () => {
      void refetchNetworkById();
      void toast.success("Flow rules updated successfully");
    },
    onError: ({ message }) => {
      try {
        const err = JSON.parse(message) as CustomBackendError;
        setRuleError({ error: err.error, line: err.line });
        void toast.error(err.error);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    },
  });

  useEffect(() => {
    setFlowRoute(defaultFlowRoute);
  }, [defaultFlowRoute]);

  useEffect(() => {
    setFlowRoute(networkById?.network?.rulesSource);
  }, [networkById?.network?.rulesSource]);

  // Handle changes in CodeMirror
  const handleFlowRouteChange = (value: string) => {
    setFlowRoute(value);
    setRuleError(initialErrorState);
    // debouncedUpdateFlowRoute();
  };
  // Reset the flow route to the default value
  const handleReset = () => {
    fetchFlowRoute({
      nwid: query.id as string,
      central,
    });
    setRuleError(initialErrorState);
  };
  const classnameExt = classname({
    add: (lineNumber) => {
      if (lineNumber === ruleError.line) {
        return "first-line";
      }
    },
  });
  const errorColorTheme = EditorView.baseTheme({
    "&dark .first-line": { backgroundColor: "#AB2204" },
    "&light .first-line": { backgroundColor: "#AB2204" },
  });

  if (loadingNetwork) {
    // add loading progress bar to center of page, vertially and horizontally
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-center text-2xl font-semibold">
          <progress className="progress progress-primary w-56"></progress>
        </h1>
      </div>
    );
  }
  if (errorNetwork) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-center text-2xl font-semibold">
          {errorNetwork.message}
        </h1>
      </div>
    );
  }
  return (
    <div
      tabIndex={0}
      className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
    >
      <input type="checkbox" />
      <div className="collapse-title">Flow Rules</div>
      <div className="collapse-content" style={{ width: "100%" }}>
        <CodeMirror
          tabIndex={0}
          value={flowRoute}
          onChange={handleFlowRouteChange}
          maxHeight="1500px"
          width="100%"
          theme={okaidia}
          extensions={[python(), errorColorTheme, classnameExt]}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: false,
            highlightActiveLine: false,
          }}
        />
        <div className="space-x-4">
          <button
            onClick={() =>
              void updateFlowRoute({
                central,
                nwid: query.id as string,
                updateParams: {
                  flowRoute: flowRoute || "#",
                },
              })
            }
            className="btn my-3 bg-base-300"
          >
            Save Changes
          </button>
          <button
            onClick={() => handleReset()}
            className="btn btn-outline my-3 "
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
