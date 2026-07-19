const assert = require("node:assert/strict");
const test = require("node:test");

const ComponentType = require("../../../lib/mqtt/homeassistant/ComponentType");
const MopDockCleanManualTriggerCapability = require("../../../lib/core/capabilities/MopDockCleanManualTriggerCapability");
const MopDockCleanManualTriggerCapabilityMqttHandle = require("../../../lib/mqtt/capabilities/MopDockCleanManualTriggerCapabilityMqttHandle");
const MopDockDryManualTriggerCapability = require("../../../lib/core/capabilities/MopDockDryManualTriggerCapability");
const MopDockDryManualTriggerCapabilityMqttHandle = require("../../../lib/mqtt/capabilities/MopDockDryManualTriggerCapabilityMqttHandle");
const Quirk = require("../../../lib/core/Quirk");
const QuirksCapability = require("../../../lib/core/capabilities/QuirksCapability");
const QuirksCapabilityMqttHandle = require("../../../lib/mqtt/capabilities/QuirksCapabilityMqttHandle");

function createHandle(Handle, capability) {
    const hass = {
        identifier: "test_robot",
        objectId: "test_robot"
    };
    const controller = {
        isInitialized: false,
        refresh: async () => undefined,
        withHass: callback => callback(hass)
    };
    const parent = {
        getBaseTopic: () => "valetudo/TestRobot"
    };

    return new Handle({
        parent: parent,
        controller: controller,
        robot: {},
        capability: capability
    });
}

function child(handle, topicName) {
    return handle.children.find(item => item.topicName === topicName);
}

function createQuirk(id, title, options, value) {
    return new Quirk({
        id: id,
        title: title,
        description: `${title} description`,
        options: options,
        getter: async () => value,
        setter: async () => undefined
    });
}

test("quirks handle maps toggles, choices, and triggers to suitable Home Assistant entities", () => {
    const quirks = [
        createQuirk("toggle-id", "Toggle Quirk", ["on", "off"], "off"),
        createQuirk("select-id", "Select Quirk", ["low", "medium", "high"], "medium"),
        createQuirk("trigger-id", "Trigger Quirk", ["select_to_trigger", "trigger"], "select_to_trigger")
    ];
    const capability = {
        quirks: quirks,
        getType: () => QuirksCapability.TYPE,
        getQuirks: async () => [],
        setQuirkValue: async () => undefined
    };
    const handle = createHandle(QuirksCapabilityMqttHandle, capability);

    assert.equal(child(handle, "toggle-id").hassComponents[0].componentType, ComponentType.SWITCH);
    assert.equal(child(handle, "select-id").hassComponents[0].componentType, ComponentType.SELECT);
    assert.equal(child(handle, "trigger-id").hassComponents[0].componentType, ComponentType.BUTTON);
    assert.deepEqual(child(handle, "select-id").hassComponents[0].getAutoconf().options, ["low", "medium", "high"]);
    assert.equal(QuirksCapabilityMqttHandle.OPTIONAL, true);
});

test("quirks handle batches reads and invalidates its cache after a change", async () => {
    const calls = [];
    let readCount = 0;
    const quirks = [
        createQuirk("toggle-id", "Toggle Quirk", ["on", "off"], "off"),
        createQuirk("select-id", "Select Quirk", ["low", "high"], "low")
    ];
    const capability = {
        quirks: quirks,
        getType: () => QuirksCapability.TYPE,
        getQuirks: async () => {
            readCount += 1;
            return [
                {id: "toggle-id", title: "Toggle Quirk", description: "", options: ["on", "off"], value: "off"},
                {id: "select-id", title: "Select Quirk", description: "", options: ["low", "high"], value: "low"}
            ];
        },
        setQuirkValue: async (id, value) => calls.push([id, value])
    };
    const handle = createHandle(QuirksCapabilityMqttHandle, capability);

    assert.equal(await child(handle, "toggle-id").get(), "off");
    assert.equal(await child(handle, "select-id").get(), "low");
    assert.equal(readCount, 1);

    await child(handle, "toggle-id").setter("on");
    assert.deepEqual(calls, [["toggle-id", "on"]]);
    assert.equal(await child(handle, "toggle-id").get(), "off");
    assert.equal(readCount, 2);
});

test("quirk trigger buttons send the trigger value", async () => {
    const calls = [];
    const quirk = createQuirk("trigger-id", "Trigger Quirk", ["select_to_trigger", "trigger"], "select_to_trigger");
    const capability = {
        quirks: [quirk],
        getType: () => QuirksCapability.TYPE,
        getQuirks: async () => [],
        setQuirkValue: async (id, value) => calls.push([id, value])
    };
    const handle = createHandle(QuirksCapabilityMqttHandle, capability);

    await child(handle, "trigger-id").setter("PERFORM");
    assert.deepEqual(calls, [["trigger-id", "trigger"]]);
});

test("mop dock cleaning handle exposes working start and stop buttons", async () => {
    const calls = [];
    const capability = {
        getType: () => MopDockCleanManualTriggerCapability.TYPE,
        startCleaning: async () => calls.push("start"),
        stopCleaning: async () => calls.push("stop")
    };
    const handle = createHandle(MopDockCleanManualTriggerCapabilityMqttHandle, capability);

    await child(handle, "start").setter("PERFORM");
    await child(handle, "stop").setter("PERFORM");

    assert.deepEqual(calls, ["start", "stop"]);
    assert.ok(handle.children.every(item => item.hassComponents[0].componentType === ComponentType.BUTTON));
});

test("mop dock drying handle exposes working start and stop buttons", async () => {
    const calls = [];
    const capability = {
        getType: () => MopDockDryManualTriggerCapability.TYPE,
        startDrying: async () => calls.push("start"),
        stopDrying: async () => calls.push("stop")
    };
    const handle = createHandle(MopDockDryManualTriggerCapabilityMqttHandle, capability);

    await child(handle, "start").setter("PERFORM");
    await child(handle, "stop").setter("PERFORM");

    assert.deepEqual(calls, ["start", "stop"]);
    assert.ok(handle.children.every(item => item.hassComponents[0].componentType === ComponentType.BUTTON));
});

test("core handle mappings include quirks and mop dock actions", () => {
    const mappings = require("../../../lib/mqtt/handles/HandleMappings").CAPABILITY_TYPE_TO_HANDLE_MAPPING;

    assert.equal(mappings[QuirksCapability.TYPE], QuirksCapabilityMqttHandle);
    assert.equal(mappings[MopDockCleanManualTriggerCapability.TYPE], MopDockCleanManualTriggerCapabilityMqttHandle);
    assert.equal(mappings[MopDockDryManualTriggerCapability.TYPE], MopDockDryManualTriggerCapabilityMqttHandle);
});
