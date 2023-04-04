import { useRouter } from "next/router";
import { type ChangeEvent, useState } from "react";
import { toast } from "react-hot-toast";
import { type CustomError } from "~/types/errorHandling";
import { type RoutesEntity } from "~/types/network";
import { api } from "~/utils/api";

export const NettworkSettings = () => {
  const [showRouteInput, setShowRouteInput] = useState<boolean>(false);
  const [routeInput, setRouteInput] = useState<RoutesEntity>();

  const { query } = useRouter();
  const {
    data: networkByIdQuery,
    isLoading,
    refetch: refecthNetworkById,
  } = api.network.getNetworkById.useQuery(
    {
      nwid: query.id as string,
    },
    { enabled: !!query.id }
  );

  const { mutate: updateNetworkMutation, isLoading: isUpdating } =
    api.network.updateNetwork.useMutation({
      onError: ({ shape }: CustomError) => {
        void toast.error(shape?.data?.zodError?.fieldErrors?.updateParams);
      },
    });

  const deleteRoute = (route: RoutesEntity) => {
    const _routes = [...network?.routes];
    const newRouteArr = _routes.filter((r) => r.target !== route.target);

    updateNetworkMutation(
      {
        updateParams: { routes: [...newRouteArr] },
        nwid: query.id as string,
      },
      { onSuccess: void refecthNetworkById() }
    );
  };
  const routeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    setRouteInput({
      ...routeInput,
      [event.target.name]: event.target.value,
    });
  };

  const submitHandler = () => {
    updateNetworkMutation({
      updateParams: { routes: [...network?.routes, { ...routeInput }] },
      nwid: query.id as string,
    });
  };
  const { network } = networkByIdQuery;
  if (isLoading) return <div>Loading</div>;

  return (
    <div>
      <div>Managed Routes</div>
      <div className="grid grid-cols-1 ">
        {network?.routes.map((route) => {
          return (
            <div
              key={route.target}
              className="flex items-center justify-between space-y-1"
            >
              <div
                key={route.target}
                className="text-xs opacity-30 md:text-base"
              >
                {route.target} via {route.via ? route.via : "LAN"}
              </div>
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-5 w-5 cursor-pointer hover:text-primary "
                  onClick={() => !isUpdating && deleteRoute(route)}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
      {showRouteInput ? (
        <div className="relative my-5 flex">
          <input
            type="text"
            name="target"
            onChange={routeHandler}
            placeholder="10.11.12.0/24"
            className="input-bordered input-primary input input-xs w-3/6 rounded-md"
          />
          <div className="px-4">via</div>
          <input
            type="text"
            name="via"
            onChange={routeHandler}
            placeholder="192.168.168.1"
            className="input-bordered input-primary input input-xs w-3/6 rounded-md"
          />
          <button
            onClick={submitHandler}
            className="btn-success btn-xs btn ml-4 rounded-md"
          >
            Add
          </button>
          <button
            onClick={() => setShowRouteInput(!showRouteInput)}
            className="btn-outline btn-xs btn ml-4 rounded-md"
          >
            Cancle
          </button>
        </div>
      ) : null}
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="mt-2 h-6 w-6 cursor-pointer  rounded-md border text-primary"
          onClick={() => setShowRouteInput(!showRouteInput)}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </div>
    </div>
  );
};
