/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React from "react";
import {useSnackbar} from "notistack";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Capability, MapManagementCommand, MapManagementMapEntry} from "./types";
import {
    exportMapManagementMap,
    fetchMapManagementList,
    importMapManagementMap,
    sendMapManagementCommand,
} from "./VacuumstreamerApiClient";

const MAP_MANAGEMENT_QUERY_KEY = "map_management_capability";

const useMapManagementErrorHandler = () => {
    const {enqueueSnackbar} = useSnackbar();
    return React.useCallback((error: any) => {
        let errorMessage = "";
        if (typeof error?.toString === "function") {
            errorMessage = error.toString();
        }
        if (typeof error?.response?.data === "string") {
            errorMessage = error.response.data;
        }
        enqueueSnackbar(`An error occurred while sending command to ${Capability.MapManagement}:\n${errorMessage}`, {
            preventDuplicate: true,
            variant: "error",
        });
    }, [enqueueSnackbar]);
};

export const useMapManagementListQuery = () => {
    return useQuery({
        queryKey: [MAP_MANAGEMENT_QUERY_KEY],
        queryFn: fetchMapManagementList,
        staleTime: 10_000,
    });
};

export const useMapManagementCommandMutation = () => {
    const queryClient = useQueryClient();
    const onError = useMapManagementErrorHandler();
    return useMutation({
        mutationFn: (command: MapManagementCommand) => {
            return sendMapManagementCommand(command).then(fetchMapManagementList);
        },
        onSuccess: (data) => {
            queryClient.setQueryData<MapManagementMapEntry[]>([MAP_MANAGEMENT_QUERY_KEY], data, {
                updatedAt: Date.now(),
            });
        },
        onError: onError,
    });
};

export const useMapManagementExportMutation = () => {
    const onError = useMapManagementErrorHandler();
    return useMutation({
        mutationFn: exportMapManagementMap,
        onError: onError,
    });
};

export const useMapManagementImportMutation = () => {
    const queryClient = useQueryClient();
    const onError = useMapManagementErrorHandler();
    return useMutation({
        mutationFn: (params: {file: File, name: string}) => {
            return importMapManagementMap(params).then(fetchMapManagementList);
        },
        onSuccess: (data) => {
            queryClient.setQueryData<MapManagementMapEntry[]>([MAP_MANAGEMENT_QUERY_KEY], data, {
                updatedAt: Date.now(),
            });
        },
        onError: onError,
    });
};
