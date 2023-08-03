import { useState, useEffect } from "react";
import React from "react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

interface IProp {
  central?: boolean;
}

const NetworkDescription = ({ central = false }: IProp) => {
  const t = useTranslations("networkById");
  const { query } = useRouter();
  const [state, setState] = useState({
    toggleDescriptionInput: false,
    description: "",
  });

  const {
    data: networkById,
    isLoading: loadingNetwork,
    error: errorNetwork,
    refetch: refetchNetwork,
  } = api.network.getNetworkById.useQuery({
    nwid: query.id as string,
    central,
  });

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      description: networkById?.network?.description,
      networkName: networkById?.network?.name,
    }));
  }, [networkById?.network?.description, networkById?.network?.name]);

  const { mutate: networkDescription } =
    api.network.networkDescription.useMutation();

  const toggleDescriptionInput = () => {
    setState({
      ...state,
      toggleDescriptionInput: !state.toggleDescriptionInput,
    });
  };
  const eventHandler = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };
  if (errorNetwork) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-center text-2xl font-semibold">
          {errorNetwork.message}
        </h1>
        <ul className="list-disc">
          <li>{t("errorSteps.step1")}</li>
          <li>{t("errorSteps.step2")}</li>
        </ul>
      </div>
    );
  }

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

  const { network } = networkById || {};
  return (
    <div className="py-3 font-light">
      {!state.toggleDescriptionInput ? (
        network?.description ? (
          <div
            onClick={toggleDescriptionInput}
            className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
            style={{ caretColor: "transparent" }}
          >
            {network?.description}
          </div>
        ) : (
          <div
            onClick={toggleDescriptionInput}
            className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
            style={{ caretColor: "transparent" }}
          >
            {t("addDescription")}
          </div>
        )
      ) : (
        <form>
          <textarea
            autoFocus
            rows={3}
            value={state?.description}
            name="description"
            onChange={eventHandler}
            maxLength={255}
            style={{ maxHeight: "100px" }}
            className="custom-scrollbar textarea textarea-primary w-full leading-snug "
            placeholder={t("descriptionPlaceholder")}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                // submit form when Enter key is pressed and Shift key is not held down.
                const target = e.target as HTMLTextAreaElement;
                networkDescription(
                  {
                    nwid: network.id,
                    central: true,
                    updateParams: { description: target.value },
                  },
                  {
                    onSuccess: () => {
                      void refetchNetwork();
                      setState({
                        ...state,
                        toggleDescriptionInput: !state.toggleDescriptionInput,
                      });
                    },
                  }
                );
              }
            }}
          ></textarea>
        </form>
      )}
    </div>
  );
};

export default NetworkDescription;
