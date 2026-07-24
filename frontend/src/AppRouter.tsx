import {HashRouter, Navigate, Route, Routes} from "react-router-dom";
import Div100vh from "react-div-100vh";
import HomePage from "./HomePage";
import {PaletteMode, styled} from "@mui/material";
import ValetudoAppBar from "./components/ValetudoAppBar";
import React from "react";
import ValetudoSplash from "./components/ValetudoSplash";

const OptionsRouter = React.lazy(() => import("./options"));
const RobotRouter = React.lazy(() => import("./robot"));
const ValetudoRouter = React.lazy(() => import("./valetudo"));

const Root = styled(Div100vh)({
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
});

const Content = styled("main")({
    flex: "1",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    overflow: "auto",
});

const AppRouter: React.FunctionComponent<{ paletteMode: PaletteMode, setPaletteMode: (newMode: PaletteMode) => void }> = ({
    paletteMode,
    setPaletteMode
}): React.ReactElement => {
    return (
        <HashRouter>
            <Root>
                <Content>
                    <ValetudoAppBar paletteMode={paletteMode} setPaletteMode={setPaletteMode}/>
                    <React.Suspense fallback={<ValetudoSplash/>}>
                        <Routes>
                            <Route path="" element={<HomePage />} />
                            <Route path="robot/*" element={<RobotRouter />} />
                            <Route path="options/*" element={<OptionsRouter />} />
                            <Route path="valetudo/*" element={<ValetudoRouter />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </React.Suspense>
                </Content>
            </Root>
        </HashRouter>
    );
};

export default AppRouter;
