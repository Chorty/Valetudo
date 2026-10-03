import {Capability, MapManagementCommand, MapManagementMapEntry, VideoStreamCommand, VideoStreamStatus} from "./types";
import {valetudoAPI, valetudoAPIBaseURL} from "./client";

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

export const fetchVideoStreamStatus = async (): Promise<VideoStreamStatus> => {
    return valetudoAPI
        .get<VideoStreamStatus>(`/robot/capabilities/${Capability.VideoStream}`)
        .then(({data}) => {
            return data;
        });
};

export const sendVideoStreamCommand = async (command: VideoStreamCommand): Promise<void> => {
    await valetudoAPI.put(`/robot/capabilities/${Capability.VideoStream}`, command);
};

/**
 * Live video relayed by Valetudo from go2rtc, so the browser only needs Valetudo's login.
 * The browser's cached Basic Auth credentials apply to this same-origin media request.
 *
 * @param {"hls" | "mp4"} format "hls" for browsers with native HLS (Safari, iOS), "mp4" for the rest
 */
export const videoStreamPlaybackURL = (format: "hls" | "mp4"): string => {
    return `${valetudoAPIBaseURL}/robot/capabilities/${Capability.VideoStream}/${format === "hls" ? "live.m3u8" : "live.mp4"}`;
};
