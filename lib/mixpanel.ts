//Import Mixpanel SDK
import mixpanel from "mixpanel-browser";

// Near entry of your product, init Mixpanel
mixpanel.init("c7f541cc15cc7d2454aa84b67fc5353b", {
    debug: true,
    track_pageview: true,
    persistence: "localStorage",
    autocapture: true,
    record_sessions_percent: 100,
});

export default mixpanel;

