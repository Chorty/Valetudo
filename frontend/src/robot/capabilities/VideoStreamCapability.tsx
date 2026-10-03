import React, {FunctionComponent} from "react";
import {Alert, Box, Button, Chip, Stack, Typography} from "@mui/material";
import {
    Pause as PauseIcon,
    PlayArrow as ResumeIcon,
    Stop as StopIcon,
    Videocam as WatchIcon,
} from "@mui/icons-material";
import {
    Capability,
    useVideoStreamCommandMutation,
    useVideoStreamStatusQuery,
    videoStreamPlaybackURL,
} from "../../api";
import {useCapabilitiesSupported} from "../../CapabilitiesProvider";
import {CapabilityContainer, CapabilityItem} from "./CapabilityLayout";

/**
 * Safari and iOS play HLS natively but not a progressive fMP4 live stream;
 * Chrome, Firefox and Edge on the desktop play the fMP4 stream.
 */
const choosePlaybackFormat = (): "hls" | "mp4" => {
    const probe = document.createElement("video");
    return probe.canPlayType("application/vnd.apple.mpegurl") !== "" ? "hls" : "mp4";
};

const VideoStreamControl: FunctionComponent = () => {
    const {data: status, isFetching, isError, refetch} = useVideoStreamStatusQuery();
    const {mutate: sendCommand, isPending: commandPending} = useVideoStreamCommandMutation();
    const [watching, setWatching] = React.useState(false);
    const [playbackError, setPlaybackError] = React.useState(false);
    const format = React.useMemo(choosePlaybackFormat, []);

    // Each viewer is relayed through Valetudo, so never keep one open in a background tab.
    React.useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden) {
                setWatching(false);
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    const paused = status?.paused === true;

    React.useEffect(() => {
        if (paused) {
            setWatching(false);
        }
    }, [paused]);

    if (isError) {
        return (
            <CapabilityItem title="Camera">
                <Typography color="error">Error loading the camera state.</Typography>
            </CapabilityItem>
        );
    }

    return (
        <CapabilityItem title="Camera" loading={isFetching || commandPending} onReload={() => {
            refetch().catch(() => {
                /* intentional */
            });
        }}>
            <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{flexWrap: "wrap"}}>
                    <Chip
                        size="small"
                        color={paused ? "warning" : "success"}
                        label={paused ? "Paused" : "Available"}
                    />
                    <Chip
                        size="small"
                        variant="outlined"
                        label={status?.capturing ? "Capturing" : "Idle"}
                    />
                    {status?.mode && (
                        <Chip size="small" variant="outlined" label={status.mode === "always" ? "Always on" : "On demand"}/>
                    )}
                </Stack>

                {watching ? (
                    <Box sx={{position: "relative", width: "100%", backgroundColor: "black", borderRadius: 1, overflow: "hidden"}}>
                        <video
                            key={format}
                            src={videoStreamPlaybackURL(format)}
                            autoPlay
                            muted
                            playsInline
                            controls
                            style={{display: "block", width: "100%", aspectRatio: "864 / 480"}}
                            onError={() => {
                                setPlaybackError(true);
                                setWatching(false);
                            }}
                        />
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Video plays only while this page is open and visible. With on-demand capture, the camera
                        stops about three minutes after the last viewer leaves.
                    </Typography>
                )}

                {playbackError && (
                    <Alert severity="warning" onClose={() => {
                        setPlaybackError(false);
                    }}>
                        The stream could not be played. The camera may be paused, waking up, or already
                        watched by the maximum number of browsers.
                    </Alert>
                )}

                <Stack direction="row" spacing={1} sx={{flexWrap: "wrap"}}>
                    {watching ? (
                        <Button variant="outlined" startIcon={<StopIcon/>} onClick={() => {
                            setWatching(false);
                        }}>
                            Stop watching
                        </Button>
                    ) : (
                        <Button variant="contained" startIcon={<WatchIcon/>} disabled={paused} onClick={() => {
                            setPlaybackError(false);
                            setWatching(true);
                        }}>
                            Watch
                        </Button>
                    )}
                    {paused ? (
                        <Button variant="outlined" startIcon={<ResumeIcon/>} disabled={commandPending} onClick={() => {
                            sendCommand({action: "start"});
                        }}>
                            Resume camera
                        </Button>
                    ) : (
                        <Button variant="outlined" color="warning" startIcon={<PauseIcon/>} disabled={commandPending} onClick={() => {
                            setWatching(false);
                            sendCommand({action: "stop"});
                        }}>
                            Pause camera
                        </Button>
                    )}
                </Stack>

                <Typography variant="caption" color="text.secondary">
                    Pause turns the camera off for every viewer, including Home Assistant, until it is resumed
                    or the robot reboots.
                </Typography>
            </Stack>
        </CapabilityItem>
    );
};

const VideoStreamCapabilityPage: FunctionComponent = () => {
    const [videoStream] = useCapabilitiesSupported(Capability.VideoStream);
    if (!videoStream) {
        return null;
    }

    return (
        <CapabilityContainer>
            <VideoStreamControl/>
        </CapabilityContainer>
    );
};

export default VideoStreamCapabilityPage;
