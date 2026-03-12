import React, {FunctionComponent} from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    CheckCircle as ActiveIcon,
    Delete as DeleteIcon,
    Download as ExportIcon,
    DriveFileRenameOutline as RenameIcon,
    FileUpload as ImportIcon,
    Save as SaveIcon,
    SwapHoriz as SwitchFloorIcon,
} from "@mui/icons-material";
import {
    Capability,
    useMapManagementListQuery,
    useMapManagementCommandMutation,
    useMapManagementExportMutation,
    useMapManagementImportMutation,
} from "../../api";
import {useCapabilitiesSupported} from "../../CapabilitiesProvider";
import {CapabilityItem} from "./CapabilityLayout";

const MapManagementControl: FunctionComponent = () => {
    const {
        data: maps,
        isFetching: mapsFetching,
        isError: mapsError,
    } = useMapManagementListQuery();

    const {mutate: sendCommand, isPending: commandPending} = useMapManagementCommandMutation();
    const {mutate: exportMap, isPending: exportPending} = useMapManagementExportMutation();
    const {mutate: importMap, isPending: importPending} = useMapManagementImportMutation();

    const [saveName, setSaveName] = React.useState("");
    const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<{id: string, name: string} | null>(null);
    const [loadTarget, setLoadTarget] = React.useState<{id: string, name: string} | null>(null);
    const [renameTarget, setRenameTarget] = React.useState<{id: string, name: string} | null>(null);
    const [renameName, setRenameName] = React.useState("");
    const [importDialogOpen, setImportDialogOpen] = React.useState(false);
    const [importName, setImportName] = React.useState("");
    const [importFile, setImportFile] = React.useState<File | null>(null);

    const filteredMaps = React.useMemo(() => {
        if (!maps) {
            return [];
        }
        return maps.filter(m => m.id !== "log");
    }, [maps]);

    const activeFloor = React.useMemo(() => {
        return filteredMaps.find(m => m.isActive) ?? null;
    }, [filteredMaps]);

    const loading = mapsFetching || commandPending || exportPending || importPending;

    if (mapsError) {
        return (
            <CapabilityItem title="Floor Management">
                <Typography color="error">Error loading floor management state.</Typography>
            </CapabilityItem>
        );
    }

    return (
        <CapabilityItem title="Floor Management" loading={loading}>
            {/* Active floor banner */}
            {activeFloor !== null ? (
                <Alert
                    severity="success"
                    icon={<ActiveIcon fontSize="inherit"/>}
                    sx={{mb: 2}}
                >
                    <strong>Active floor:</strong> {activeFloor.name}
                </Alert>
            ) : filteredMaps.length > 0 ? (
                <Alert severity="info" sx={{mb: 2}}>
                    No floor slot loaded yet — robot is using its native map.
                    Switch to a floor slot below to start managing floors.
                </Alert>
            ) : null}

            <Box sx={{display: "flex", gap: 1, mb: 2}}>
                <Button
                    variant="outlined"
                    startIcon={<SaveIcon/>}
                    onClick={() => {
                        setSaveDialogOpen(true);
                    }}
                    disabled={loading}
                >
                    Save as Floor Slot
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<ImportIcon/>}
                    onClick={() => {
                        setImportDialogOpen(true);
                    }}
                    disabled={loading}
                >
                    Import Floor
                </Button>
            </Box>

            {filteredMaps.length === 0 && !mapsFetching && (
                <Typography variant="body2" color="text.secondary">
                    No floor slots saved yet. Use &quot;Save as Floor Slot&quot; to capture the current map.
                </Typography>
            )}

            <List disablePadding>
                {filteredMaps.map((map, index) => {
                    return (
                        <React.Fragment key={map.id}>
                            {index > 0 && <Divider/>}
                            <ListItem
                                sx={map.isActive ? {bgcolor: "action.selected", borderRadius: 1} : {}}
                                secondaryAction={
                                    <Box sx={{display: "flex", alignItems: "center"}}>
                                        <Tooltip title={map.isActive ? "Already active" : "Switch to this Floor"}>
                                            <span>
                                                <IconButton
                                                    onClick={() => {
                                                        setLoadTarget({id: map.id, name: map.name});
                                                    }}
                                                    disabled={loading || map.isActive}
                                                    color={map.isActive ? "success" : "default"}
                                                >
                                                    <SwitchFloorIcon/>
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Export">
                                            <IconButton
                                                onClick={() => {
                                                    exportMap(map.id);
                                                }}
                                                disabled={loading}
                                            >
                                                <ExportIcon/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Rename">
                                            <IconButton
                                                onClick={() => {
                                                    setRenameTarget({id: map.id, name: map.name});
                                                    setRenameName(map.name);
                                                }}
                                                disabled={loading}
                                            >
                                                <RenameIcon/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                onClick={() => {
                                                    setDeleteTarget({id: map.id, name: map.name});
                                                }}
                                                disabled={loading}
                                            >
                                                <DeleteIcon/>
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                }
                            >
                                <ListItemText
                                    primary={
                                        <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                                            {map.name}
                                            {map.isActive && (
                                                <Chip
                                                    label="Active"
                                                    size="small"
                                                    color="success"
                                                    icon={<ActiveIcon/>}
                                                />
                                            )}
                                        </Box>
                                    }
                                    secondary={new Date(map.timestamp).toLocaleString()}
                                />
                            </ListItem>
                        </React.Fragment>
                    );
                })}
            </List>

            {loading && <LinearProgress sx={{mt: 1}}/>}

            {/* Save Dialog */}
            <Dialog open={saveDialogOpen} onClose={() => {
                setSaveDialogOpen(false);
            }}>
                <DialogTitle>Save Floor Slot</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter a name for this floor (e.g. &quot;Ground Floor&quot;, &quot;Upstairs&quot;).
                        The current map will be saved as a slot you can switch back to later.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Floor Name"
                        fullWidth
                        variant="standard"
                        value={saveName}
                        onChange={(e) => {
                            setSaveName(e.target.value);
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setSaveDialogOpen(false);
                    }}>Cancel</Button>
                    <Button
                        onClick={() => {
                            sendCommand({action: "save", name: saveName});
                            setSaveDialogOpen(false);
                            setSaveName("");
                        }}
                        disabled={saveName.trim().length === 0}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Switch Floor Confirmation Dialog */}
            <Dialog open={loadTarget !== null} onClose={() => {
                setLoadTarget(null);
            }}>
                <DialogTitle>Switch to this Floor?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Switch to &quot;{loadTarget?.name}&quot;?
                        The robot&apos;s mapping services will restart with the saved floor map.
                        Any unsaved changes to the current map will be lost.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setLoadTarget(null);
                    }}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (loadTarget) {
                                sendCommand({action: "load", id: loadTarget.id});
                                setLoadTarget(null);
                            }
                        }}
                        color="warning"
                        variant="contained"
                    >
                        Switch Floor
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteTarget !== null} onClose={() => {
                setDeleteTarget(null);
            }}>
                <DialogTitle>Delete Floor Slot</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setDeleteTarget(null);
                    }}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (deleteTarget) {
                                sendCommand({action: "delete", id: deleteTarget.id});
                                setDeleteTarget(null);
                            }
                        }}
                        color="error"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={renameTarget !== null} onClose={() => {
                setRenameTarget(null);
            }}>
                <DialogTitle>Rename Floor Slot</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="New Name"
                        fullWidth
                        variant="standard"
                        value={renameName}
                        onChange={(e) => {
                            setRenameName(e.target.value);
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setRenameTarget(null);
                    }}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (renameTarget) {
                                sendCommand({action: "rename", id: renameTarget.id, name: renameName});
                                setRenameTarget(null);
                            }
                        }}
                        disabled={renameName.trim().length === 0}
                    >
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={importDialogOpen} onClose={() => {
                setImportDialogOpen(false);
            }}>
                <DialogTitle>Import Floor Slot</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Select a floor archive (.tar.gz) to import as a new floor slot.
                    </DialogContentText>
                    <TextField
                        margin="dense"
                        label="Floor Name"
                        fullWidth
                        variant="standard"
                        value={importName}
                        onChange={(e) => {
                            setImportName(e.target.value);
                        }}
                        sx={{mb: 2}}
                    />
                    <Button variant="outlined" component="label">
                        Choose File
                        <input
                            type="file"
                            accept=".tar.gz,.tgz"
                            hidden
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setImportFile(e.target.files[0]);
                                    if (!importName) {
                                        setImportName(e.target.files[0].name.replace(/\.tar\.gz$|\.tgz$/, ""));
                                    }
                                }
                            }}
                        />
                    </Button>
                    {importFile && (
                        <Typography variant="body2" sx={{mt: 1}}>
                            Selected: {importFile.name}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setImportDialogOpen(false);
                        setImportFile(null);
                        setImportName("");
                    }}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (importFile) {
                                importMap({file: importFile, name: importName || importFile.name});
                                setImportDialogOpen(false);
                                setImportFile(null);
                                setImportName("");
                            }
                        }}
                        disabled={!importFile}
                    >
                        Import
                    </Button>
                </DialogActions>
            </Dialog>
        </CapabilityItem>
    );
};

const MapManagementCapabilityPage: FunctionComponent = () => {
    const [mapManagement] = useCapabilitiesSupported(Capability.MapManagement);
    if (!mapManagement) {
        return null;
    }

    return <MapManagementControl/>;
};

export default MapManagementCapabilityPage;
