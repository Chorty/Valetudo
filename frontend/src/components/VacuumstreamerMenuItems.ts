import {Layers as FloorManagementIcon} from "@mui/icons-material";
import {Capability} from "../api";

export const vacuumstreamerMenuItems = [
    {
        kind: "MenuEntry" as const,
        route: "/robot/map_management_capability",
        title: "Floor Management",
        menuIcon: FloorManagementIcon,
        menuText: "Floor Management",
        requiredCapabilities: {
            capabilities: [Capability.MapManagement],
            type: "allof" as const,
        },
    },
];
