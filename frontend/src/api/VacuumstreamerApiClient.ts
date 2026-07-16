import {Capability, MapManagementCommand, MapManagementMapEntry} from "./types";
import {valetudoAPI} from "./client";

export const fetchMapManagementList = async (): Promise<MapManagementMapEntry[]> => {
    return valetudoAPI
        .get<MapManagementMapEntry[]>(`/robot/capabilities/${Capability.MapManagement}`)
        .then(({data}) => {
            return data;
        });
};

export const sendMapManagementCommand = async (command: MapManagementCommand): Promise<void> => {
    await valetudoAPI.put(`/robot/capabilities/${Capability.MapManagement}`, command);
};

export const exportMapManagementMap = async (id: string): Promise<void> => {
    const response = await valetudoAPI.get(
        `/robot/capabilities/${Capability.MapManagement}/export/${id}`,
        {responseType: "blob"}
    );
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `map_${id}.tar.gz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const importMapManagementMap = async (params: {file: File, name: string}): Promise<void> => {
    await valetudoAPI.post(
        `/robot/capabilities/${Capability.MapManagement}/import?name=${encodeURIComponent(params.name)}`,
        params.file,
        {headers: {"Content-Type": "application/octet-stream"}}
    );
};
