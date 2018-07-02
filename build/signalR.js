'use strict';

const jQueryShim = require('./jQueryShim');

/* jquery.signalR.core.js */
/*global window:false */
/*!
 * ASP.NET SignalR JavaScript Library v2.2.1
 * http://signalr.net/
 *
 * Copyright (c) .NET Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
 *
 */

/// <reference path="Scripts/jquery-1.6.4.js" />
/// <reference path="jquery.signalR.version.js" />
(function ($, b, c) {

    var k = {
        nojQuery: "jQuery was not found. Please ensure jQuery is referenced before the SignalR client JavaScript file.",
        noTransportOnInit: "No transport could be initialized successfully. Try specifying a different transport or none at all for auto initialization.",
        errorOnNegotiate: "Error during negotiation request.",
        stoppedWhileLoading: "The connection was stopped during page load.",
        stoppedWhileNegotiating: "The connection was stopped during the negotiate request.",
        errorParsingNegotiateResponse: "Error parsing negotiate response.",
        errorDuringStartRequest: "Error during start request. Stopping the connection.",
        stoppedDuringStartRequest: "The connection was stopped during the start request.",
        errorParsingStartResponse: "Error parsing start response: '{0}'. Stopping the connection.",
        invalidStartResponse: "Invalid start response: '{0}'. Stopping the connection.",
        protocolIncompatible: "You are using a version of the client that isn't compatible with the server. Client version {0}, server version {1}.",
        sendFailed: "Send failed.",
        parseFailed: "Failed at parsing response: {0}",
        longPollFailed: "Long polling request failed.",
        eventSourceFailedToConnect: "EventSource failed to connect.",
        eventSourceError: "Error raised by EventSource",
        webSocketClosed: "WebSocket closed.",
        pingServerFailedInvalidResponse: "Invalid ping response when pinging server: '{0}'.",
        pingServerFailed: "Failed to ping server.",
        pingServerFailedStatusCode: "Failed to ping server.  Server responded with status code {0}, stopping the connection.",
        pingServerFailedParse: "Failed to parse ping server response, stopping the connection.",
        noConnectionTransport: "Connection is in an invalid state, there is no transport active.",
        webSocketsInvalidState: "The Web Socket transport is in an invalid state, transitioning into reconnecting.",
        reconnectTimeout: "Couldn't reconnect within the configured timeout of {0} ms, disconnecting.",
        reconnectWindowTimeout: "The client has been inactive since {0} and it has exceeded the inactivity timeout of {1} ms. Stopping the connection."
    };

    if (typeof $ !== "function") {
        // no jQuery!
        throw new Error(k.nojQuery);
    }

    var l,
        n,
        o = b.document.readyState === "complete",
        p = $(b),
        q = "__Negotiate Aborted__",
        r = {
        onStart: "onStart",
        onStarting: "onStarting",
        onReceived: "onReceived",
        onError: "onError",
        onConnectionSlow: "onConnectionSlow",
        onReconnecting: "onReconnecting",
        onReconnect: "onReconnect",
        onStateChanged: "onStateChanged",
        onDisconnect: "onDisconnect"
    },
        t = {
        processData: /*deep copy*/!0 /* use Post for longPolling */,
        timeout: null,
        async: !0,
        global: /* async */ /* notifyServer */ /* async */ /* notifyServer */!1,
        cache: !1
    },
        u = function (z, A) {
        if (A === !1) {
            return;
        }
        var m;
        if (typeof b.console === "undefined") {
            return;
        }
        m = "[" + new Date().toTimeString() + "] SignalR: " + z;
        if (b.console.debug) {
            b.console.debug(m);
        } else if (b.console.log) {
            b.console.log(m);
        }
    },
        v = function (z, A, B) {
        if (A === z.state) {
            z.state = B;

            $(z).triggerHandler(r.onStateChanged, [{ oldState: A, newState: B }]);
            return !0;
        }

        return !1;
    },
        w = function (z) {
        return z.state === l.connectionState.disconnected;
    },
        x = function (z) {
        return z._.keepAliveData.activated && z.transport.supportsKeepAlive(z);
    },
        y = function (z) {
        var A, B;

        // Check if this connection has already been configured to stop reconnecting after a specified timeout.
        // Without this check if a connection is stopped then started events will be bound multiple times.
        if (!z._.configuredStopReconnectingTimeout) {
            B = function (C) {
                var D = l._.format(l.resources.reconnectTimeout, C.disconnectTimeout);
                C.log(D);
                $(C).triggerHandler(r.onError, [l._.error(D, /* source */"TimeoutException")]);
                C.stop(!1, !1);
            };

            z.reconnecting(function () {
                var C = this;

                // Guard against state changing in a previous user defined even handler
                if (C.state === l.connectionState.reconnecting) {
                    A = b.setTimeout(function () {
                        B(C);
                    }, C.disconnectTimeout);
                }
            });

            z.stateChanged(function (C) {
                if (C.oldState === l.connectionState.reconnecting) {
                    // Clear the pending reconnect timeout check
                    b.clearTimeout(A);
                }
            });

            z._.configuredStopReconnectingTimeout = !0;
        }
    };

    l = function (z, A, B) {
        /// <summary>Creates a new SignalR connection for the given url</summary>
        /// <param name="url" type="String">The URL of the long polling endpoint</param>
        /// <param name="qs" type="Object">
        ///     [Optional] Custom querystring parameters to add to the connection URL.
        ///     If an object, every non-function member will be added to the querystring.
        ///     If a string, it's added to the QS as specified.
        /// </param>
        /// <param name="logging" type="Boolean">
        ///     [Optional] A flag indicating whether connection logging is enabled to the browser
        ///     console/log. Defaults to false.
        /// </param>

        return new l.fn.init(z, A, B);
    };

    l._ = {
        defaultContentType: "application/x-www-form-urlencoded; charset=UTF-8",

        ieVersion: function () {
            var z, A;

            if (b.navigator.appName === 'Microsoft Internet Explorer') {
                // Check if the user agent has the pattern "MSIE (one or more numbers).(one or more numbers)";
                A = /MSIE ([0-9]+\.[0-9]+)/.exec(b.navigator.userAgent);

                if (A) {
                    z = b.parseFloat(A[1]);
                }
            }

            // undefined value means not IE
            return z;
        }(),

        error: function (z, A, B) {
            var e = new Error(z);
            e.source = A;

            if (typeof B !== "undefined") {
                e.context = B;
            }

            return e;
        },

        transportError: function (z, A, B, C) {
            var e = this.error(z, B, C);
            e.transport = A ? A.name : c;
            return e;
        },

        format: function () {
            for (var s = arguments[0], i = 0; i < arguments.length - 1; i++) {
                s = s.replace("{" + i + "}", arguments[i + 1]);
            }
            /// <summary>Usage: format("Hi {0}, you are {1}!", "Foo", 100) </summary>

            return s;
        },

        firefoxMajorVersion: function (z) {
            // Firefox user agents: http://useragentstring.com/pages/Firefox/
            var A = z.match(/Firefox\/(\d+)/);
            if (!A || !A.length || A.length < 2) {
                return 0;
            }
            return parseInt(A[1], 10 /* radix */);
        },

        configurePingInterval: function (z) {
            var A = z._.config,
                B = function (C) {
                $(z).triggerHandler(r.onError, [C]);
            };

            if (A && !z._.pingIntervalId && A.pingInterval) {
                z._.pingIntervalId = b.setInterval(function () {
                    l.transports._logic.pingServer(z).fail(B);
                }, A.pingInterval);
            }
        }
    };

    l.events = r;

    l.resources = k;

    l.ajaxDefaults = t;

    l.changeState = v;

    l.isDisconnecting = w;

    l.connectionState = {
        connecting: 0,
        connected: 1,
        reconnecting: 2,
        disconnected: 4
    };

    l.hub = {
        start: function () {
            // This will get replaced with the real hub connection start method when hubs is referenced correctly
            throw new Error("SignalR: Error loading hubs. Ensure your hubs reference is correct, e.g. <script src='/signalr/js'></script>.");
        }
    };

    // .on() was added in version 1.7.0, .load() was removed in version 3.0.0 so we fallback to .load() if .on() does
    // not exist to not break existing applications
    if (typeof p.on == "function") {
        p.on("load", function () {
            o = !0;
        });
    } else {
        p.load(function () {
            o = !0;
        });
    }

    function f(z, A) {
        /// <summary>Validates the requested transport by cross checking it with the pre-defined signalR.transports</summary>
        /// <param name="requestedTransport" type="Object">The designated transports that the user has specified.</param>
        /// <param name="connection" type="signalR">The connection that will be using the requested transports.  Used for logging purposes.</param>
        /// <returns type="Object" />

        if ($.isArray(z)) {
            // Go through transport array and remove an "invalid" tranports
            for (var i = z.length - 1, B; i >= 0; i--) {
                B = z[i];

                if ($.type(B) !== "string" || !l.transports[B]) {
                    A.log("Invalid transport: " + B + ", removing it from the transports list.");
                    z.splice(i, 1);
                }
            }

            // Verify we still have transports left, if we dont then we have invalid transports
            if (z.length === 0) {
                A.log("No transports remain within the specified transport array.");
                z = null;
            }
        } else if (!l.transports[z] && z !== "auto") {
            A.log("Invalid transport: " + z.toString() + ".");
            z = null;
        } else if (z === "auto" && l._.ieVersion <= 8) {
            // If we're doing an auto transport and we're IE8 then force longPolling, #1764
            return ["longPolling"];
        }

        return z;
    }

    function g(z) {
        if (z === "http:") {
            return 80;
        } else if (z === "https:") {
            return 443;
        }
    }

    function h(z, A) {
        // Remove ports  from url.  We have to check if there's a / or end of line
        // following the port in order to avoid removing ports such as 8080.
        if (A.match(/:\d+$/)) {
            return A;
        } else {
            return A + ":" + g(z);
        }
    }

    function j(z, A) {
        var B = this,
            C = [];

        B.tryBuffer = function (D) {
            if (z.state === $.signalR.connectionState.connecting) {
                C.push(D);

                return !0;
            }

            return !1;
        };

        B.drain = function () {
            // Ensure that the connection is connected when we drain (do not want to drain while a connection is not active)
            if (z.state === $.signalR.connectionState.connected) {
                while (C.length > 0) {
                    A(C.shift());
                }
            }
        };

        B.clear = function () {
            C = [];
        };
    }

    l.fn = l.prototype = {
        init: function (z, A, B) {
            var C = $(this);

            this.url = z;
            this.qs = A;
            this.lastError = null;
            this._ = {
                keepAliveData: {},
                connectingMessageBuffer: new j(this, function (D) {
                    C.triggerHandler(r.onReceived, [D]);
                }),
                lastMessageAt: new Date().getTime(),
                lastActiveAt: new Date().getTime(),
                beatInterval: 5000, // Default value, will only be overridden if keep alive is enabled,
                beatHandle: null,
                totalTransportConnectTimeout: 0 // This will be the sum of the TransportConnectTimeout sent in response to negotiate and connection.transportConnectTimeout
            };
            if (typeof B === "boolean") {
                this.logging = B;
            }
        },

        _parseResponse: function (z) {
            var A = this;

            if (!z) {
                return z;
            } else if (typeof z === "string") {
                return A.json.parse(z);
            } else {
                return z;
            }
        },

        _originalJson: b.JSON,

        json: b.JSON,

        isCrossDomain: function (z, A) {
            /// <summary>Checks if url is cross domain</summary>
            /// <param name="url" type="String">The base URL</param>
            /// <param name="against" type="Object">
            ///     An optional argument to compare the URL against, if not specified it will be set to window.location.
            ///     If specified it must contain a protocol and a host property.
            /// </param>
            var B;

            z = $.trim(z);

            A = A || b.location;

            if (z.indexOf("http") !== 0) {
                return !1;
            }

            // Create an anchor tag.
            B = b.document.createElement("a");
            B.href = z;

            // When checking for cross domain we have to special case port 80 because the window.location will remove the
            return B.protocol + h(B.protocol, B.host) !== A.protocol + h(A.protocol, A.host);
        },

        ajaxDataType: "text",

        contentType: "application/json; charset=UTF-8",

        logging: !1,

        state: l.connectionState.disconnected,

        clientProtocol: "1.5",

        reconnectDelay: 2000,

        transportConnectTimeout: 0,

        disconnectTimeout: 30000, // This should be set by the server in response to the negotiate request (30s default)

        reconnectWindow: 30000, // This should be set by the server in response to the negotiate request

        keepAliveWarnAt: 2 / 3, // Warn user of slow connection if we breach the X% mark of the keep alive timeout

        start: function (z, A) {
            /// <summary>Starts the connection</summary>
            /// <param name="options" type="Object">Options map</param>
            /// <param name="callback" type="Function">A callback function to execute when the connection has started</param>
            var B = this,
                C = {
                pingInterval: 300000,
                waitForPageLoad: !0,
                transport: "auto",
                jsonp: !1
            },
                D,
                E = B._deferral || $.Deferred(),
                // Check to see if there is a pre-existing deferral that's being built on, if so we want to keep using it
            F = b.document.createElement("a");

            B.lastError = null;

            // Persist the deferral so that if start is called multiple times the same deferral is used.
            B._deferral = E;

            if (!B.json) {
                // no JSON!
                throw new Error("SignalR: No JSON parser found. Please ensure json2.js is referenced before the SignalR.js file if you need to support clients without native JSON parsing support, e.g. IE<8.");
            }

            if ($.type(z) === "function") {
                // Support calling with single callback parameter
                A = z;
            } else if ($.type(z) === "object") {
                $.extend(C, z);
                if ($.type(C.callback) === "function") {
                    A = C.callback;
                }
                B.extraHeaders = z.extraHeaders;
            }

            C.transport = f(C.transport, B);

            // If the transport is invalid throw an error and abort start
            if (!C.transport) {
                throw new Error("SignalR: Invalid transport(s) specified, aborting start.");
            }

            B._.config = C;

            // Check to see if start is being called prior to page load
            // If waitForPageLoad is true we then want to re-direct function call to the window load event
            if (!o && C.waitForPageLoad === !0) {
                B._.deferredStartHandler = function () {
                    B.start(z, A);
                };
                p.bind("load", B._.deferredStartHandler);

                return E.promise();
            }

            // If we're already connecting just return the same deferral as the original connection start
            if (B.state === l.connectionState.connecting) {
                return E.promise();
            } else if (v(B, l.connectionState.disconnected, l.connectionState.connecting) === !1) {
                // We're not connecting so try and transition into connecting.
                // If we fail to transition then we're either in connected or reconnecting.

                E.resolve(B);
                return E.promise();
            }

            y(B);

            // Resolve the full url
            F.href = B.url;
            if (!F.protocol || F.protocol === ":") {
                B.protocol = b.document.location.protocol;
                B.host = F.host || b.document.location.host;
            } else {
                B.protocol = F.protocol;
                B.host = F.host;
            }

            B.baseUrl = B.protocol + "//" + B.host;

            // Set the websocket protocol
            B.wsProtocol = B.protocol === "https:" ? "wss://" : "ws://";

            // If jsonp with no/auto transport is specified, then set the transport to long polling
            // since that is the only transport for which jsonp really makes sense.
            // Some developers might actually choose to specify jsonp for same origin requests
            // as demonstrated by Issue #623.
            if (C.transport === "auto" && C.jsonp === !0) {
                C.transport = "longPolling";
            }

            // If the url is protocol relative, prepend the current windows protocol to the url.
            if (B.url.indexOf("//") === 0) {
                B.url = b.location.protocol + B.url;
                B.log("Protocol relative URL detected, normalizing it to '" + B.url + "'.");
            }

            if (this.isCrossDomain(B.url)) {
                B.log("Auto detected cross domain url.");

                if (C.transport === "auto") {
                    // TODO: Support XDM with foreverFrame
                    C.transport = ["webSockets", "serverSentEvents", "longPolling"];
                }

                if (typeof C.withCredentials === "undefined") {
                    C.withCredentials = !0;
                }

                // Determine if jsonp is the only choice for negotiation, ajaxSend and ajaxAbort.
                // i.e. if the browser doesn't supports CORS
                // If it is, ignore any preference to the contrary, and switch to jsonp.
                if (!C.jsonp) {
                    C.jsonp = !$.support.cors;

                    if (C.jsonp) {
                        B.log("Using jsonp because this browser doesn't support CORS.");
                    }
                }

                B.contentType = l._.defaultContentType;
            }

            B.withCredentials = C.withCredentials;

            B.ajaxDataType = C.jsonp ? "jsonp" : "text";

            $(B).bind(r.onStart, function (e, I) {
                if ($.type(A) === "function") {
                    A.call(B);
                }
                E.resolve(B);
            });

            B._.initHandler = l.transports._logic.initHandler(B);

            D = function (I, J) {
                var K = l._.error(k.noTransportOnInit);

                J = J || 0;
                if (J >= I.length) {
                    if (J === 0) {
                        B.log("No transports supported by the server were selected.");
                    } else if (J === 1) {
                        B.log("No fallback transports were selected.");
                    } else {
                        B.log("Fallback transports exhausted.");
                    }

                    // No transport initialized successfully
                    $(B).triggerHandler(r.onError, [K]);
                    E.reject(K);
                    // Stop the connection if it has connected and move it into the disconnected state
                    B.stop();
                    return;
                }

                // The connection was aborted
                if (B.state === l.connectionState.disconnected) {
                    return;
                }

                var L = I[J],
                    M = l.transports[L],
                    N = function () {
                    D(I, J + 1);
                };

                B.transport = M;

                try {
                    B._.initHandler.start(M, function () {
                        // success
                        // Firefox 11+ doesn't allow sync XHR withCredentials: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#withCredentials
                        var O = l._.firefoxMajorVersion(b.navigator.userAgent) >= 11,
                            P = !!B.withCredentials && O;

                        B.log("The start request succeeded. Transitioning to the connected state.");

                        if (x(B)) {
                            l.transports._logic.monitorKeepAlive(B);
                        }

                        l.transports._logic.startHeartbeat(B);

                        // Used to ensure low activity clients maintain their authentication.
                        // Must be configured once a transport has been decided to perform valid ping requests.
                        l._.configurePingInterval(B);

                        if (!v(B, l.connectionState.connecting, l.connectionState.connected)) {
                            B.log("WARNING! The connection was not in the connecting state.");
                        }

                        // Drain any incoming buffered messages (messages that came in prior to connect)
                        B._.connectingMessageBuffer.drain();

                        $(B).triggerHandler(r.onStart);

                        // wire the stop handler for when the user leaves the page
                        p.bind("unload", function () {
                            B.log("Window unloading, stopping the connection.");

                            B.stop(P);
                        });

                        if (O) {
                            // Firefox does not fire cross-domain XHRs in the normal unload handler on tab close.
                            // #2400
                            p.bind("beforeunload", function () {
                                // If connection.stop() runs runs in beforeunload and fails, it will also fail
                                // in unload unless connection.stop() runs after a timeout.
                                b.setTimeout(function () {
                                    B.stop(P);
                                }, 0);
                            });
                        }
                    }, N);
                } catch (error) {
                    B.log(M.name + " transport threw '" + error.message + "' when attempting to start.");
                    N();
                }
            };

            var G = B.url + "/negotiate",
                H = function (I, J) {
                var K = l._.error(k.errorOnNegotiate, I, J._.negotiateRequest);

                $(J).triggerHandler(r.onError, K);
                E.reject(K);
                // Stop the connection if negotiate failed
                J.stop();
            };

            $(B).triggerHandler(r.onStarting);

            G = l.transports._logic.prepareQueryString(B, G);

            B.log("Negotiating with '" + G + "'.");

            // Save the ajax negotiate request object so we can abort it if stop is called while the request is in flight.
            B._.negotiateRequest = l.transports._logic.ajax(B, {
                url: G,
                error: function (I, J) {
                    // We don't want to cause any errors if we're aborting our own negotiate request.
                    if (J !== q) {
                        H(I, B);
                    } else {
                        // This rejection will noop if the deferred has already been resolved or rejected.
                        E.reject(l._.error(k.stoppedWhileNegotiating, null /* error */, B._.negotiateRequest));
                    }
                },
                success: function (I) {
                    var J,
                        K,
                        L,
                        M = [],
                        N = [];

                    try {
                        J = B._parseResponse(I);
                    } catch (error) {
                        H(l._.error(k.errorParsingNegotiateResponse, error), B);
                        return;
                    }

                    K = B._.keepAliveData;
                    B.appRelativeUrl = J.Url;
                    B.id = J.ConnectionId;
                    B.token = J.ConnectionToken;
                    B.webSocketServerUrl = J.WebSocketServerUrl;

                    // The long poll timeout is the ConnectionTimeout plus 10 seconds
                    B._.pollTimeout = J.ConnectionTimeout * 1000 + 10000; // in ms

                    // Once the server has labeled the PersistentConnection as Disconnected, we should stop attempting to reconnect
                    // after res.DisconnectTimeout seconds.
                    B.disconnectTimeout = J.DisconnectTimeout * 1000; // in ms

                    // Add the TransportConnectTimeout from the response to the transportConnectTimeout from the client to calculate the total timeout
                    B._.totalTransportConnectTimeout = B.transportConnectTimeout + J.TransportConnectTimeout * 1000;

                    // If we have a keep alive
                    if (J.KeepAliveTimeout) {
                        // Register the keep alive data as activated
                        K.activated = !0;

                        // Timeout to designate when to force the connection into reconnecting converted to milliseconds
                        K.timeout = J.KeepAliveTimeout * 1000;

                        // Timeout to designate when to warn the developer that the connection may be dead or is not responding.
                        K.timeoutWarning = K.timeout * B.keepAliveWarnAt;

                        // Instantiate the frequency in which we check the keep alive.  It must be short in order to not miss/pick up any changes
                        B._.beatInterval = (K.timeout - K.timeoutWarning) / 3;
                    } else {
                        K.activated = !1;
                    }

                    B.reconnectWindow = B.disconnectTimeout + (K.timeout || 0);

                    if (!J.ProtocolVersion || J.ProtocolVersion !== B.clientProtocol) {
                        L = l._.error(l._.format(k.protocolIncompatible, B.clientProtocol, J.ProtocolVersion));
                        $(B).triggerHandler(r.onError, [L]);
                        E.reject(L);

                        return;
                    }

                    $.each(l.transports, function (O) {
                        if (O.indexOf("_") === 0 || O === "webSockets" && !J.TryWebSockets) {
                            return !0;
                        }
                        N.push(O);
                    });

                    if ($.isArray(C.transport)) {
                        $.each(C.transport, function (_, O) {
                            if ($.inArray(N, O)) {
                                M.push(O);
                            }
                        });
                    } else if (C.transport === "auto") {
                        M = N;
                    } else if ($.inArray(N, transport)) {
                        M.push(C.transport);
                    }

                    D(M);
                }
            });

            return E.promise();
        },

        starting: function (z) {
            /// <summary>Adds a callback that will be invoked before anything is sent over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute before the connection is fully instantiated.</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onStarting, function (e, B) {
                z.call(A);
            });
            return A;
        },

        send: function (z) {
            /// <summary>Sends data over the connection</summary>
            /// <param name="data" type="String">The data to send over the connection</param>
            /// <returns type="signalR" />
            var A = this;

            if (A.state === l.connectionState.disconnected) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection must be started before data can be sent. Call .start() before .send()");
            }

            if (A.state === l.connectionState.connecting) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection has not been fully initialized. Use .start().done() or .start().fail() to run logic after the connection has started.");
            }

            A.transport.send(A, z);
            // REVIEW: Should we return deferred here?
            return A;
        },

        received: function (z) {
            /// <summary>Adds a callback that will be invoked after anything is received over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when any data is received on the connection</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onReceived, function (e, B) {
                z.call(A, B);
            });
            return A;
        },

        stateChanged: function (z) {
            /// <summary>Adds a callback that will be invoked when the connection state changes</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection state changes</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onStateChanged, function (e, B) {
                z.call(A, B);
            });
            return A;
        },

        error: function (z) {
            /// <summary>Adds a callback that will be invoked after an error occurs with the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when an error occurs on the connection</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onError, function (e, B, C) {
                A.lastError = B;
                // In practice 'errorData' is the SignalR built error object.
                // In practice 'sendData' is undefined for all error events except those triggered by
                // 'ajaxSend' and 'webSockets.send'.'sendData' is the original send payload.
                z.call(A, B, C);
            });
            return A;
        },

        disconnected: function (z) {
            /// <summary>Adds a callback that will be invoked when the client disconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is broken</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onDisconnect, function (e, B) {
                z.call(A);
            });
            return A;
        },

        connectionSlow: function (z) {
            /// <summary>Adds a callback that will be invoked when the client detects a slow connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is slow</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onConnectionSlow, function (e, B) {
                z.call(A);
            });

            return A;
        },

        reconnecting: function (z) {
            /// <summary>Adds a callback that will be invoked when the underlying transport begins reconnecting</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection enters a reconnecting state</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onReconnecting, function (e, B) {
                z.call(A);
            });
            return A;
        },

        reconnected: function (z) {
            /// <summary>Adds a callback that will be invoked when the underlying transport reconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is restored</param>
            /// <returns type="signalR" />
            var A = this;
            $(A).bind(r.onReconnect, function (e, B) {
                z.call(A);
            });
            return A;
        },

        stop: function (z, A) {
            /// <summary>Stops listening</summary>
            /// <param name="async" type="Boolean">Whether or not to asynchronously abort the connection</param>
            /// <param name="notifyServer" type="Boolean">Whether we want to notify the server that we are aborting the connection</param>
            /// <returns type="signalR" />
            var B = this,

            // Save deferral because this is always cleaned up
            C = B._deferral;

            // Verify that we've bound a load event.
            if (B._.deferredStartHandler) {
                // Unbind the event.
                p.unbind("load", B._.deferredStartHandler);
            }

            // Always clean up private non-timeout based state.
            delete B._.config;
            delete B._.deferredStartHandler;

            // This needs to be checked despite the connection state because a connection start can be deferred until page load.
            // If we've deferred the start due to a page load we need to unbind the "onLoad" -> start event.
            if (!o && (!B._.config || B._.config.waitForPageLoad === !0)) {
                B.log("Stopping connection prior to negotiate.");

                // If we have a deferral we should reject it
                if (C) {
                    C.reject(l._.error(k.stoppedWhileLoading));
                }

                // Short-circuit because the start has not been fully started.
                return;
            }

            if (B.state === l.connectionState.disconnected) {
                return;
            }

            B.log("Stopping connection.");

            // Clear this no matter what
            b.clearTimeout(B._.beatHandle);
            b.clearInterval(B._.pingIntervalId);

            if (B.transport) {
                B.transport.stop(B);

                if (A !== !1) {
                    B.transport.abort(B, z);
                }

                if (x(B)) {
                    l.transports._logic.stopMonitoringKeepAlive(B);
                }

                B.transport = null;
            }

            if (B._.negotiateRequest) {
                // If the negotiation request has already completed this will noop.
                B._.negotiateRequest.abort(q);
                delete B._.negotiateRequest;
            }

            // Ensure that initHandler.stop() is called before connection._deferral is deleted
            if (B._.initHandler) {
                B._.initHandler.stop();
            }

            delete B._deferral;
            delete B.messageId;
            delete B.groupsToken;
            delete B.id;
            delete B._.pingIntervalId;
            delete B._.lastMessageAt;
            delete B._.lastActiveAt;

            // Clear out our message buffer
            B._.connectingMessageBuffer.clear();

            // Trigger the disconnect event
            v(B, B.state, l.connectionState.disconnected);
            $(B).triggerHandler(r.onDisconnect);

            return B;
        },

        log: function (z) {
            u(z, this.logging);
        }
    };

    l.fn.init.prototype = l.fn;

    l.noConflict = function () {
        /// <summary>Reinstates the original value of $.connection and returns the signalR object for manual assignment</summary>
        /// <returns type="signalR" />
        if ($.connection === l) {
            $.connection = n;
        }
        return l;
    };

    if ($.connection) {
        n = $.connection;
    }

    $.connection = $.signalR = l;
})(jQueryShim, window);
/* jquery.signalR.transports.common.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />

(function ($, b, c) {

    var k = $.signalR,
        l = $.signalR.events,
        n = $.signalR.changeState,
        o = "__Start Aborted__",
        p;

    k.transports = {};

    function f(q) {
        if (q._.keepAliveData.monitoring) {
            g(q);
        }

        // Ensure that we successfully marked active before continuing the heartbeat.
        if (p.markActive(q)) {
            q._.beatHandle = b.setTimeout(function () {
                f(q);
            }, q._.beatInterval);
        }
    }

    function g(q) {
        var r = q._.keepAliveData,
            t;

        // Only check if we're connected
        if (q.state === k.connectionState.connected) {
            t = new Date().getTime() - q._.lastMessageAt;

            // Check if the keep alive has completely timed out
            if (t >= r.timeout) {
                q.log("Keep alive timed out.  Notifying transport that connection has been lost.");

                // Notify transport that the connection has been lost
                q.transport.lostConnection(q);
            } else if (t >= r.timeoutWarning) {
                // This is to assure that the user only gets a single warning
                if (!r.userNotified) {
                    q.log("Keep alive has been missed, connection may be dead/slow.");
                    $(q).triggerHandler(l.onConnectionSlow);
                    r.userNotified = !0;
                }
            } else {
                r.userNotified = !1;
            }
        }
    }

    function h(q, r) {
        var t = q.url + r;

        if (q.transport) {
            t += "?transport=" + q.transport.name;
        }

        return p.prepareQueryString(q, t);
    }

    function j(q) {
        this.connection = q;

        this.startRequested = !1;
        this.startCompleted = !1;
        this.connectionStopped = !1;
    }

    j.prototype = {
        start: function (q, r, t) {
            var u = this,
                v = u.connection,
                w = !1;

            if (u.startRequested || u.connectionStopped) {
                v.log("WARNING! " + q.name + " transport cannot be started. Initialization ongoing or completed.");
                return;
            }

            v.log(q.name + " transport starting.");

            q.start(v, function () {
                if (!w) {
                    u.initReceived(q, r);
                }
            }, function (x) {
                // Don't allow the same transport to cause onFallback to be called twice
                if (!w) {
                    w = !0;
                    u.transportFailed(q, x, t);
                }

                // Returns true if the transport should stop;
                // false if it should attempt to reconnect
                return !u.startCompleted || u.connectionStopped;
            });

            u.transportTimeoutHandle = b.setTimeout(function () {
                if (!w) {
                    w = !0;
                    v.log(q.name + " transport timed out when trying to connect.");
                    u.transportFailed(q, c, t);
                }
            }, v._.totalTransportConnectTimeout);
        },

        stop: function () {
            this.connectionStopped = !0;
            b.clearTimeout(this.transportTimeoutHandle);
            k.transports._logic.tryAbortStartRequest(this.connection);
        },

        initReceived: function (q, r) {
            var t = this,
                u = t.connection;

            if (t.startRequested) {
                u.log("WARNING! The client received multiple init messages.");
                return;
            }

            if (t.connectionStopped) {
                return;
            }

            t.startRequested = !0;
            b.clearTimeout(t.transportTimeoutHandle);

            u.log(q.name + " transport connected. Initiating start request.");
            k.transports._logic.ajaxStart(u, function () {
                t.startCompleted = !0;
                r();
            });
        },

        transportFailed: function (q, r, t) {
            var u = this.connection,
                v = u._deferral,
                w;

            if (this.connectionStopped) {
                return;
            }

            b.clearTimeout(this.transportTimeoutHandle);

            if (!this.startRequested) {
                q.stop(u);

                u.log(q.name + " transport failed to connect. Attempting to fall back.");
                t();
            } else if (!this.startCompleted) {
                // Do not attempt to fall back if a start request is ongoing during a transport failure.
                // Instead, trigger an error and stop the connection.
                w = k._.error(k.resources.errorDuringStartRequest, r);

                u.log(q.name + " transport failed during the start request. Stopping the connection.");
                $(u).triggerHandler(l.onError, [w]);
                if (v) {
                    v.reject(w);
                }

                u.stop();
            } else {
                // The start request has completed, but the connection has not stopped.
                // No need to do anything here. The transport should attempt its normal reconnect logic.
            }
        }
    };

    p = k.transports._logic = {
        ajax: function (q, r) {
            return $.ajax($.extend(!0, {}, $.signalR.ajaxDefaults, {
                type: "GET",
                data: {},
                xhrFields: { withCredentials: q.withCredentials },
                contentType: q.contentType,
                dataType: q.ajaxDataType,
                extraHeaders: q.extraHeaders
            }, r));
        },

        pingServer: function (q) {
            /// <summary>Pings the server</summary>
            /// <param name="connection" type="signalr">Connection associated with the server ping</param>
            /// <returns type="signalR" />
            var r,
                t,
                u = $.Deferred();

            if (q.transport) {
                r = q.url + "/ping";

                r = p.addQs(r, q.qs);

                t = p.ajax(q, {
                    url: r,
                    success: function (v) {
                        var w;

                        try {
                            w = q._parseResponse(v);
                        } catch (error) {
                            u.reject(k._.transportError(k.resources.pingServerFailedParse, q.transport, error, t));
                            q.stop();
                            return;
                        }

                        if (w.Response === "pong") {
                            u.resolve();
                        } else {
                            u.reject(k._.transportError(k._.format(k.resources.pingServerFailedInvalidResponse, v), q.transport, null /* error */
                            , t));
                        }
                    },
                    error: function (v) {
                        if (v.status === 401 || v.status === 403) {
                            u.reject(k._.transportError(k._.format(k.resources.pingServerFailedStatusCode, v.status), q.transport, v, t));
                            q.stop();
                        } else {
                            u.reject(k._.transportError(k.resources.pingServerFailed, q.transport, v, t));
                        }
                    }
                });
            } else {
                u.reject(k._.transportError(k.resources.noConnectionTransport, q.transport));
            }

            return u.promise();
        },

        prepareQueryString: function (q, r) {
            var t;

            // Use addQs to start since it handles the ?/& prefix for us
            t = p.addQs(r, "clientProtocol=" + q.clientProtocol);

            // Add the user-specified query string params if any
            t = p.addQs(t, q.qs);

            if (q.token) {
                t += "&connectionToken=" + b.encodeURIComponent(q.token);
            }

            if (q.data) {
                t += "&connectionData=" + b.encodeURIComponent(q.data);
            }

            return t;
        },

        addQs: function (q, r) {
            var t = q.indexOf("?") !== -1 ? "&" : "?",
                u;

            if (!r) {
                return q;
            }

            if (typeof r === "object") {
                return q + t + $.param(r);
            }

            if (typeof r === "string") {
                u = r.charAt(0);

                if (u === "?" || u === "&") {
                    t = "";
                }

                return q + t + r;
            }

            throw new Error("Query string property must be either a string or object.");
        },

        // BUG #2953: The url needs to be same otherwise it will cause a memory leak
        getUrl: function (q, r, t, u, v) {
            /// <summary>Gets the url for making a GET based connect request</summary>
            var w = r === "webSockets" ? "" : q.baseUrl,
                x = w + q.appRelativeUrl,
                y = "transport=" + r;

            if (!v && q.groupsToken) {
                y += "&groupsToken=" + b.encodeURIComponent(q.groupsToken);
            }

            if (!t) {
                x += "/connect";
            } else {
                if (u) {
                    // longPolling transport specific
                    x += "/poll";
                } else {
                    x += "/reconnect";
                }

                if (!v && q.messageId) {
                    y += "&messageId=" + b.encodeURIComponent(q.messageId);
                }
            }
            x += "?" + y;
            x = p.prepareQueryString(q, x);

            if (!v) {
                x += "&tid=" + Math.floor(Math.random() * 11);
            }

            return x;
        },

        maximizePersistentResponse: function (q) {
            return {
                MessageId: q.C,
                Messages: q.M,
                Initialized: typeof q.S !== "undefined" ? !0 : !1,
                ShouldReconnect: typeof q.T !== "undefined" ? !0 : !1,
                LongPollDelay: q.L,
                GroupsToken: q.G
            };
        },

        updateGroups: function (q, r) {
            if (r) {
                q.groupsToken = r;
            }
        },

        stringifySend: function (q, r) {
            if (typeof r === "string" || typeof r === "undefined" || r === null) {
                return r;
            }
            return q.json.stringify(r);
        },

        ajaxSend: function (q, r) {
            var t = p.stringifySend(q, r),
                u = h(q, "/send"),
                v,
                w = function (x, y) {
                $(y).triggerHandler(l.onError, [k._.transportError(k.resources.sendFailed, y.transport, x, v), r]);
            };

            v = p.ajax(q, {
                url: u,
                type: q.ajaxDataType === "jsonp" ? "GET" : "POST",
                contentType: k._.defaultContentType,
                data: {
                    data: t
                },
                success: function (x) {
                    var y;

                    if (x) {
                        try {
                            y = q._parseResponse(x);
                        } catch (error) {
                            w(error, q);
                            q.stop();
                            return;
                        }

                        p.triggerReceived(q, y);
                    }
                },
                error: function (x, y) {
                    if (y === "abort" || y === "parsererror") {
                        // The parsererror happens for sends that don't return any data, and hence
                        // don't write the jsonp callback to the response. This is harder to fix on the server
                        // so just hack around it on the client for now.
                        return;
                    }

                    w(x, q);
                }
            });

            return v;
        },

        ajaxAbort: function (q, r) {
            if (typeof q.transport === "undefined") {
                return;
            }

            // Async by default unless explicitly overidden
            r = typeof r === "undefined" ? !0 : r;

            var t = h(q, "/abort");

            p.ajax(q, {
                url: t,
                async: r,
                timeout: 1000,
                type: "POST"
            });

            q.log("Fired ajax abort async = " + r + ".");
        },

        ajaxStart: function (q, r) {
            var t = function (v) {
                var w = q._deferral;
                if (w) {
                    w.reject(v);
                }
            },
                u = function (v) {
                q.log("The start request failed. Stopping the connection.");
                $(q).triggerHandler(l.onError, [v]);
                t(v);
                q.stop();
            };

            q._.startRequest = p.ajax(q, {
                url: h(q, "/start"),
                success: function (v, w, x) {
                    var y;

                    try {
                        y = q._parseResponse(v);
                    } catch (error) {
                        u(k._.error(k._.format(k.resources.errorParsingStartResponse, v), error, x));
                        return;
                    }

                    if (y.Response === "started") {
                        r();
                    } else {
                        u(k._.error(k._.format(k.resources.invalidStartResponse, v), null /* error */, x));
                    }
                },
                error: function (v, w, x) {
                    if (w !== o) {
                        u(k._.error(k.resources.errorDuringStartRequest, x, v));
                    } else {
                        // Stop has been called, no need to trigger the error handler
                        // or stop the connection again with onStartError
                        q.log("The start request aborted because connection.stop() was called.");
                        t(k._.error(k.resources.stoppedDuringStartRequest, null /* error */, v));
                    }
                }
            });
        },

        tryAbortStartRequest: function (q) {
            if (q._.startRequest) {
                // If the start request has already completed this will noop.
                q._.startRequest.abort(o);
                delete q._.startRequest;
            }
        },

        tryInitialize: function (q, r, t) {
            if (r.Initialized && t) {
                t();
            } else if (r.Initialized) {
                q.log("WARNING! The client received an init message after reconnecting.");
            }
        },

        triggerReceived: function (q, r) {
            if (!q._.connectingMessageBuffer.tryBuffer(r)) {
                $(q).triggerHandler(l.onReceived, [r]);
            }
        },

        processMessages: function (q, r, t) {
            var u;

            // Update the last message time stamp
            p.markLastMessage(q);

            if (r) {
                u = p.maximizePersistentResponse(r);

                p.updateGroups(q, u.GroupsToken);

                if (u.MessageId) {
                    q.messageId = u.MessageId;
                }

                if (u.Messages) {
                    $.each(u.Messages, function (v, w) {
                        p.triggerReceived(q, w);
                    });

                    p.tryInitialize(q, u, t);
                }
            }
        },

        monitorKeepAlive: function (q) {
            var r = q._.keepAliveData;

            // If we haven't initiated the keep alive timeouts then we need to
            if (!r.monitoring) {
                r.monitoring = !0;

                p.markLastMessage(q);

                // Save the function so we can unbind it on stop
                q._.keepAliveData.reconnectKeepAliveUpdate = function () {
                    // Mark a new message so that keep alive doesn't time out connections
                    p.markLastMessage(q);
                };

                // Update Keep alive on reconnect
                $(q).bind(l.onReconnect, q._.keepAliveData.reconnectKeepAliveUpdate);

                q.log("Now monitoring keep alive with a warning timeout of " + r.timeoutWarning + ", keep alive timeout of " + r.timeout + " and disconnecting timeout of " + q.disconnectTimeout);
            } else {
                q.log("Tried to monitor keep alive but it's already being monitored.");
            }
        },

        stopMonitoringKeepAlive: function (q) {
            var r = q._.keepAliveData;

            // Only attempt to stop the keep alive monitoring if its being monitored
            if (r.monitoring) {
                // Stop monitoring
                r.monitoring = !1;

                // Remove the updateKeepAlive function from the reconnect event
                $(q).unbind(l.onReconnect, q._.keepAliveData.reconnectKeepAliveUpdate);

                // Clear all the keep alive data
                q._.keepAliveData = {};
                q.log("Stopping the monitoring of the keep alive.");
            }
        },

        startHeartbeat: function (q) {
            q._.lastActiveAt = new Date().getTime();
            f(q);
        },

        markLastMessage: function (q) {
            q._.lastMessageAt = new Date().getTime();
        },

        markActive: function (q) {
            if (p.verifyLastActive(q)) {
                q._.lastActiveAt = new Date().getTime();
                return !0;
            }

            return !1;
        },

        isConnectedOrReconnecting: function (q) {
            return q.state === k.connectionState.connected || q.state === k.connectionState.reconnecting;
        },

        ensureReconnectingState: function (q) {
            if (n(q, k.connectionState.connected, k.connectionState.reconnecting) === !0) {
                $(q).triggerHandler(l.onReconnecting);
            }
            return q.state === k.connectionState.reconnecting;
        },

        clearReconnectTimeout: function (q) {
            if (q && q._.reconnectTimeout) {
                b.clearTimeout(q._.reconnectTimeout);
                delete q._.reconnectTimeout;
            }
        },

        verifyLastActive: function (q) {
            if (new Date().getTime() - q._.lastActiveAt >= q.reconnectWindow) {
                var r = k._.format(k.resources.reconnectWindowTimeout, new Date(q._.lastActiveAt), q.reconnectWindow);
                q.log(r);
                $(q).triggerHandler(l.onError, [k._.error(r, /* source */"TimeoutException")]);
                q.stop(!1, !1);
                return !1;
            }

            return !0;
        },

        reconnect: function (q, r) {
            var t = k.transports[r];

            // We should only set a reconnectTimeout if we are currently connected
            // and a reconnectTimeout isn't already set.
            if (p.isConnectedOrReconnecting(q) && !q._.reconnectTimeout) {
                // Need to verify before the setTimeout occurs because an application sleep could occur during the setTimeout duration.
                if (!p.verifyLastActive(q)) {
                    return;
                }

                q._.reconnectTimeout = b.setTimeout(function () {
                    if (!p.verifyLastActive(q)) {
                        return;
                    }

                    t.stop(q);

                    if (p.ensureReconnectingState(q)) {
                        q.log(r + " reconnecting.");
                        t.start(q);
                    }
                }, q.reconnectDelay);
            }
        },

        handleParseFailure: function (q, r, t, u, v) {
            var w = k._.transportError(k._.format(k.resources.parseFailed, r), q.transport, t, v);

            // If we're in the initialization phase trigger onFailed, otherwise stop the connection.
            if (u && u(w)) {
                q.log("Failed to parse server response while attempting to connect.");
            } else {
                $(q).triggerHandler(l.onError, [w]);
                q.stop();
            }
        },

        initHandler: function (q) {
            return new j(q);
        },

        foreverFrame: {
            count: 0,
            connections: {}
        }
    };
})(jQueryShim, window);
/* jquery.signalR.transports.webSockets.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, b, c) {

    var f = $.signalR,
        g = $.signalR.events,
        h = $.signalR.changeState,
        j = f.transports._logic;

    f.transports.webSockets = {
        name: "webSockets",

        supportsKeepAlive: function () {
            return !0;
        },

        send: function (k, l) {
            var n = j.stringifySend(k, l);

            try {
                k.socket.send(n);
            } catch (ex) {
                $(k).triggerHandler(g.onError, [f._.transportError(f.resources.webSocketsInvalidState, k.transport, ex, k.socket), l]);
            }
        },

        start: function (k, l, n) {
            var o,
                p = !1,
                q = this,
                r = !l,
                t = $(k);

            if (!b.WebSocket) {
                n();
                return;
            }

            if (!k.socket) {
                if (k.webSocketServerUrl) {
                    o = k.webSocketServerUrl;
                } else {
                    o = k.wsProtocol + k.host;
                }

                o += j.getUrl(k, this.name, r);

                k.log("Connecting to websocket endpoint '" + o + "'.");
                k.socket = new b.WebSocket(o);

                k.socket.onopen = function () {
                    p = !0;
                    k.log("Websocket opened.");

                    j.clearReconnectTimeout(k);

                    if (h(k, f.connectionState.reconnecting, f.connectionState.connected) === !0) {
                        t.triggerHandler(g.onReconnect);
                    }
                };

                k.socket.onclose = function (u) {
                    var v;

                    // Only handle a socket close if the close is from the current socket.
                    // Sometimes on disconnect the server will push down an onclose event
                    // to an expired socket.

                    if (this === k.socket) {
                        if (p && typeof u.wasClean !== "undefined" && u.wasClean === !1) {
                            // Ideally this would use the websocket.onerror handler (rather than checking wasClean in onclose) but
                            // I found in some circumstances Chrome won't call onerror. This implementation seems to work on all browsers.
                            v = f._.transportError(f.resources.webSocketClosed, k.transport, u);

                            k.log("Unclean disconnect from websocket: " + (u.reason || "[no reason given]."));
                        } else {
                            k.log("Websocket closed.");
                        }

                        if (!n || !n(v)) {
                            if (v) {
                                $(k).triggerHandler(g.onError, [v]);
                            }

                            q.reconnect(k);
                        }
                    }
                };

                k.socket.onmessage = function (u) {
                    var v;

                    try {
                        v = k._parseResponse(u.data);
                    } catch (error) {
                        j.handleParseFailure(k, u.data, error, n, u);
                        return;
                    }

                    if (v) {
                        // data.M is PersistentResponse.Messages
                        if ($.isEmptyObject(v) || v.M) {
                            j.processMessages(k, v, l);
                        } else {
                            // For websockets we need to trigger onReceived
                            // for callbacks to outgoing hub calls.
                            j.triggerReceived(k, v);
                        }
                    }
                };
            }
        },

        reconnect: function (k) {
            j.reconnect(k, this.name);
        },

        lostConnection: function (k) {
            this.reconnect(k);
        },

        stop: function (k) {
            // Don't trigger a reconnect after stopping
            j.clearReconnectTimeout(k);

            if (k.socket) {
                k.log("Closing the Websocket.");
                k.socket.close();
                k.socket = null;
            }
        },

        abort: function (k, l) {
            j.ajaxAbort(k, l);
        }
    };
})(jQueryShim, window);
/* jquery.signalR.transports.serverSentEvents.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, b, c) {

    var f = $.signalR,
        g = $.signalR.events,
        h = $.signalR.changeState,
        j = f.transports._logic,
        k = function (l) {
        b.clearTimeout(l._.reconnectAttemptTimeoutHandle);
        delete l._.reconnectAttemptTimeoutHandle;
    };

    f.transports.serverSentEvents = {
        name: "serverSentEvents",

        supportsKeepAlive: function () {
            return !0;
        },

        timeOut: 3000,

        start: function (l, n, o) {
            var p = this,
                q = !1,
                r = $(l),
                t = !n,
                u;

            if (l.eventSource) {
                l.log("The connection already has an event source. Stopping it.");
                l.stop();
            }

            if (!b.EventSource) {
                if (o) {
                    l.log("This browser doesn't support SSE.");
                    o();
                }
                return;
            }

            u = j.getUrl(l, this.name, t);

            try {
                l.log("Attempting to connect to SSE endpoint '" + u + "'.");
                l.eventSource = new b.EventSource(u, { withCredentials: l.withCredentials });
            } catch (e) {
                l.log("EventSource failed trying to connect with error " + e.Message + ".");
                if (o) {
                    // The connection failed, call the failed callback
                    o();
                } else {
                    r.triggerHandler(g.onError, [f._.transportError(f.resources.eventSourceFailedToConnect, l.transport, e)]);
                    if (t) {
                        // If we were reconnecting, rather than doing initial connect, then try reconnect again
                        p.reconnect(l);
                    }
                }
                return;
            }

            if (t) {
                l._.reconnectAttemptTimeoutHandle = b.setTimeout(function () {
                    if (q === !1) {
                        // If we're reconnecting and the event source is attempting to connect,
                        // don't keep retrying. This causes duplicate connections to spawn.
                        if (l.eventSource.readyState !== b.EventSource.OPEN) {
                            // If we were reconnecting, rather than doing initial connect, then try reconnect again
                            p.reconnect(l);
                        }
                    }
                }, p.timeOut);
            }

            l.eventSource.addEventListener("open", function (e) {
                l.log("EventSource connected.");

                k(l);
                j.clearReconnectTimeout(l);

                if (q === !1) {
                    q = !0;

                    if (h(l, f.connectionState.reconnecting, f.connectionState.connected) === !0) {
                        r.triggerHandler(g.onReconnect);
                    }
                }
            }, !1);

            l.eventSource.addEventListener("message", function (e) {
                var v;

                // process messages
                if (e.data === "initialized") {
                    return;
                }

                try {
                    v = l._parseResponse(e.data);
                } catch (error) {
                    j.handleParseFailure(l, e.data, error, o, e);
                    return;
                }

                j.processMessages(l, v, n);
            }, !1);

            l.eventSource.addEventListener("error", function (e) {
                var v = f._.transportError(f.resources.eventSourceError, l.transport, e);

                // Only handle an error if the error is from the current Event Source.
                // Sometimes on disconnect the server will push down an error event
                // to an expired Event Source.
                if (this !== l.eventSource) {
                    return;
                }

                if (o && o(v)) {
                    return;
                }

                l.log("EventSource readyState: " + l.eventSource.readyState + ".");

                if (e.eventPhase === b.EventSource.CLOSED) {
                    // We don't use the EventSource's native reconnect function as it
                    // doesn't allow us to change the URL when reconnecting. We need
                    // to change the URL to not include the /connect suffix, and pass
                    // the last message id we received.
                    l.log("EventSource reconnecting due to the server connection ending.");
                    p.reconnect(l);
                } else {
                    // connection error
                    l.log("EventSource error.");
                    r.triggerHandler(g.onError, [v]);
                }
            }, !1);
        },

        reconnect: function (l) {
            j.reconnect(l, this.name);
        },

        lostConnection: function (l) {
            this.reconnect(l);
        },

        send: function (l, n) {
            j.ajaxSend(l, n);
        },

        stop: function (l) {
            // Don't trigger a reconnect after stopping
            k(l);
            j.clearReconnectTimeout(l);

            if (l && l.eventSource) {
                l.log("EventSource calling close().");
                l.eventSource.close();
                l.eventSource = null;
                delete l.eventSource;
            }
        },

        abort: function (l, n) {
            j.ajaxAbort(l, n);
        }
    };
})(jQueryShim, window);
/* jquery.signalR.transports.foreverFrame.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, b, c) {

    var f = $.signalR,
        g = $.signalR.events,
        h = $.signalR.changeState,
        j = f.transports._logic,
        k = function () {
        var n = b.document.createElement("iframe");
        n.setAttribute("style", "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;");
        return n;
    },

    // Used to prevent infinite loading icon spins in older versions of ie
    // We build this object inside a closure so we don't pollute the rest of
    // the foreverFrame transport with unnecessary functions/utilities.
    l = function () {
        var n = null,
            o = 1000,
            p = 0;

        return {
            prevent: function () {
                // Prevent additional iframe removal procedures from newer browsers
                if (f._.ieVersion <= 8) {
                    // We only ever want to set the interval one time, so on the first attachedTo
                    if (p === 0) {
                        // Create and destroy iframe every 3 seconds to prevent loading icon, super hacky
                        n = b.setInterval(function () {
                            var q = k();

                            b.document.body.appendChild(q);
                            b.document.body.removeChild(q);

                            q = null;
                        }, o);
                    }

                    p++;
                }
            },
            cancel: function () {
                // Only clear the interval if there's only one more object that the loadPreventer is attachedTo
                if (p === 1) {
                    b.clearInterval(n);
                }

                if (p > 0) {
                    p--;
                }
            }
        };
    }();

    f.transports.foreverFrame = {
        name: "foreverFrame",

        supportsKeepAlive: function () {
            return !0;
        },

        // Added as a value here so we can create tests to verify functionality
        iframeClearThreshold: 50,

        start: function (n, o, p) {
            var q = this,
                r = j.foreverFrame.count += 1,
                t,
                u = k(),
                v = function () {
                n.log("Forever frame iframe finished loading and is no longer receiving messages.");
                if (!p || !p()) {
                    q.reconnect(n);
                }
            };

            if (b.EventSource) {
                // If the browser supports SSE, don't use Forever Frame
                if (p) {
                    n.log("Forever Frame is not supported by SignalR on browsers with SSE support.");
                    p();
                }
                return;
            }

            u.setAttribute("data-signalr-connection-id", n.id);

            // Start preventing loading icon
            // This will only perform work if the loadPreventer is not attached to another connection.
            l.prevent();

            // Build the url
            t = j.getUrl(n, this.name);
            t += "&frameId=" + r;

            // add frame to the document prior to setting URL to avoid caching issues.
            b.document.documentElement.appendChild(u);

            n.log("Binding to iframe's load event.");

            if (u.addEventListener) {
                u.addEventListener("load", v, !1);
            } else if (u.attachEvent) {
                u.attachEvent("onload", v);
            }

            u.src = t;
            j.foreverFrame.connections[r] = n;

            n.frame = u;
            n.frameId = r;

            if (o) {
                n.onSuccess = function () {
                    n.log("Iframe transport started.");
                    o();
                };
            }
        },

        reconnect: function (n) {
            var o = this;

            // Need to verify connection state and verify before the setTimeout occurs because an application sleep could occur during the setTimeout duration.
            if (j.isConnectedOrReconnecting(n) && j.verifyLastActive(n)) {
                b.setTimeout(function () {
                    // Verify that we're ok to reconnect.
                    if (!j.verifyLastActive(n)) {
                        return;
                    }

                    if (n.frame && j.ensureReconnectingState(n)) {
                        var p = n.frame,
                            q = j.getUrl(n, o.name, !0) + "&frameId=" + n.frameId;
                        n.log("Updating iframe src to '" + q + "'.");
                        p.src = q;
                    }
                }, n.reconnectDelay);
            }
        },

        lostConnection: function (n) {
            this.reconnect(n);
        },

        send: function (n, o) {
            j.ajaxSend(n, o);
        },

        receive: function (n, o) {
            var p, q, r;

            if (n.json !== n._originalJson) {
                // If there's a custom JSON parser configured then serialize the object
                // using the original (browser) JSON parser and then deserialize it using
                // the custom parser (connection._parseResponse does that). This is so we
                // can easily send the response from the server as "raw" JSON but still
                // support custom JSON deserialization in the browser.
                o = n._originalJson.stringify(o);
            }

            r = n._parseResponse(o);

            j.processMessages(n, r, n.onSuccess);

            // Protect against connection stopping from a callback trigger within the processMessages above.
            if (n.state === $.signalR.connectionState.connected) {
                // Delete the script & div elements
                n.frameMessageCount = (n.frameMessageCount || 0) + 1;
                if (n.frameMessageCount > f.transports.foreverFrame.iframeClearThreshold) {
                    n.frameMessageCount = 0;
                    p = n.frame.contentWindow || n.frame.contentDocument;
                    if (p && p.document && p.document.body) {
                        q = p.document.body;

                        // Remove all the child elements from the iframe's body to conserver memory
                        while (q.firstChild) {
                            q.removeChild(q.firstChild);
                        }
                    }
                }
            }
        },

        stop: function (n) {
            var o = null;

            // Stop attempting to prevent loading icon
            l.cancel();

            if (n.frame) {
                if (n.frame.stop) {
                    n.frame.stop();
                } else {
                    try {
                        o = n.frame.contentWindow || n.frame.contentDocument;
                        if (o.document && o.document.execCommand) {
                            o.document.execCommand("Stop");
                        }
                    } catch (e) {
                        n.log("Error occurred when stopping foreverFrame transport. Message = " + e.message + ".");
                    }
                }

                // Ensure the iframe is where we left it
                if (n.frame.parentNode === b.document.body) {
                    b.document.body.removeChild(n.frame);
                }

                delete j.foreverFrame.connections[n.frameId];
                n.frame = null;
                n.frameId = null;
                delete n.frame;
                delete n.frameId;
                delete n.onSuccess;
                delete n.frameMessageCount;
                n.log("Stopping forever frame.");
            }
        },

        abort: function (n, o) {
            j.ajaxAbort(n, o);
        },

        getConnection: function (n) {
            return j.foreverFrame.connections[n];
        },

        started: function (n) {
            if (h(n, f.connectionState.reconnecting, f.connectionState.connected) === !0) {

                $(n).triggerHandler(g.onReconnect);
            }
        }
    };
})(jQueryShim, window);
/* jquery.signalR.transports.longPolling.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, b, c) {

    var f = $.signalR,
        g = $.signalR.events,
        h = $.signalR.changeState,
        j = $.signalR.isDisconnecting,
        k = f.transports._logic;

    f.transports.longPolling = {
        name: "longPolling",

        supportsKeepAlive: function () {
            return !1;
        },

        reconnectDelay: 3000,

        start: function (l, n, o) {
            /// <summary>Starts the long polling connection</summary>
            /// <param name="connection" type="signalR">The SignalR connection to start</param>
            var p = this,
                q = function () {
                q = $.noop;

                l.log("LongPolling connected.");

                if (n) {
                    n();
                } else {
                    l.log("WARNING! The client received an init message after reconnecting.");
                }
            },
                r = function (x) {
                if (o(x)) {
                    l.log("LongPolling failed to connect.");
                    return !0;
                }

                return !1;
            },
                t = l._,
                u = 0,
                v = function (x) {
                b.clearTimeout(t.reconnectTimeoutId);
                t.reconnectTimeoutId = null;

                if (h(x, f.connectionState.reconnecting, f.connectionState.connected) === !0) {
                    // Successfully reconnected!
                    x.log("Raising the reconnect event");
                    $(x).triggerHandler(g.onReconnect);
                }
            },

            // 1 hour
            w = 3600000;

            if (l.pollXhr) {
                l.log("Polling xhr requests already exists, aborting.");
                l.stop();
            }

            l.messageId = null;

            t.reconnectTimeoutId = null;

            t.pollTimeoutId = b.setTimeout(function () {
                (function x(y, z) {
                    var A = y.messageId,
                        B = A === null,
                        C = !B,
                        D = !z,
                        E = k.getUrl(y, p.name, C, D, !0),
                        F = {};

                    if (y.messageId) {
                        F.messageId = y.messageId;
                    }

                    if (y.groupsToken) {
                        F.groupsToken = y.groupsToken;
                    }

                    // If we've disconnected during the time we've tried to re-instantiate the poll then stop.
                    if (j(y) === !0) {
                        return;
                    }

                    l.log("Opening long polling request to '" + E + "'.");
                    y.pollXhr = k.ajax(l, {
                        xhrFields: {
                            onprogress: function () {
                                k.markLastMessage(l);
                            }
                        },
                        url: E,
                        type: "POST",
                        contentType: f._.defaultContentType,
                        data: F,
                        timeout: l._.pollTimeout,
                        success: function (G) {
                            var H,
                                I = 0,
                                J,
                                K;

                            l.log("Long poll complete.");

                            // Reset our reconnect errors so if we transition into a reconnecting state again we trigger
                            // reconnected quickly
                            u = 0;

                            try {
                                // Remove any keep-alives from the beginning of the result
                                H = l._parseResponse(G);
                            } catch (error) {
                                k.handleParseFailure(y, G, error, r, y.pollXhr);
                                return;
                            }

                            // If there's currently a timeout to trigger reconnect, fire it now before processing messages
                            if (t.reconnectTimeoutId !== null) {
                                v(y);
                            }

                            if (H) {
                                J = k.maximizePersistentResponse(H);
                            }

                            k.processMessages(y, H, q);

                            if (J && $.type(J.LongPollDelay) === "number") {
                                I = J.LongPollDelay;
                            }

                            if (j(y) === !0) {
                                return;
                            }

                            K = J && J.ShouldReconnect;
                            if (K) {
                                // Transition into the reconnecting state
                                // If this fails then that means that the user transitioned the connection into a invalid state in processMessages.
                                if (!k.ensureReconnectingState(y)) {
                                    return;
                                }
                            }

                            // We never want to pass a raiseReconnect flag after a successful poll.  This is handled via the error function
                            if (I > 0) {
                                t.pollTimeoutId = b.setTimeout(function () {
                                    x(y, K);
                                }, I);
                            } else {
                                x(y, K);
                            }
                        },

                        error: function (G, H) {
                            var I = f._.transportError(f.resources.longPollFailed, l.transport, G, y.pollXhr);

                            // Stop trying to trigger reconnect, connection is in an error state
                            // If we're not in the reconnect state this will noop
                            b.clearTimeout(t.reconnectTimeoutId);
                            t.reconnectTimeoutId = null;

                            if (H === "abort") {
                                l.log("Aborted xhr request.");
                                return;
                            }

                            if (!r(I)) {

                                // Increment our reconnect errors, we assume all errors to be reconnect errors
                                // In the case that it's our first error this will cause Reconnect to be fired
                                // after 1 second due to reconnectErrors being = 1.
                                u++;

                                if (l.state !== f.connectionState.reconnecting) {
                                    l.log("An error occurred using longPolling. Status = " + H + ".  Response = " + G.responseText + ".");
                                    $(y).triggerHandler(g.onError, [I]);
                                }

                                // We check the state here to verify that we're not in an invalid state prior to verifying Reconnect.
                                // If we're not in connected or reconnecting then the next ensureReconnectingState check will fail and will return.
                                // Therefore we don't want to change that failure code path.
                                if ((l.state === f.connectionState.connected || l.state === f.connectionState.reconnecting) && !k.verifyLastActive(l)) {
                                    return;
                                }

                                // Transition into the reconnecting state
                                // If this fails then that means that the user transitioned the connection into the disconnected or connecting state within the above error handler trigger.
                                if (!k.ensureReconnectingState(y)) {
                                    return;
                                }

                                // Call poll with the raiseReconnect flag as true after the reconnect delay
                                t.pollTimeoutId = b.setTimeout(function () {
                                    x(y, !0);
                                }, p.reconnectDelay);
                            }
                        }
                    });

                    // This will only ever pass after an error has occurred via the poll ajax procedure.
                    if (C && z === !0) {
                        // We wait to reconnect depending on how many times we've failed to reconnect.
                        // This is essentially a heuristic that will exponentially increase in wait time before
                        // triggering reconnected.  This depends on the "error" handler of Poll to cancel this
                        // timeout if it triggers before the Reconnected event fires.
                        // The Math.min at the end is to ensure that the reconnect timeout does not overflow.
                        t.reconnectTimeoutId = b.setTimeout(function () {
                            v(y);
                        }, Math.min(1000 * (Math.pow(2, u) - 1), w));
                    }
                })(l);
            }, 250); // Have to delay initial poll so Chrome doesn't show loader spinner in tab
        },

        lostConnection: function (l) {
            if (l.pollXhr) {
                l.pollXhr.abort("lostConnection");
            }
        },

        send: function (l, n) {
            k.ajaxSend(l, n);
        },

        stop: function (l) {
            /// <summary>Stops the long polling connection</summary>
            /// <param name="connection" type="signalR">The SignalR connection to stop</param>

            b.clearTimeout(l._.pollTimeoutId);
            b.clearTimeout(l._.reconnectTimeoutId);

            delete l._.pollTimeoutId;
            delete l._.reconnectTimeoutId;

            if (l.pollXhr) {
                l.pollXhr.abort();
                l.pollXhr = null;
                delete l.pollXhr;
            }
        },

        abort: function (l, n) {
            k.ajaxAbort(l, n);
        }
    };
})(jQueryShim, window);
/* jquery.signalR.hubs.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />

(function ($, b, c) {

    var o = ".hubProxy",
        p = $.signalR;

    function f(q) {
        return q + o;
    }

    // Equivalent to Array.prototype.map
    function g(q, r, t) {
        var i,
            u = q.length,
            v = [];
        for (i = 0; i < u; i += 1) {
            if (q.hasOwnProperty(i)) {
                v[i] = r.call(t, q[i], i, q);
            }
        }
        return v;
    }

    function h(a) {
        return $.isFunction(a) ? null : $.type(a) === "undefined" ? null : a;
    }

    function j(q) {
        for (var r in q) {
            // If we have any properties in our callback map then we have callbacks and can exit the loop via return
            if (q.hasOwnProperty(r)) {
                return !0;
            }
        }

        return !1;
    }

    function k(q, r) {
        /// <param name="connection" type="hubConnection" />
        var t = q._.invocationCallbacks,
            u;

        if (j(t)) {
            q.log("Clearing hub invocation callbacks with error: " + r + ".");
        }

        // Reset the callback cache now as we have a local var referencing it
        q._.invocationCallbackId = 0;
        delete q._.invocationCallbacks;
        q._.invocationCallbacks = {};

        // Loop over the callbacks and invoke them.
        // We do this using a local var reference and *after* we've cleared the cache
        // so that if a fail callback itself tries to invoke another method we don't
        // end up with its callback in the list we're looping over.
        for (var v in t) {
            u = t[v];
            u.method.call(u.scope, { E: r });
        }
    }

    // hubProxy
    function l(q, r) {
        /// <summary>
        ///     Creates a new proxy object for the given hub connection that can be used to invoke
        ///     methods on server hubs and handle client method invocation requests from the server.
        /// </summary>
        return new l.fn.init(q, r);
    }

    l.fn = l.prototype = {
        init: function (q, r) {
            this.state = {};
            this.connection = q;
            this.hubName = r;
            this._ = {
                callbackMap: {}
            };
        },

        constructor: l,

        hasSubscriptions: function () {
            return j(this._.callbackMap);
        },

        on: function (q, r) {
            /// <summary>Wires up a callback to be invoked when a invocation request is received from the server hub.</summary>
            /// <param name="eventName" type="String">The name of the hub event to register the callback for.</param>
            /// <param name="callback" type="Function">The callback to be invoked.</param>
            var t = this,
                u = t._.callbackMap;

            // Normalize the event name to lowercase
            q = q.toLowerCase();

            // If there is not an event registered for this callback yet we want to create its event space in the callback map.
            if (!u[q]) {
                u[q] = {};
            }

            // Map the callback to our encompassed function
            u[q][r] = function (e, v) {
                r.apply(t, v);
            };

            $(t).bind(f(q), u[q][r]);

            return t;
        },

        off: function (q, r) {
            /// <summary>Removes the callback invocation request from the server hub for the given event name.</summary>
            /// <param name="eventName" type="String">The name of the hub event to unregister the callback for.</param>
            /// <param name="callback" type="Function">The callback to be invoked.</param>
            var t = this,
                u = t._.callbackMap,
                v;

            // Normalize the event name to lowercase
            q = q.toLowerCase();

            v = u[q];

            // Verify that there is an event space to unbind
            if (v) {
                // Only unbind if there's an event bound with eventName and a callback with the specified callback
                if (v[r]) {
                    $(t).unbind(f(q), v[r]);

                    // Remove the callback from the callback map
                    delete v[r];

                    // Check if there are any members left on the event, if not we need to destroy it.
                    if (!j(v)) {
                        delete u[q];
                    }
                } else if (!r) {
                    // Check if we're removing the whole event and we didn't error because of an invalid callback
                    $(t).unbind(f(q));

                    delete u[q];
                }
            }

            return t;
        },

        invoke: function (q) {
            /// <summary>Invokes a server hub method with the given arguments.</summary>
            /// <param name="methodName" type="String">The name of the server hub method.</param>

            var r = this,
                t = r.connection,
                u = $.makeArray(arguments).slice(1),
                v = g(u, h),
                w = { H: r.hubName, M: q, A: v, I: t._.invocationCallbackId },
                d = $.Deferred(),
                x = function (y) {
                var z = r._maximizeHubResponse(y),
                    A,
                    B;

                // Update the hub state
                $.extend(r.state, z.State);

                if (z.Progress) {
                    if (d.notifyWith) {
                        // Progress is only supported in jQuery 1.7+
                        d.notifyWith(r, [z.Progress.Data]);
                    } else if (!t._.progressjQueryVersionLogged) {
                        t.log("A hub method invocation progress update was received but the version of jQuery in use (" + $.prototype.jquery + ") does not support progress updates. Upgrade to jQuery 1.7+ to receive progress notifications.");
                        t._.progressjQueryVersionLogged = !0;
                    }
                } else if (z.Error) {
                    // Server hub method threw an exception, log it & reject the deferred
                    if (z.StackTrace) {
                        t.log(z.Error + "\n" + z.StackTrace + ".");
                    }

                    // result.ErrorData is only set if a HubException was thrown
                    A = z.IsHubException ? "HubException" : "Exception";
                    B = p._.error(z.Error, A);
                    B.data = z.ErrorData;

                    t.log(r.hubName + "." + q + " failed to execute. Error: " + B.message);
                    d.rejectWith(r, [B]);
                } else {
                    // Server invocation succeeded, resolve the deferred
                    t.log("Invoked " + r.hubName + "." + q);
                    d.resolveWith(r, [z.Result]);
                }
            };

            t._.invocationCallbacks[t._.invocationCallbackId.toString()] = { scope: r, method: x };
            t._.invocationCallbackId += 1;

            if (!$.isEmptyObject(r.state)) {
                w.S = r.state;
            }

            t.log("Invoking " + r.hubName + "." + q);
            t.send(w);

            return d.promise();
        },

        _maximizeHubResponse: function (q) {
            return {
                State: q.S,
                Result: q.R,
                Progress: q.P ? {
                    Id: q.P.I,
                    Data: q.P.D
                } : null,
                Id: q.I,
                IsHubException: q.H,
                Error: q.E,
                StackTrace: q.T,
                ErrorData: q.D
            };
        }
    };

    l.fn.init.prototype = l.fn;

    // hubConnection
    function n(q, r) {
        /// <summary>Creates a new hub connection.</summary>
        /// <param name="url" type="String">[Optional] The hub route url, defaults to "/signalr".</param>
        /// <param name="options" type="Object">[Optional] Settings to use when creating the hubConnection.</param>
        var t = {
            qs: null,
            logging: !1,
            useDefaultPath: !0
        };

        $.extend(t, r);

        if (!q || t.useDefaultPath) {
            q = (q || "") + "/signalr";
        }
        return new n.fn.init(q, t);
    }

    n.fn = n.prototype = $.connection();

    n.fn.init = function (q, r) {
        var t = {
            qs: null,
            logging: !1,
            useDefaultPath: !0
        },
            u = this;

        $.extend(t, r);

        // Call the base constructor
        $.signalR.fn.init.call(u, q, t.qs, t.logging);

        // Object to store hub proxies for this connection
        u.proxies = {};

        u._.invocationCallbackId = 0;
        u._.invocationCallbacks = {};

        // Wire up the received handler
        u.received(function (v) {
            var w, x, y, z, A, B;
            if (!v) {
                return;
            }

            // We have to handle progress updates first in order to ensure old clients that receive
            // progress updates enter the return value branch and then no-op when they can't find
            // the callback in the map (because the minData.I value will not be a valid callback ID)
            if (typeof v.P !== "undefined") {
                // Process progress notification
                y = v.P.I.toString();
                z = u._.invocationCallbacks[y];
                if (z) {
                    z.method.call(z.scope, v);
                }
            } else if (typeof v.I !== "undefined") {
                // We received the return value from a server method invocation, look up callback by id and call it
                y = v.I.toString();
                z = u._.invocationCallbacks[y];
                if (z) {
                    // Delete the callback from the proxy
                    u._.invocationCallbacks[y] = null;
                    delete u._.invocationCallbacks[y];

                    // Invoke the callback
                    z.method.call(z.scope, v);
                }
            } else {
                w = this._maximizeClientHubInvocation(v);

                // We received a client invocation request, i.e. broadcast from server hub
                u.log("Triggering client hub event '" + w.Method + "' on hub '" + w.Hub + "'.");

                // Normalize the names to lowercase
                A = w.Hub.toLowerCase();
                B = w.Method.toLowerCase();

                // Trigger the local invocation event
                x = this.proxies[A];

                // Update the hub state
                $.extend(x.state, w.State);
                $(x).triggerHandler(f(B), [w.Args]);
            }
        });

        u.error(function (v, w) {
            var x, y;

            if (!w) {
                // No original data passed so this is not a send error
                return;
            }

            x = w.I;
            y = u._.invocationCallbacks[x];

            // Verify that there is a callback bound (could have been cleared)
            if (y) {
                // Delete the callback
                u._.invocationCallbacks[x] = null;
                delete u._.invocationCallbacks[x];

                // Invoke the callback with an error to reject the promise
                y.method.call(y.scope, { E: v });
            }
        });

        u.reconnecting(function () {
            if (u.transport && u.transport.name === "webSockets") {
                k(u, "Connection started reconnecting before invocation result was received.");
            }
        });

        u.disconnected(function () {
            k(u, "Connection was disconnected before invocation result was received.");
        });
    };

    n.fn._maximizeClientHubInvocation = function (q) {
        return {
            Hub: q.H,
            Method: q.M,
            Args: q.A,
            State: q.S
        };
    };

    n.fn._registerSubscribedHubs = function () {
        /// <summary>
        ///     Sets the starting event to loop through the known hubs and register any new hubs
        ///     that have been added to the proxy.
        /// </summary>
        var q = this;

        if (!q._subscribedToHubs) {
            q._subscribedToHubs = !0;
            q.starting(function () {
                // Set the connection's data object with all the hub proxies with active subscriptions.
                // These proxies will receive notifications from the server.
                var r = [];

                $.each(q.proxies, function (t) {
                    if (this.hasSubscriptions()) {
                        r.push({ name: t });
                        q.log("Client subscribed to hub '" + t + "'.");
                    }
                });

                if (r.length === 0) {
                    q.log("No hubs have been subscribed to.  The client will not receive data from hubs.  To fix, declare at least one client side function prior to connection start for each hub you wish to subscribe to.");
                }

                q.data = q.json.stringify(r);
            });
        }
    };

    n.fn.createHubProxy = function (q) {
        /// <summary>
        ///     Creates a new proxy object for the given hub connection that can be used to invoke
        ///     methods on server hubs and handle client method invocation requests from the server.
        /// </summary>
        /// <param name="hubName" type="String">
        ///     The name of the hub on the server to create the proxy for.
        /// </param>

        // Normalize the name to lowercase
        q = q.toLowerCase();

        var r = this.proxies[q];
        if (!r) {
            r = l(this, q);
            this.proxies[q] = r;
        }

        this._registerSubscribedHubs();

        return r;
    };

    n.fn.init.prototype = n.fn;

    $.hubConnection = n;
})(jQueryShim, window);
/* jquery.signalR.version.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.core.js" />
(function ($, b) {
    $.signalR.version = "2.2.1";
})(jQueryShim);

export const hubConnection = jQueryShim.hubConnection;
export const signalR = jQueryShim.signalR;