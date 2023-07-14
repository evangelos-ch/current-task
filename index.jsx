import { styled, run } from "uebersicht";
const _version = "1.0.0";

// Config
export const refreshFrequency = 5000;

const options = {
    /* Widget position! */
    verticalPosition: "bottom", // -> top (default) | center | bottom | "<number>" | "-<number>"
    horizontalPosition: "center", // -> left (default) | center | right | "<number>" | "-<number>"
    alwaysShow: false, // -> true | false (default)
    services: {
        Things3: {
            enabled: true,
            tag: "Current",
        },
        Asana: {
            enabled: false,
            accessToken: "<asana API key here/>",
            workspace: "<asana workspace name here/>",
            workspaceID: null,
            tag: "Current",
            tagID: null,
        },
    },
};

// Asana Integration
let asanaTagId = null;

const ASANA_REST_PARAMS = {
    headers: new Headers({
        Authorization: `Bearer ${options.services["Asana"].accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
    }),
};

const initAsana = async () => {
    let res = await fetch("https://app.asana.com/api/1.0/users/me", ASANA_REST_PARAMS);
    const userData = await res.json();

    let personalWorkspaceID = null;
    userData.data.workspaces.forEach((workspace) => {
        if (workspace.name == options.services["Asana"].workspace) personalWorkspaceID = workspace.gid;
    });

    res = await fetch(
        `https://app.asana.com/api/1.0/users/me/favorites?resource_type=tag&workspace=${personalWorkspaceID}`,
        ASANA_REST_PARAMS
    );

    if (res.status === 200) {
        const tags = await res.json();
        tags.data.forEach((tag) => {
            if (tag.name == options.services["Asana"].tag) asanaTagId = tag.gid;
        });
    }
};

const getAsanaTask = async () => {
    if (!asanaTagId) return null;

    let res = await fetch(
        `https://app.asana.com/api/1.0/tags/${asanaTagId}/tasks?opt_fields=name,completed&limit=1`,
        ASANA_REST_PARAMS
    );
    let data = await res.json();

    if (data.data.length === 0) return null;

    const { name, completed } = data.data[0];

    if (!completed) {
        return {
            name: name,
        };
    } else {
        return null;
    }
};

export const init = async (dispatch) => {
    if (options.services["Asana"].enabled) {
        await initAsana();
    }
};

// Things Integration
const getThingsTask = async () => {
    let data = await run(`osascript current-task/lib/things/main.scpt ${options.services["Things3"].tag}`);
    if (data === "") return null;
    return {
        name: data,
    };
};

// State loop
export const initialState = {
    task: null,
};

export const command = async (dispatch) => {
    let task = null;
    if (options.services["Asana"].enabled) {
        task = await getAsanaTask(dispatch);
    }
    if (options.services["Things3"].enabled) {
        task = await getThingsTask(dispatch);
    }
    dispatch({ type: "FETCH_SUCCEEDED", data: task });
};

// Update state
export const updateState = ({ type, data, error }, previousState) => {
    switch (type) {
        case "UB/COMMAND_RAN":
            return previousState;
        case "FETCH_SUCCEEDED":
            console.log(data);
            return {
                task: data,
            };
        case "FETCH_FAILED":
            return previousState;
        default:
            console.error(`Invalid dispatch type: ${type}`);
            return previousState;
    }
};

// React element
export const className = `
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  color: white;

  * {
    box-sizing: border-box;
    padding: 0;
    border: 0;
    margin: 0;
  }
`;

const wrapperPos = ({ horizontal, vertical }) => {
    if (horizontal === "center" && vertical === "center") {
        return `
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    }

    let hPos, vPos;
    switch (horizontal) {
        case "left":
            hPos = `left: 20px;`;
            break;
        case "center":
            hPos = `left: 50%; transform: translateX(-50%);`;
            break;
        case "right":
            hPos = `right: 20px;`;
            break;
        default:
            hPos = horizontal.startsWith("-") ? `right: ${parseInt(horizontal) * -1}px;` : `left: ${horizontal}px;`;
            break;
    }
    switch (vertical) {
        case "top":
            vPos = `top: 20px;`;
            break;
        case "center":
            vPos = `top: 50%; transform: translateY(-50%);`;
            break;
        case "bottom":
            vPos = `bottom: 20px;`;
            break;
        default:
            vPos = vertical.startsWith("-") ? `bottom: ${parseInt(vertical) * -1}px;` : `top: ${vertical}px;`;
            break;
    }

    return `${hPos} ${vPos}`;
};

const Wrapper = styled("div")`
    position: absolute;
    opacity: ${(props) => (props.show ? 1 : 0)};
    ${wrapperPos}
`;

const Prefix = styled("span")`
    font-size: 1.8em;
    font-weight: 400;
`;

const Task = styled("span")`
    font-size: 1.8em;
    font-weight: 200;
`;

export const render = (state, dispatch) => {
    const { verticalPosition, horizontalPosition, alwaysShow } = options;

    return (
        <Wrapper horizontal={horizontalPosition} vertical={verticalPosition} show={state.task || alwaysShow}>
            <Prefix>Current Task - </Prefix> <Task>{state.task && state.task.name}</Task>
        </Wrapper>
    );
};
