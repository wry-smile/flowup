# MQTT In and MQTT Out

This node entry registers separate MQTT In, MQTT Out, and MQTT Event types. Their SolidJS editors select a product, organization, and dependent MQTT device. Product and organization changes clear the selected device and refresh its available options. MQTT Event also configures the event identifier used in its fixed report topic.

Each type owns a separate hydrate store and definition under its `client/<scope>/` directory. The entry file registers each definition, while `runtime/index.ts` initializes all scoped runtime implementations. Shared MQTT connection code lives in `runtime/shared/`.

The package installs its SolidJS component set in `../../components/`; these editors import controls through `@ui`.
