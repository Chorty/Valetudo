import React from "react";
import {Route} from "react-router";
import MapManagementCapabilityPage from "./capabilities/MapManagementCapability";

export const vacuumstreamerRoutes = (
    <Route path={"map_management_capability"} element={<MapManagementCapabilityPage/>}/>
);
