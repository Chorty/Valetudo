import React from "react";
import {Route} from "react-router";

const MapManagementCapabilityPage = React.lazy(() => import("./capabilities/MapManagementCapability"));
const VideoStreamCapabilityPage = React.lazy(() => import("./capabilities/VideoStreamCapability"));

export const vacuumstreamerRoutes = (
    <>
        <Route path={"map_management_capability"} element={<MapManagementCapabilityPage/>}/>
        <Route path={"video_stream_capability"} element={<VideoStreamCapabilityPage/>}/>
    </>
);
