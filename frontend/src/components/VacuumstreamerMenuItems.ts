import {Layers as FloorManagementIcon, Videocam as CameraIcon} from "@mui/icons-material";
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
    {
        kind: "MenuEntry" as const,
        route: "/robot/video_stream_capability",
        title: "Camera",
        menuIcon: CameraIcon,
        menuText: "Camera",
        requiredCapabilities: {
            capabilities: [Capability.VideoStream],
            type: "allof" as const,
        },
    },
];
