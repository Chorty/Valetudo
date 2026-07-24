import React from "react";
import {Route} from "react-router";

const MapManagementCapabilityPage = React.lazy(() => import("./capabilities/MapManagementCapability"));

export const vacuumstreamerRoutes = (
    <Route path={"map_management_capability"} element={<MapManagementCapabilityPage/>}/>
);
