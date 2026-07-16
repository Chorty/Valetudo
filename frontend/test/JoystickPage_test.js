/* eslint-disable @typescript-eslint/no-var-requires, object-shorthand */
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeElement {
    constructor() {
        this.className = "";
        this.listeners = new Map();
        this.style = {};
        this.textContent = "";
        this.classList = {
            add: () => {},
            remove: () => {},
            toggle: () => {}
        };
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    getBoundingClientRect() {
        return {left: 0, top: 0, width: 220, height: 220};
    }
}

function loadJoystickPage(fetchImplementation) {
    const elements = new Map();
    const documentListeners = new Map();
    const intervalCallbacks = [];
    const windowListeners = new Map();
    const document = {
        hidden: false,
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, new FakeElement());
            }
            return elements.get(id);
        },
        addEventListener(type, listener) {
            documentListeners.set(type, listener);
        }
    };
    const window = {
        addEventListener(type, listener) {
            windowListeners.set(type, listener);
        }
    };
    const context = vm.createContext({
        clearTimeout() {},
        console,
        document,
        fetch: fetchImplementation,
        setInterval(callback) {
            intervalCallbacks.push(callback);
        },
        setTimeout() {
            return 1;
        },
        window
    });
    const html = fs.readFileSync(path.join(__dirname, "../public/joystick.html"), "utf8");
    const scriptStartTag = "<script>";
    const scriptEndTag = "</script>";
    const scriptStart = html.lastIndexOf(scriptStartTag);
    const scriptEnd = html.indexOf(scriptEndTag, scriptStart);

    assert.notStrictEqual(scriptStart, -1, "joystick page must contain an inline script");
    assert.notStrictEqual(scriptEnd, -1, "joystick page inline script must be closed");
    vm.runInContext(html.slice(scriptStart + scriptStartTag.length, scriptEnd), context);

    return {context, document, documentListeners, elements, intervalCallbacks, windowListeners};
}

test("API helper rejects failed HTTP responses", async () => {
    const {context} = loadJoystickPage(async () => ({
        ok: false,
        status: 503,
        async json() {
            return {enabled: false};
        }
    }));

    await assert.rejects(
        context.api({action: "enable"}),
        /503/
    );
});

test("failed enable does not report drive mode as enabled", async () => {
    let rejectRequests = false;
    const {context, elements} = loadJoystickPage(async () => {
        if (rejectRequests) {
            throw new Error("offline");
        }
        return {
            ok: true,
            status: 200,
            async json() {
                return {enabled: false};
            }
        };
    });
    await Promise.resolve();
    rejectRequests = true;

    await context.setEnabled(true);

    assert.notStrictEqual(elements.get("toggle-btn").textContent, "Disable Drive");
    assert.match(elements.get("status-text").textContent, /offline/i);
});

test("all interruption events register emergency-stop handlers", () => {
    const {documentListeners, windowListeners} = loadJoystickPage(async () => ({
        ok: true,
        status: 200,
        async json() {
            return {enabled: false};
        }
    }));

    assert(documentListeners.has("touchcancel"));
    assert(documentListeners.has("pointercancel"));
    assert(documentListeners.has("visibilitychange"));
    assert(windowListeners.has("blur"));
});

test("window blur stops motion and disables drive mode", async () => {
    const requests = [];
    const {context, windowListeners} = loadJoystickPage(async (_url, options) => {
        if (options?.body) {
            requests.push(JSON.parse(options.body));
        }
        return {
            ok: true,
            status: 200,
            async json() {
                return {enabled: false};
            }
        };
    });
    await Promise.resolve();
    await context.setEnabled(true);

    await windowListeners.get("blur")();

    assert.deepStrictEqual(requests.slice(-2), [
        {action: "move", vector: {velocity: 0, angle: 0}},
        {action: "disable"}
    ]);
});

test("failed movement request immediately stops and disables drive mode", async () => {
    const requests = [];
    const {context, intervalCallbacks} = loadJoystickPage(async (_url, options) => {
        if (options?.body) {
            const request = JSON.parse(options.body);
            requests.push(request);
            if (request.action === "move" && request.vector.velocity !== 0) {
                throw new Error("move failed");
            }
        }
        return {
            ok: true,
            status: 200,
            async json() {
                return {enabled: false};
            }
        };
    });
    await Promise.resolve();
    await context.onStart({
        clientX: 110,
        clientY: 44,
        preventDefault() {}
    });

    intervalCallbacks[0]();
    await new Promise(resolve => setImmediate(resolve));

    const failedMove = requests.at(-3);
    assert.strictEqual(failedMove.action, "move");
    assert.strictEqual(failedMove.vector.velocity, 1);
    assert(Math.abs(failedMove.vector.angle) < 1e-10);
    assert.deepStrictEqual(requests.slice(-2), [
        {action: "move", vector: {velocity: 0, angle: 0}},
        {action: "disable"}
    ]);
});
