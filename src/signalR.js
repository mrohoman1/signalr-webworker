"use strict";

const jQueryShim = require("./jQueryShim");

/* jquery.signalR.core.js */
/*!
 * ASP.NET SignalR JavaScript Library v2.2.1
 * http://signalr.net/
 *
 * Copyright (c) .NET Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
 *
 * Modified by Erik Hughes
 */

(function($, undefined) {
  var resources = {
    nojQuery:
      "jQuery was not found. Please ensure jQuery is referenced before the SignalR client JavaScript file.",
    noTransportOnInit:
      "No transport could be initialized successfully. Try specifying a different transport or none at all for auto initialization.",
    errorOnNegotiate: "Error during negotiation request.",
    stoppedWhileLoading: "The connection was stopped during page load.",
    stoppedWhileNegotiating:
      "The connection was stopped during the negotiate request.",
    errorParsingNegotiateResponse: "Error parsing negotiate response.",
    errorDuringStartRequest:
      "Error during start request. Stopping the connection.",
    stoppedDuringStartRequest:
      "The connection was stopped during the start request.",
    errorParsingStartResponse:
      "Error parsing start response: '{0}'. Stopping the connection.",
    invalidStartResponse:
      "Invalid start response: '{0}'. Stopping the connection.",
    protocolIncompatible:
      "You are using a version of the client that isn't compatible with the server. Client version {0}, server version {1}.",
    sendFailed: "Send failed.",
    parseFailed: "Failed at parsing response: {0}",
    longPollFailed: "Long polling request failed.",
    eventSourceFailedToConnect: "EventSource failed to connect.",
    eventSourceError: "Error raised by EventSource",
    webSocketClosed: "WebSocket closed.",
    pingServerFailedInvalidResponse:
      "Invalid ping response when pinging server: '{0}'.",
    pingServerFailed: "Failed to ping server.",
    pingServerFailedStatusCode:
      "Failed to ping server.  Server responded with status code {0}, stopping the connection.",
    pingServerFailedParse:
      "Failed to parse ping server response, stopping the connection.",
    noConnectionTransport:
      "Connection is in an invalid state, there is no transport active.",
    webSocketsInvalidState:
      "The Web Socket transport is in an invalid state, transitioning into reconnecting.",
    reconnectTimeout:
      "Couldn't reconnect within the configured timeout of {0} ms, disconnecting.",
    reconnectWindowTimeout:
      "The client has been inactive since {0} and it has exceeded the inactivity timeout of {1} ms. Stopping the connection."
  };

  if (typeof $ !== "function") {
    // no jQuery!
    throw new Error(resources.nojQuery);
  }

  var signalR,
    _connection,
    _negotiateAbortText = "__Negotiate Aborted__",
    events = {
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
    ajaxDefaults = {
      processData: true,
      timeout: null,
      async: true,
      global: false,
      cache: false
    },
    log = function(msg, logging) {
      if (logging === false) {
        return;
      }
      var m;
      if (typeof console === "undefined") {
        return;
      }
      m = "[" + new Date().toTimeString() + "] SignalR: " + msg;
      if (console.debug) {
        console.debug(m);
      } else if (console.log) {
        console.log(m);
      }
    },
    changeState = function(connection, expectedState, newState) {
      if (expectedState === connection.state) {
        connection.state = newState;

        $(connection).triggerHandler(events.onStateChanged, [
          { oldState: expectedState, newState: newState }
        ]);
        return true;
      }

      return false;
    },
    isDisconnecting = function(connection) {
      return connection.state === signalR.connectionState.disconnected;
    },
    supportsKeepAlive = function(connection) {
      return (
        connection._.keepAliveData.activated &&
        connection.transport.supportsKeepAlive(connection)
      );
    },
    configureStopReconnectingTimeout = function(connection) {
      var stopReconnectingTimeout, onReconnectTimeout;

      // Check if this connection has already been configured to stop reconnecting after a specified timeout.
      // Without this check if a connection is stopped then started events will be bound multiple times.
      if (!connection._.configuredStopReconnectingTimeout) {
        onReconnectTimeout = function(connection) {
          var message = signalR._.format(
            signalR.resources.reconnectTimeout,
            connection.disconnectTimeout
          );
          connection.log(message);
          $(connection).triggerHandler(events.onError, [
            signalR._.error(message, /* source */ "TimeoutException")
          ]);
          connection.stop(/* async */ false, /* notifyServer */ false);
        };

        connection.reconnecting(function() {
          var connection = this;

          // Guard against state changing in a previous user defined even handler
          if (connection.state === signalR.connectionState.reconnecting) {
            stopReconnectingTimeout = setTimeout(function() {
              onReconnectTimeout(connection);
            }, connection.disconnectTimeout);
          }
        });

        connection.stateChanged(function(data) {
          if (data.oldState === signalR.connectionState.reconnecting) {
            // Clear the pending reconnect timeout check
            clearTimeout(stopReconnectingTimeout);
          }
        });

        connection._.configuredStopReconnectingTimeout = true;
      }
    };

  signalR = function(url, qs, logging) {
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

    return new signalR.fn.init(url, qs, logging);
  };

  signalR._ = {
    defaultContentType: "application/x-www-form-urlencoded; charset=UTF-8",

    error: function(message, source, context) {
      var e = new Error(message);
      e.source = source;

      if (typeof context !== "undefined") {
        e.context = context;
      }

      return e;
    },

    transportError: function(message, transport, source, context) {
      var e = this.error(message, source, context);
      e.transport = transport ? transport.name : undefined;
      return e;
    },

    format: function() {
      /// <summary>Usage: format("Hi {0}, you are {1}!", "Foo", 100) </summary>
      var s = arguments[0];
      for (var i = 0; i < arguments.length - 1; i++) {
        s = s.replace("{" + i + "}", arguments[i + 1]);
      }
      return s;
    },

    configurePingInterval: function(connection) {
      var config = connection._.config,
        onFail = function(error) {
          $(connection).triggerHandler(events.onError, [error]);
        };

      if (config && !connection._.pingIntervalId && config.pingInterval) {
        connection._.pingIntervalId = setInterval(function() {
          signalR.transports._logic.pingServer(connection).fail(onFail);
        }, config.pingInterval);
      }
    }
  };

  signalR.events = events;

  signalR.resources = resources;

  signalR.ajaxDefaults = ajaxDefaults;

  signalR.changeState = changeState;

  signalR.isDisconnecting = isDisconnecting;

  signalR.connectionState = {
    connecting: 0,
    connected: 1,
    reconnecting: 2,
    disconnected: 4
  };

  signalR.hub = {
    start: function() {
      // This will get replaced with the real hub connection start method when hubs is referenced correctly
      throw new Error(
        "SignalR: Error loading hubs. Ensure your hubs reference is correct, e.g. <script src='/signalr/js'></script>."
      );
    }
  };

  function validateTransport(requestedTransport, connection) {
    /// <summary>Validates the requested transport by cross checking it with the pre-defined signalR.transports</summary>
    /// <param name="requestedTransport" type="Object">The designated transports that the user has specified.</param>
    /// <param name="connection" type="signalR">The connection that will be using the requested transports.  Used for logging purposes.</param>
    /// <returns type="Object" />

    if ($.isArray(requestedTransport)) {
      // Go through transport array and remove an "invalid" tranports
      for (var i = requestedTransport.length - 1; i >= 0; i--) {
        var transport = requestedTransport[i];
        if ($.type(transport) !== "string" || !signalR.transports[transport]) {
          connection.log(
            "Invalid transport: " +
              transport +
              ", removing it from the transports list."
          );
          requestedTransport.splice(i, 1);
        }
      }

      // Verify we still have transports left, if we dont then we have invalid transports
      if (requestedTransport.length === 0) {
        connection.log(
          "No transports remain within the specified transport array."
        );
        requestedTransport = null;
      }
    } else if (
      !signalR.transports[requestedTransport] &&
      requestedTransport !== "auto"
    ) {
      connection.log(
        "Invalid transport: " + requestedTransport.toString() + "."
      );
      requestedTransport = null;
    }

    return requestedTransport;
  }

  function getDefaultPort(protocol) {
    if (protocol === "http:") {
      return 80;
    } else if (protocol === "https:") {
      return 443;
    }
  }

  function addDefaultPort(protocol, url) {
    // Remove ports  from url.  We have to check if there's a / or end of line
    // following the port in order to avoid removing ports such as 8080.
    if (url.match(/:\d+$/)) {
      return url;
    } else {
      return url + ":" + getDefaultPort(protocol);
    }
  }

  function ConnectingMessageBuffer(connection, drainCallback) {
    var that = this,
      buffer = [];

    that.tryBuffer = function(message) {
      if (connection.state === $.signalR.connectionState.connecting) {
        buffer.push(message);

        return true;
      }

      return false;
    };

    that.drain = function() {
      // Ensure that the connection is connected when we drain (do not want to drain while a connection is not active)
      if (connection.state === $.signalR.connectionState.connected) {
        while (buffer.length > 0) {
          drainCallback(buffer.shift());
        }
      }
    };

    that.clear = function() {
      buffer = [];
    };
  }

  signalR.fn = signalR.prototype = {
    init: function(url, qs, logging) {
      var $connection = $(this);

      this.url = url;
      this.qs = qs;
      this.lastError = null;
      this._ = {
        keepAliveData: {},
        connectingMessageBuffer: new ConnectingMessageBuffer(this, function(
          message
        ) {
          $connection.triggerHandler(events.onReceived, [message]);
        }),
        lastMessageAt: new Date().getTime(),
        lastActiveAt: new Date().getTime(),
        beatInterval: 5000, // Default value, will only be overridden if keep alive is enabled,
        beatHandle: null,
        totalTransportConnectTimeout: 0 // This will be the sum of the TransportConnectTimeout sent in response to negotiate and connection.transportConnectTimeout
      };
      if (typeof logging === "boolean") {
        this.logging = logging;
      }
    },

    _parseResponse: function(response) {
      var that = this;

      if (!response) {
        return response;
      } else if (typeof response === "string") {
        return that.json.parse(response);
      } else {
        return response;
      }
    },

    _originalJson: JSON,

    json: JSON,

    ajaxDataType: "text",

    contentType: "application/json; charset=UTF-8",

    logging: false,

    state: signalR.connectionState.disconnected,

    clientProtocol: "1.5",

    reconnectDelay: 2000,

    transportConnectTimeout: 0,

    disconnectTimeout: 30000, // This should be set by the server in response to the negotiate request (30s default)

    reconnectWindow: 30000, // This should be set by the server in response to the negotiate request

    keepAliveWarnAt: 2 / 3, // Warn user of slow connection if we breach the X% mark of the keep alive timeout

    start: function(options, callback) {
      /// <summary>Starts the connection</summary>
      /// <param name="options" type="Object">Options map</param>
      /// <param name="callback" type="Function">A callback function to execute when the connection has started</param>
      var connection = this,
        config = {
          pingInterval: 300000,
          waitForPageLoad: true,
          transport: "auto",
          jsonp: false
        },
        initialize,
        deferred = connection._deferral || $.Deferred(); // Check to see if there is a pre-existing deferral that's being built on, if so we want to keep using it

      connection.lastError = null;

      // Persist the deferral so that if start is called multiple times the same deferral is used.
      connection._deferral = deferred;

      if (!connection.json) {
        // no JSON!
        throw new Error(
          "SignalR: No JSON parser found. Please ensure json2.js is referenced before the SignalR.js file if you need to support clients without native JSON parsing support, e.g. IE<8."
        );
      }

      if ($.type(options) === "function") {
        // Support calling with single callback parameter
        callback = options;
      } else if ($.type(options) === "object") {
        $.extend(config, options);
        if ($.type(config.callback) === "function") {
          callback = config.callback;
        }
        connection.extraHeaders = options.extraHeaders;
      }

      config.transport = validateTransport(config.transport, connection);

      // If the transport is invalid throw an error and abort start
      if (!config.transport) {
        throw new Error(
          "SignalR: Invalid transport(s) specified, aborting start."
        );
      }

      connection._.config = config;

      // If we're already connecting just return the same deferral as the original connection start
      if (connection.state === signalR.connectionState.connecting) {
        return deferred.promise();
      } else if (
        changeState(
          connection,
          signalR.connectionState.disconnected,
          signalR.connectionState.connecting
        ) === false
      ) {
        // We're not connecting so try and transition into connecting.
        // If we fail to transition then we're either in connected or reconnecting.

        deferred.resolve(connection);
        return deferred.promise();
      }

      configureStopReconnectingTimeout(connection);

      // Resolve the full url
      connection.protocol = (connection.url.match(/([a-z]+:)\/\//) || [])[1];
      connection.host = (connection.url.match(/^[a-z]+:\/\/([^\/:]+)/) ||
        [])[1];

      connection.baseUrl = connection.protocol + "//" + connection.host;

      // Set the websocket protocol
      connection.wsProtocol =
        connection.protocol === "https:" ? "wss://" : "ws://";

      // If jsonp with no/auto transport is specified, then set the transport to long polling
      // since that is the only transport for which jsonp really makes sense.
      // Some developers might actually choose to specify jsonp for same origin requests
      // as demonstrated by Issue #623.
      if (config.transport === "auto" && config.jsonp === true) {
        config.transport = "longPolling";
      }

      connection.withCredentials = config.withCredentials;

      connection.ajaxDataType = config.jsonp ? "jsonp" : "text";

      $(connection).bind(events.onStart, function(e, data) {
        if ($.type(callback) === "function") {
          callback.call(connection);
        }
        deferred.resolve(connection);
      });

      connection._.initHandler = signalR.transports._logic.initHandler(
        connection
      );

      initialize = function(transports, index) {
        var noTransportError = signalR._.error(resources.noTransportOnInit);

        index = index || 0;
        if (index >= transports.length) {
          if (index === 0) {
            connection.log(
              "No transports supported by the server were selected."
            );
          } else if (index === 1) {
            connection.log("No fallback transports were selected.");
          } else {
            connection.log("Fallback transports exhausted.");
          }

          // No transport initialized successfully
          $(connection).triggerHandler(events.onError, [noTransportError]);
          deferred.reject(noTransportError);
          // Stop the connection if it has connected and move it into the disconnected state
          connection.stop();
          return;
        }

        // The connection was aborted
        if (connection.state === signalR.connectionState.disconnected) {
          return;
        }

        var transportName = transports[index],
          transport = signalR.transports[transportName],
          onFallback = function() {
            initialize(transports, index + 1);
          };

        connection.transport = transport;

        try {
          connection._.initHandler.start(
            transport,
            function() {
              // success
              connection.log(
                "The start request succeeded. Transitioning to the connected state."
              );

              if (supportsKeepAlive(connection)) {
                signalR.transports._logic.monitorKeepAlive(connection);
              }

              signalR.transports._logic.startHeartbeat(connection);

              // Used to ensure low activity clients maintain their authentication.
              // Must be configured once a transport has been decided to perform valid ping requests.
              signalR._.configurePingInterval(connection);

              if (
                !changeState(
                  connection,
                  signalR.connectionState.connecting,
                  signalR.connectionState.connected
                )
              ) {
                connection.log(
                  "WARNING! The connection was not in the connecting state."
                );
              }

              // Drain any incoming buffered messages (messages that came in prior to connect)
              connection._.connectingMessageBuffer.drain();

              $(connection).triggerHandler(events.onStart);
            },
            onFallback
          );
        } catch (error) {
          connection.log(
            transport.name +
              " transport threw '" +
              error.message +
              "' when attempting to start."
          );
          onFallback();
        }
      };

      var url = connection.url + "/negotiate",
        onFailed = function(error, connection) {
          var err = signalR._.error(
            resources.errorOnNegotiate,
            error,
            connection._.negotiateRequest
          );

          $(connection).triggerHandler(events.onError, err);
          deferred.reject(err);
          // Stop the connection if negotiate failed
          connection.stop();
        };

      $(connection).triggerHandler(events.onStarting);

      url = signalR.transports._logic.prepareQueryString(connection, url);

      connection.log("Negotiating with '" + url + "'.");

      // Save the ajax negotiate request object so we can abort it if stop is called while the request is in flight.
      connection._.negotiateRequest = signalR.transports._logic.ajax(
        connection,
        {
          url: url,
          error: function(error, statusText) {
            // We don't want to cause any errors if we're aborting our own negotiate request.
            if (statusText !== _negotiateAbortText) {
              onFailed(error, connection);
            } else {
              // This rejection will noop if the deferred has already been resolved or rejected.
              deferred.reject(
                signalR._.error(
                  resources.stoppedWhileNegotiating,
                  null /* error */,
                  connection._.negotiateRequest
                )
              );
            }
          },
          success: function(result) {
            var res,
              keepAliveData,
              protocolError,
              transports = [],
              supportedTransports = [];

            try {
              res = connection._parseResponse(result);
            } catch (error) {
              onFailed(
                signalR._.error(resources.errorParsingNegotiateResponse, error),
                connection
              );
              return;
            }

            keepAliveData = connection._.keepAliveData;
            connection.appRelativeUrl = res.Url;
            connection.id = res.ConnectionId;
            connection.token = res.ConnectionToken;
            connection.webSocketServerUrl = res.WebSocketServerUrl;

            // The long poll timeout is the ConnectionTimeout plus 10 seconds
            connection._.pollTimeout = res.ConnectionTimeout * 1000 + 10000; // in ms

            // Once the server has labeled the PersistentConnection as Disconnected, we should stop attempting to reconnect
            // after res.DisconnectTimeout seconds.
            connection.disconnectTimeout = res.DisconnectTimeout * 1000; // in ms

            // Add the TransportConnectTimeout from the response to the transportConnectTimeout from the client to calculate the total timeout
            connection._.totalTransportConnectTimeout =
              connection.transportConnectTimeout +
              res.TransportConnectTimeout * 1000;

            // If we have a keep alive
            if (res.KeepAliveTimeout) {
              // Register the keep alive data as activated
              keepAliveData.activated = true;

              // Timeout to designate when to force the connection into reconnecting converted to milliseconds
              keepAliveData.timeout = res.KeepAliveTimeout * 1000;

              // Timeout to designate when to warn the developer that the connection may be dead or is not responding.
              keepAliveData.timeoutWarning =
                keepAliveData.timeout * connection.keepAliveWarnAt;

              // Instantiate the frequency in which we check the keep alive.  It must be short in order to not miss/pick up any changes
              connection._.beatInterval =
                (keepAliveData.timeout - keepAliveData.timeoutWarning) / 3;
            } else {
              keepAliveData.activated = false;
            }

            connection.reconnectWindow =
              connection.disconnectTimeout + (keepAliveData.timeout || 0);

            if (
              !res.ProtocolVersion ||
              res.ProtocolVersion !== connection.clientProtocol
            ) {
              protocolError = signalR._.error(
                signalR._.format(
                  resources.protocolIncompatible,
                  connection.clientProtocol,
                  res.ProtocolVersion
                )
              );
              $(connection).triggerHandler(events.onError, [protocolError]);
              deferred.reject(protocolError);

              return;
            }

            $.each(signalR.transports, function(key) {
              if (
                key.indexOf("_") === 0 ||
                (key === "webSockets" && !res.TryWebSockets)
              ) {
                return true;
              }
              supportedTransports.push(key);
            });

            if ($.isArray(config.transport)) {
              $.each(config.transport, function(_, transport) {
                if ($.inArray(supportedTransports, transport)) {
                  transports.push(transport);
                }
              });
            } else if (config.transport === "auto") {
              transports = supportedTransports;
            } else if ($.inArray(supportedTransports, transport)) {
              transports.push(config.transport);
            }

            initialize(transports);
          }
        }
      );

      return deferred.promise();
    },

    starting: function(callback) {
      /// <summary>Adds a callback that will be invoked before anything is sent over the connection</summary>
      /// <param name="callback" type="Function">A callback function to execute before the connection is fully instantiated.</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onStarting, function(e, data) {
        callback.call(connection);
      });
      return connection;
    },

    send: function(data) {
      /// <summary>Sends data over the connection</summary>
      /// <param name="data" type="String">The data to send over the connection</param>
      /// <returns type="signalR" />
      var connection = this;

      if (connection.state === signalR.connectionState.disconnected) {
        // Connection hasn't been started yet
        throw new Error(
          "SignalR: Connection must be started before data can be sent. Call .start() before .send()"
        );
      }

      if (connection.state === signalR.connectionState.connecting) {
        // Connection hasn't been started yet
        throw new Error(
          "SignalR: Connection has not been fully initialized. Use .start().done() or .start().fail() to run logic after the connection has started."
        );
      }

      connection.transport.send(connection, data);
      // REVIEW: Should we return deferred here?
      return connection;
    },

    received: function(callback) {
      /// <summary>Adds a callback that will be invoked after anything is received over the connection</summary>
      /// <param name="callback" type="Function">A callback function to execute when any data is received on the connection</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onReceived, function(e, data) {
        callback.call(connection, data);
      });
      return connection;
    },

    stateChanged: function(callback) {
      /// <summary>Adds a callback that will be invoked when the connection state changes</summary>
      /// <param name="callback" type="Function">A callback function to execute when the connection state changes</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onStateChanged, function(e, data) {
        callback.call(connection, data);
      });
      return connection;
    },

    error: function(callback) {
      /// <summary>Adds a callback that will be invoked after an error occurs with the connection</summary>
      /// <param name="callback" type="Function">A callback function to execute when an error occurs on the connection</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onError, function(e, errorData, sendData) {
        connection.lastError = errorData;
        // In practice 'errorData' is the SignalR built error object.
        // In practice 'sendData' is undefined for all error events except those triggered by
        // 'ajaxSend' and 'webSockets.send'.'sendData' is the original send payload.
        callback.call(connection, errorData, sendData);
      });
      return connection;
    },

    disconnected: function(callback) {
      /// <summary>Adds a callback that will be invoked when the client disconnects</summary>
      /// <param name="callback" type="Function">A callback function to execute when the connection is broken</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onDisconnect, function(e, data) {
        callback.call(connection);
      });
      return connection;
    },

    connectionSlow: function(callback) {
      /// <summary>Adds a callback that will be invoked when the client detects a slow connection</summary>
      /// <param name="callback" type="Function">A callback function to execute when the connection is slow</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onConnectionSlow, function(e, data) {
        callback.call(connection);
      });

      return connection;
    },

    reconnecting: function(callback) {
      /// <summary>Adds a callback that will be invoked when the underlying transport begins reconnecting</summary>
      /// <param name="callback" type="Function">A callback function to execute when the connection enters a reconnecting state</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onReconnecting, function(e, data) {
        callback.call(connection);
      });
      return connection;
    },

    reconnected: function(callback) {
      /// <summary>Adds a callback that will be invoked when the underlying transport reconnects</summary>
      /// <param name="callback" type="Function">A callback function to execute when the connection is restored</param>
      /// <returns type="signalR" />
      var connection = this;
      $(connection).bind(events.onReconnect, function(e, data) {
        callback.call(connection);
      });
      return connection;
    },

    stop: function(async, notifyServer) {
      /// <summary>Stops listening</summary>
      /// <param name="async" type="Boolean">Whether or not to asynchronously abort the connection</param>
      /// <param name="notifyServer" type="Boolean">Whether we want to notify the server that we are aborting the connection</param>
      /// <returns type="signalR" />
      var connection = this,
        // Save deferral because this is always cleaned up
        deferral = connection._deferral;

      // Always clean up private non-timeout based state.
      delete connection._.config;

      if (connection.state === signalR.connectionState.disconnected) {
        return;
      }

      connection.log("Stopping connection.");

      // Clear this no matter what
      clearTimeout(connection._.beatHandle);
      clearInterval(connection._.pingIntervalId);

      if (connection.transport) {
        connection.transport.stop(connection);

        if (notifyServer !== false) {
          connection.transport.abort(connection, async);
        }

        if (supportsKeepAlive(connection)) {
          signalR.transports._logic.stopMonitoringKeepAlive(connection);
        }

        connection.transport = null;
      }

      if (connection._.negotiateRequest) {
        // If the negotiation request has already completed this will noop.
        connection._.negotiateRequest.abort(_negotiateAbortText);
        delete connection._.negotiateRequest;
      }

      // Ensure that initHandler.stop() is called before connection._deferral is deleted
      if (connection._.initHandler) {
        connection._.initHandler.stop();
      }

      delete connection._deferral;
      delete connection.messageId;
      delete connection.groupsToken;
      delete connection.id;
      delete connection._.pingIntervalId;
      delete connection._.lastMessageAt;
      delete connection._.lastActiveAt;

      // Clear out our message buffer
      connection._.connectingMessageBuffer.clear();

      // Trigger the disconnect event
      changeState(
        connection,
        connection.state,
        signalR.connectionState.disconnected
      );
      $(connection).triggerHandler(events.onDisconnect);

      return connection;
    },

    log: function(msg) {
      log(msg, this.logging);
    }
  };

  signalR.fn.init.prototype = signalR.fn;

  signalR.noConflict = function() {
    /// <summary>Reinstates the original value of $.connection and returns the signalR object for manual assignment</summary>
    /// <returns type="signalR" />
    if ($.connection === signalR) {
      $.connection = _connection;
    }
    return signalR;
  };

  if ($.connection) {
    _connection = $.connection;
  }

  $.connection = $.signalR = signalR;
})(jQueryShim);
/* jquery.signalR.transports.common.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/// <reference path="jquery.signalR.core.js" />

(function($, undefined) {
  var signalR = $.signalR,
    events = $.signalR.events,
    changeState = $.signalR.changeState,
    startAbortText = "__Start Aborted__",
    transportLogic;

  signalR.transports = {};

  function beat(connection) {
    if (connection._.keepAliveData.monitoring) {
      checkIfAlive(connection);
    }

    // Ensure that we successfully marked active before continuing the heartbeat.
    if (transportLogic.markActive(connection)) {
      connection._.beatHandle = setTimeout(function() {
        beat(connection);
      }, connection._.beatInterval);
    }
  }

  function checkIfAlive(connection) {
    var keepAliveData = connection._.keepAliveData,
      timeElapsed;

    // Only check if we're connected
    if (connection.state === signalR.connectionState.connected) {
      timeElapsed = new Date().getTime() - connection._.lastMessageAt;

      // Check if the keep alive has completely timed out
      if (timeElapsed >= keepAliveData.timeout) {
        connection.log(
          "Keep alive timed out.  Notifying transport that connection has been lost."
        );

        // Notify transport that the connection has been lost
        connection.transport.lostConnection(connection);
      } else if (timeElapsed >= keepAliveData.timeoutWarning) {
        // This is to assure that the user only gets a single warning
        if (!keepAliveData.userNotified) {
          connection.log(
            "Keep alive has been missed, connection may be dead/slow."
          );
          $(connection).triggerHandler(events.onConnectionSlow);
          keepAliveData.userNotified = true;
        }
      } else {
        keepAliveData.userNotified = false;
      }
    }
  }

  function getAjaxUrl(connection, path) {
    var url = connection.url + path;

    if (connection.transport) {
      url += "?transport=" + connection.transport.name;
    }

    return transportLogic.prepareQueryString(connection, url);
  }

  function InitHandler(connection) {
    this.connection = connection;

    this.startRequested = false;
    this.startCompleted = false;
    this.connectionStopped = false;
  }

  InitHandler.prototype = {
    start: function(transport, onSuccess, onFallback) {
      var that = this,
        connection = that.connection,
        failCalled = false;

      if (that.startRequested || that.connectionStopped) {
        connection.log(
          "WARNING! " +
            transport.name +
            " transport cannot be started. Initialization ongoing or completed."
        );
        return;
      }

      connection.log(transport.name + " transport starting.");

      transport.start(
        connection,
        function() {
          if (!failCalled) {
            that.initReceived(transport, onSuccess);
          }
        },
        function(error) {
          // Don't allow the same transport to cause onFallback to be called twice
          if (!failCalled) {
            failCalled = true;
            that.transportFailed(transport, error, onFallback);
          }

          // Returns true if the transport should stop;
          // false if it should attempt to reconnect
          return !that.startCompleted || that.connectionStopped;
        }
      );

      that.transportTimeoutHandle = setTimeout(function() {
        if (!failCalled) {
          failCalled = true;
          connection.log(
            transport.name + " transport timed out when trying to connect."
          );
          that.transportFailed(transport, undefined, onFallback);
        }
      }, connection._.totalTransportConnectTimeout);
    },

    stop: function() {
      this.connectionStopped = true;
      clearTimeout(this.transportTimeoutHandle);
      signalR.transports._logic.tryAbortStartRequest(this.connection);
    },

    initReceived: function(transport, onSuccess) {
      var that = this,
        connection = that.connection;

      if (that.startRequested) {
        connection.log("WARNING! The client received multiple init messages.");
        return;
      }

      if (that.connectionStopped) {
        return;
      }

      that.startRequested = true;
      clearTimeout(that.transportTimeoutHandle);

      connection.log(
        transport.name + " transport connected. Initiating start request."
      );
      signalR.transports._logic.ajaxStart(connection, function() {
        that.startCompleted = true;
        onSuccess();
      });
    },

    transportFailed: function(transport, error, onFallback) {
      var connection = this.connection,
        deferred = connection._deferral,
        wrappedError;

      if (this.connectionStopped) {
        return;
      }

      clearTimeout(this.transportTimeoutHandle);

      if (!this.startRequested) {
        transport.stop(connection);

        connection.log(
          transport.name +
            " transport failed to connect. Attempting to fall back."
        );
        onFallback();
      } else if (!this.startCompleted) {
        // Do not attempt to fall back if a start request is ongoing during a transport failure.
        // Instead, trigger an error and stop the connection.
        wrappedError = signalR._.error(
          signalR.resources.errorDuringStartRequest,
          error
        );

        connection.log(
          transport.name +
            " transport failed during the start request. Stopping the connection."
        );
        $(connection).triggerHandler(events.onError, [wrappedError]);
        if (deferred) {
          deferred.reject(wrappedError);
        }

        connection.stop();
      } else {
        // The start request has completed, but the connection has not stopped.
        // No need to do anything here. The transport should attempt its normal reconnect logic.
      }
    }
  };

  transportLogic = signalR.transports._logic = {
    ajax: function(connection, options) {
      return $.ajax(
        $.extend(
          /*deep copy*/ true,
          {},
          $.signalR.ajaxDefaults,
          {
            type: "GET",
            data: {},
            xhrFields: { withCredentials: connection.withCredentials },
            contentType: connection.contentType,
            dataType: connection.ajaxDataType,
            extraHeaders: connection.extraHeaders
          },
          options
        )
      );
    },

    pingServer: function(connection) {
      /// <summary>Pings the server</summary>
      /// <param name="connection" type="signalr">Connection associated with the server ping</param>
      /// <returns type="signalR" />
      var url,
        xhr,
        deferral = $.Deferred();

      if (connection.transport) {
        url = connection.url + "/ping";

        url = transportLogic.addQs(url, connection.qs);

        xhr = transportLogic.ajax(connection, {
          url: url,
          success: function(result) {
            var data;

            try {
              data = connection._parseResponse(result);
            } catch (error) {
              deferral.reject(
                signalR._.transportError(
                  signalR.resources.pingServerFailedParse,
                  connection.transport,
                  error,
                  xhr
                )
              );
              connection.stop();
              return;
            }

            if (data.Response === "pong") {
              deferral.resolve();
            } else {
              deferral.reject(
                signalR._.transportError(
                  signalR._.format(
                    signalR.resources.pingServerFailedInvalidResponse,
                    result
                  ),
                  connection.transport,
                  null /* error */,
                  xhr
                )
              );
            }
          },
          error: function(error) {
            if (error.status === 401 || error.status === 403) {
              deferral.reject(
                signalR._.transportError(
                  signalR._.format(
                    signalR.resources.pingServerFailedStatusCode,
                    error.status
                  ),
                  connection.transport,
                  error,
                  xhr
                )
              );
              connection.stop();
            } else {
              deferral.reject(
                signalR._.transportError(
                  signalR.resources.pingServerFailed,
                  connection.transport,
                  error,
                  xhr
                )
              );
            }
          }
        });
      } else {
        deferral.reject(
          signalR._.transportError(
            signalR.resources.noConnectionTransport,
            connection.transport
          )
        );
      }

      return deferral.promise();
    },

    prepareQueryString: function(connection, url) {
      var preparedUrl;

      // Use addQs to start since it handles the ?/& prefix for us
      preparedUrl = transportLogic.addQs(
        url,
        "clientProtocol=" + connection.clientProtocol
      );

      // Add the user-specified query string params if any
      preparedUrl = transportLogic.addQs(preparedUrl, connection.qs);

      if (connection.token) {
        preparedUrl +=
          "&connectionToken=" + encodeURIComponent(connection.token);
      }

      if (connection.data) {
        preparedUrl += "&connectionData=" + encodeURIComponent(connection.data);
      }

      return preparedUrl;
    },

    addQs: function(url, qs) {
      var appender = url.indexOf("?") !== -1 ? "&" : "?",
        firstChar;

      if (!qs) {
        return url;
      }

      if (typeof qs === "object") {
        return url + appender + $.param(qs);
      }

      if (typeof qs === "string") {
        firstChar = qs.charAt(0);

        if (firstChar === "?" || firstChar === "&") {
          appender = "";
        }

        return url + appender + qs;
      }

      throw new Error(
        "Query string property must be either a string or object."
      );
    },

    // BUG #2953: The url needs to be same otherwise it will cause a memory leak
    getUrl: function(connection, transport, reconnecting, poll, ajaxPost) {
      /// <summary>Gets the url for making a GET based connect request</summary>
      var baseUrl = transport === "webSockets" ? "" : connection.baseUrl,
        url = baseUrl + connection.appRelativeUrl,
        qs = "transport=" + transport;

      if (!ajaxPost && connection.groupsToken) {
        qs += "&groupsToken=" + encodeURIComponent(connection.groupsToken);
      }

      if (!reconnecting) {
        url += "/connect";
      } else {
        if (poll) {
          // longPolling transport specific
          url += "/poll";
        } else {
          url += "/reconnect";
        }

        if (!ajaxPost && connection.messageId) {
          qs += "&messageId=" + encodeURIComponent(connection.messageId);
        }
      }
      url += "?" + qs;
      url = transportLogic.prepareQueryString(connection, url);

      if (!ajaxPost) {
        url += "&tid=" + Math.floor(Math.random() * 11);
      }

      return url;
    },

    maximizePersistentResponse: function(minPersistentResponse) {
      return {
        MessageId: minPersistentResponse.C,
        Messages: minPersistentResponse.M,
        Initialized:
          typeof minPersistentResponse.S !== "undefined" ? true : false,
        ShouldReconnect:
          typeof minPersistentResponse.T !== "undefined" ? true : false,
        LongPollDelay: minPersistentResponse.L,
        GroupsToken: minPersistentResponse.G
      };
    },

    updateGroups: function(connection, groupsToken) {
      if (groupsToken) {
        connection.groupsToken = groupsToken;
      }
    },

    stringifySend: function(connection, message) {
      if (
        typeof message === "string" ||
        typeof message === "undefined" ||
        message === null
      ) {
        return message;
      }
      return connection.json.stringify(message);
    },

    ajaxSend: function(connection, data) {
      var payload = transportLogic.stringifySend(connection, data),
        url = getAjaxUrl(connection, "/send"),
        xhr,
        onFail = function(error, connection) {
          $(connection).triggerHandler(events.onError, [
            signalR._.transportError(
              signalR.resources.sendFailed,
              connection.transport,
              error,
              xhr
            ),
            data
          ]);
        };

      xhr = transportLogic.ajax(connection, {
        url: url,
        type: connection.ajaxDataType === "jsonp" ? "GET" : "POST",
        contentType: signalR._.defaultContentType,
        data: {
          data: payload
        },
        success: function(result) {
          var res;

          if (result) {
            try {
              res = connection._parseResponse(result);
            } catch (error) {
              onFail(error, connection);
              connection.stop();
              return;
            }

            transportLogic.triggerReceived(connection, res);
          }
        },
        error: function(error, textStatus) {
          if (textStatus === "abort" || textStatus === "parsererror") {
            // The parsererror happens for sends that don't return any data, and hence
            // don't write the jsonp callback to the response. This is harder to fix on the server
            // so just hack around it on the client for now.
            return;
          }

          onFail(error, connection);
        }
      });

      return xhr;
    },

    ajaxAbort: function(connection, async) {
      if (typeof connection.transport === "undefined") {
        return;
      }

      // Async by default unless explicitly overidden
      async = typeof async === "undefined" ? true : async;

      var url = getAjaxUrl(connection, "/abort");

      transportLogic.ajax(connection, {
        url: url,
        async: async,
        timeout: 1000,
        type: "POST"
      });

      connection.log("Fired ajax abort async = " + async + ".");
    },

    ajaxStart: function(connection, onSuccess) {
      var rejectDeferred = function(error) {
          var deferred = connection._deferral;
          if (deferred) {
            deferred.reject(error);
          }
        },
        triggerStartError = function(error) {
          connection.log("The start request failed. Stopping the connection.");
          $(connection).triggerHandler(events.onError, [error]);
          rejectDeferred(error);
          connection.stop();
        };

      connection._.startRequest = transportLogic.ajax(connection, {
        url: getAjaxUrl(connection, "/start"),
        success: function(result, statusText, xhr) {
          var data;

          try {
            data = connection._parseResponse(result);
          } catch (error) {
            triggerStartError(
              signalR._.error(
                signalR._.format(
                  signalR.resources.errorParsingStartResponse,
                  result
                ),
                error,
                xhr
              )
            );
            return;
          }

          if (data.Response === "started") {
            onSuccess();
          } else {
            triggerStartError(
              signalR._.error(
                signalR._.format(
                  signalR.resources.invalidStartResponse,
                  result
                ),
                null /* error */,
                xhr
              )
            );
          }
        },
        error: function(xhr, statusText, error) {
          if (statusText !== startAbortText) {
            triggerStartError(
              signalR._.error(
                signalR.resources.errorDuringStartRequest,
                error,
                xhr
              )
            );
          } else {
            // Stop has been called, no need to trigger the error handler
            // or stop the connection again with onStartError
            connection.log(
              "The start request aborted because connection.stop() was called."
            );
            rejectDeferred(
              signalR._.error(
                signalR.resources.stoppedDuringStartRequest,
                null /* error */,
                xhr
              )
            );
          }
        }
      });
    },

    tryAbortStartRequest: function(connection) {
      if (connection._.startRequest) {
        // If the start request has already completed this will noop.
        connection._.startRequest.abort(startAbortText);
        delete connection._.startRequest;
      }
    },

    tryInitialize: function(connection, persistentResponse, onInitialized) {
      if (persistentResponse.Initialized && onInitialized) {
        onInitialized();
      } else if (persistentResponse.Initialized) {
        connection.log(
          "WARNING! The client received an init message after reconnecting."
        );
      }
    },

    triggerReceived: function(connection, data) {
      if (!connection._.connectingMessageBuffer.tryBuffer(data)) {
        $(connection).triggerHandler(events.onReceived, [data]);
      }
    },

    processMessages: function(connection, minData, onInitialized) {
      var data;

      // Update the last message time stamp
      transportLogic.markLastMessage(connection);

      if (minData) {
        data = transportLogic.maximizePersistentResponse(minData);

        transportLogic.updateGroups(connection, data.GroupsToken);

        if (data.MessageId) {
          connection.messageId = data.MessageId;
        }

        if (data.Messages) {
          $.each(data.Messages, function(index, message) {
            transportLogic.triggerReceived(connection, message);
          });

          transportLogic.tryInitialize(connection, data, onInitialized);
        }
      }
    },

    monitorKeepAlive: function(connection) {
      var keepAliveData = connection._.keepAliveData;

      // If we haven't initiated the keep alive timeouts then we need to
      if (!keepAliveData.monitoring) {
        keepAliveData.monitoring = true;

        transportLogic.markLastMessage(connection);

        // Save the function so we can unbind it on stop
        connection._.keepAliveData.reconnectKeepAliveUpdate = function() {
          // Mark a new message so that keep alive doesn't time out connections
          transportLogic.markLastMessage(connection);
        };

        // Update Keep alive on reconnect
        $(connection).bind(
          events.onReconnect,
          connection._.keepAliveData.reconnectKeepAliveUpdate
        );

        connection.log(
          "Now monitoring keep alive with a warning timeout of " +
            keepAliveData.timeoutWarning +
            ", keep alive timeout of " +
            keepAliveData.timeout +
            " and disconnecting timeout of " +
            connection.disconnectTimeout
        );
      } else {
        connection.log(
          "Tried to monitor keep alive but it's already being monitored."
        );
      }
    },

    stopMonitoringKeepAlive: function(connection) {
      var keepAliveData = connection._.keepAliveData;

      // Only attempt to stop the keep alive monitoring if its being monitored
      if (keepAliveData.monitoring) {
        // Stop monitoring
        keepAliveData.monitoring = false;

        // Remove the updateKeepAlive function from the reconnect event
        $(connection).unbind(
          events.onReconnect,
          connection._.keepAliveData.reconnectKeepAliveUpdate
        );

        // Clear all the keep alive data
        connection._.keepAliveData = {};
        connection.log("Stopping the monitoring of the keep alive.");
      }
    },

    startHeartbeat: function(connection) {
      connection._.lastActiveAt = new Date().getTime();
      beat(connection);
    },

    markLastMessage: function(connection) {
      connection._.lastMessageAt = new Date().getTime();
    },

    markActive: function(connection) {
      if (transportLogic.verifyLastActive(connection)) {
        connection._.lastActiveAt = new Date().getTime();
        return true;
      }

      return false;
    },

    isConnectedOrReconnecting: function(connection) {
      return (
        connection.state === signalR.connectionState.connected ||
        connection.state === signalR.connectionState.reconnecting
      );
    },

    ensureReconnectingState: function(connection) {
      if (
        changeState(
          connection,
          signalR.connectionState.connected,
          signalR.connectionState.reconnecting
        ) === true
      ) {
        $(connection).triggerHandler(events.onReconnecting);
      }
      return connection.state === signalR.connectionState.reconnecting;
    },

    clearReconnectTimeout: function(connection) {
      if (connection && connection._.reconnectTimeout) {
        clearTimeout(connection._.reconnectTimeout);
        delete connection._.reconnectTimeout;
      }
    },

    verifyLastActive: function(connection) {
      if (
        new Date().getTime() - connection._.lastActiveAt >=
        connection.reconnectWindow
      ) {
        var message = signalR._.format(
          signalR.resources.reconnectWindowTimeout,
          new Date(connection._.lastActiveAt),
          connection.reconnectWindow
        );
        connection.log(message);
        $(connection).triggerHandler(events.onError, [
          signalR._.error(message, /* source */ "TimeoutException")
        ]);
        connection.stop(/* async */ false, /* notifyServer */ false);
        return false;
      }

      return true;
    },

    reconnect: function(connection, transportName) {
      var transport = signalR.transports[transportName];

      // We should only set a reconnectTimeout if we are currently connected
      // and a reconnectTimeout isn't already set.
      if (
        transportLogic.isConnectedOrReconnecting(connection) &&
        !connection._.reconnectTimeout
      ) {
        // Need to verify before the setTimeout occurs because an application sleep could occur during the setTimeout duration.
        if (!transportLogic.verifyLastActive(connection)) {
          return;
        }

        connection._.reconnectTimeout = setTimeout(function() {
          if (!transportLogic.verifyLastActive(connection)) {
            return;
          }

          transport.stop(connection);

          if (transportLogic.ensureReconnectingState(connection)) {
            connection.log(transportName + " reconnecting.");
            transport.start(connection);
          }
        }, connection.reconnectDelay);
      }
    },

    handleParseFailure: function(connection, result, error, onFailed, context) {
      var wrappedError = signalR._.transportError(
        signalR._.format(signalR.resources.parseFailed, result),
        connection.transport,
        error,
        context
      );

      // If we're in the initialization phase trigger onFailed, otherwise stop the connection.
      if (onFailed && onFailed(wrappedError)) {
        connection.log(
          "Failed to parse server response while attempting to connect."
        );
      } else {
        $(connection).triggerHandler(events.onError, [wrappedError]);
        connection.stop();
      }
    },

    initHandler: function(connection) {
      return new InitHandler(connection);
    }
  };
})(jQueryShim);
/* jquery.signalR.transports.webSockets.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/// <reference path="jquery.signalR.transports.common.js" />

(function($, undefined) {
  var signalR = $.signalR,
    events = $.signalR.events,
    changeState = $.signalR.changeState,
    transportLogic = signalR.transports._logic;

  signalR.transports.webSockets = {
    name: "webSockets",

    supportsKeepAlive: function() {
      return true;
    },

    send: function(connection, data) {
      var payload = transportLogic.stringifySend(connection, data);

      try {
        connection.socket.send(payload);
      } catch (ex) {
        $(connection).triggerHandler(events.onError, [
          signalR._.transportError(
            signalR.resources.webSocketsInvalidState,
            connection.transport,
            ex,
            connection.socket
          ),
          data
        ]);
      }
    },

    start: function(connection, onSuccess, onFailed) {
      var url,
        opened = false,
        that = this,
        reconnecting = !onSuccess,
        $connection = $(connection);

      if (!WebSocket) {
        onFailed();
        return;
      }

      if (!connection.socket) {
        if (connection.webSocketServerUrl) {
          url = connection.webSocketServerUrl;
        } else {
          url = connection.wsProtocol + connection.host;
        }

        url += transportLogic.getUrl(connection, this.name, reconnecting);

        connection.log("Connecting to websocket endpoint '" + url + "'.");
        connection.socket = new WebSocket(url);

        connection.socket.onopen = function() {
          opened = true;
          connection.log("Websocket opened.");

          transportLogic.clearReconnectTimeout(connection);

          if (
            changeState(
              connection,
              signalR.connectionState.reconnecting,
              signalR.connectionState.connected
            ) === true
          ) {
            $connection.triggerHandler(events.onReconnect);
          }
        };

        connection.socket.onclose = function(event) {
          var error;

          // Only handle a socket close if the close is from the current socket.
          // Sometimes on disconnect the server will push down an onclose event
          // to an expired socket.

          if (this === connection.socket) {
            if (
              opened &&
              typeof event.wasClean !== "undefined" &&
              event.wasClean === false
            ) {
              // Ideally this would use the websocket.onerror handler (rather than checking wasClean in onclose) but
              // I found in some circumstances Chrome won't call onerror. This implementation seems to work on all browsers.
              error = signalR._.transportError(
                signalR.resources.webSocketClosed,
                connection.transport,
                event
              );

              connection.log(
                "Unclean disconnect from websocket: " +
                  (event.reason || "[no reason given].")
              );
            } else {
              connection.log("Websocket closed.");
            }

            if (!onFailed || !onFailed(error)) {
              if (error) {
                $(connection).triggerHandler(events.onError, [error]);
              }

              that.reconnect(connection);
            }
          }
        };

        connection.socket.onmessage = function(event) {
          var data;

          try {
            data = connection._parseResponse(event.data);
          } catch (error) {
            transportLogic.handleParseFailure(
              connection,
              event.data,
              error,
              onFailed,
              event
            );
            return;
          }

          if (data) {
            // data.M is PersistentResponse.Messages
            if ($.isEmptyObject(data) || data.M) {
              transportLogic.processMessages(connection, data, onSuccess);
            } else {
              // For websockets we need to trigger onReceived
              // for callbacks to outgoing hub calls.
              transportLogic.triggerReceived(connection, data);
            }
          }
        };
      }
    },

    reconnect: function(connection) {
      transportLogic.reconnect(connection, this.name);
    },

    lostConnection: function(connection) {
      this.reconnect(connection);
    },

    stop: function(connection) {
      // Don't trigger a reconnect after stopping
      transportLogic.clearReconnectTimeout(connection);

      if (connection.socket) {
        connection.log("Closing the Websocket.");
        connection.socket.close();
        connection.socket = null;
      }
    },

    abort: function(connection, async) {
      transportLogic.ajaxAbort(connection, async);
    }
  };
})(jQueryShim);
/* jquery.signalR.transports.longPolling.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/// <reference path="jquery.signalR.transports.common.js" />

(function($, undefined) {
  var signalR = $.signalR,
    events = $.signalR.events,
    changeState = $.signalR.changeState,
    isDisconnecting = $.signalR.isDisconnecting,
    transportLogic = signalR.transports._logic;

  signalR.transports.longPolling = {
    name: "longPolling",

    supportsKeepAlive: function() {
      return false;
    },

    reconnectDelay: 3000,

    start: function(connection, onSuccess, onFailed) {
      /// <summary>Starts the long polling connection</summary>
      /// <param name="connection" type="signalR">The SignalR connection to start</param>
      var that = this,
        fireConnect = function() {
          fireConnect = $.noop;

          connection.log("LongPolling connected.");

          if (onSuccess) {
            onSuccess();
          } else {
            connection.log(
              "WARNING! The client received an init message after reconnecting."
            );
          }
        },
        tryFailConnect = function(error) {
          if (onFailed(error)) {
            connection.log("LongPolling failed to connect.");
            return true;
          }

          return false;
        },
        privateData = connection._,
        reconnectErrors = 0,
        fireReconnected = function(instance) {
          clearTimeout(privateData.reconnectTimeoutId);
          privateData.reconnectTimeoutId = null;

          if (
            changeState(
              instance,
              signalR.connectionState.reconnecting,
              signalR.connectionState.connected
            ) === true
          ) {
            // Successfully reconnected!
            instance.log("Raising the reconnect event");
            $(instance).triggerHandler(events.onReconnect);
          }
        },
        // 1 hour
        maxFireReconnectedTimeout = 3600000;

      if (connection.pollXhr) {
        connection.log("Polling xhr requests already exists, aborting.");
        connection.stop();
      }

      connection.messageId = null;

      privateData.reconnectTimeoutId = null;

      privateData.pollTimeoutId = setTimeout(function() {
        (function poll(instance, raiseReconnect) {
          var messageId = instance.messageId,
            connect = messageId === null,
            reconnecting = !connect,
            polling = !raiseReconnect,
            url = transportLogic.getUrl(
              instance,
              that.name,
              reconnecting,
              polling,
              true /* use Post for longPolling */
            ),
            postData = {};

          if (instance.messageId) {
            postData.messageId = instance.messageId;
          }

          if (instance.groupsToken) {
            postData.groupsToken = instance.groupsToken;
          }

          // If we've disconnected during the time we've tried to re-instantiate the poll then stop.
          if (isDisconnecting(instance) === true) {
            return;
          }

          connection.log("Opening long polling request to '" + url + "'.");
          instance.pollXhr = transportLogic.ajax(connection, {
            xhrFields: {
              onprogress: function() {
                transportLogic.markLastMessage(connection);
              }
            },
            url: url,
            type: "POST",
            contentType: signalR._.defaultContentType,
            data: postData,
            timeout: connection._.pollTimeout,
            success: function(result) {
              var minData,
                delay = 0,
                data,
                shouldReconnect;

              connection.log("Long poll complete.");

              // Reset our reconnect errors so if we transition into a reconnecting state again we trigger
              // reconnected quickly
              reconnectErrors = 0;

              try {
                // Remove any keep-alives from the beginning of the result
                minData = connection._parseResponse(result);
              } catch (error) {
                transportLogic.handleParseFailure(
                  instance,
                  result,
                  error,
                  tryFailConnect,
                  instance.pollXhr
                );
                return;
              }

              // If there's currently a timeout to trigger reconnect, fire it now before processing messages
              if (privateData.reconnectTimeoutId !== null) {
                fireReconnected(instance);
              }

              if (minData) {
                data = transportLogic.maximizePersistentResponse(minData);
              }

              transportLogic.processMessages(instance, minData, fireConnect);

              if (data && $.type(data.LongPollDelay) === "number") {
                delay = data.LongPollDelay;
              }

              if (isDisconnecting(instance) === true) {
                return;
              }

              shouldReconnect = data && data.ShouldReconnect;
              if (shouldReconnect) {
                // Transition into the reconnecting state
                // If this fails then that means that the user transitioned the connection into a invalid state in processMessages.
                if (!transportLogic.ensureReconnectingState(instance)) {
                  return;
                }
              }

              // We never want to pass a raiseReconnect flag after a successful poll.  This is handled via the error function
              if (delay > 0) {
                privateData.pollTimeoutId = setTimeout(function() {
                  poll(instance, shouldReconnect);
                }, delay);
              } else {
                poll(instance, shouldReconnect);
              }
            },

            error: function(data, textStatus) {
              var error = signalR._.transportError(
                signalR.resources.longPollFailed,
                connection.transport,
                data,
                instance.pollXhr
              );

              // Stop trying to trigger reconnect, connection is in an error state
              // If we're not in the reconnect state this will noop
              clearTimeout(privateData.reconnectTimeoutId);
              privateData.reconnectTimeoutId = null;

              if (textStatus === "abort") {
                connection.log("Aborted xhr request.");
                return;
              }

              if (!tryFailConnect(error)) {
                // Increment our reconnect errors, we assume all errors to be reconnect errors
                // In the case that it's our first error this will cause Reconnect to be fired
                // after 1 second due to reconnectErrors being = 1.
                reconnectErrors++;

                if (connection.state !== signalR.connectionState.reconnecting) {
                  connection.log(
                    "An error occurred using longPolling. Status = " +
                      textStatus +
                      ".  Response = " +
                      data.responseText +
                      "."
                  );
                  $(instance).triggerHandler(events.onError, [error]);
                }

                // We check the state here to verify that we're not in an invalid state prior to verifying Reconnect.
                // If we're not in connected or reconnecting then the next ensureReconnectingState check will fail and will return.
                // Therefore we don't want to change that failure code path.
                if (
                  (connection.state === signalR.connectionState.connected ||
                    connection.state ===
                      signalR.connectionState.reconnecting) &&
                  !transportLogic.verifyLastActive(connection)
                ) {
                  return;
                }

                // Transition into the reconnecting state
                // If this fails then that means that the user transitioned the connection into the disconnected or connecting state within the above error handler trigger.
                if (!transportLogic.ensureReconnectingState(instance)) {
                  return;
                }

                // Call poll with the raiseReconnect flag as true after the reconnect delay
                privateData.pollTimeoutId = setTimeout(function() {
                  poll(instance, true);
                }, that.reconnectDelay);
              }
            }
          });

          // This will only ever pass after an error has occurred via the poll ajax procedure.
          if (reconnecting && raiseReconnect === true) {
            // We wait to reconnect depending on how many times we've failed to reconnect.
            // This is essentially a heuristic that will exponentially increase in wait time before
            // triggering reconnected.  This depends on the "error" handler of Poll to cancel this
            // timeout if it triggers before the Reconnected event fires.
            // The Math.min at the end is to ensure that the reconnect timeout does not overflow.
            privateData.reconnectTimeoutId = setTimeout(function() {
              fireReconnected(instance);
            }, Math.min(
              1000 * (Math.pow(2, reconnectErrors) - 1),
              maxFireReconnectedTimeout
            ));
          }
        })(connection);
      }, 250); // Have to delay initial poll so Chrome doesn't show loader spinner in tab
    },

    lostConnection: function(connection) {
      if (connection.pollXhr) {
        connection.pollXhr.abort("lostConnection");
      }
    },

    send: function(connection, data) {
      transportLogic.ajaxSend(connection, data);
    },

    stop: function(connection) {
      /// <summary>Stops the long polling connection</summary>
      /// <param name="connection" type="signalR">The SignalR connection to stop</param>

      clearTimeout(connection._.pollTimeoutId);
      clearTimeout(connection._.reconnectTimeoutId);

      delete connection._.pollTimeoutId;
      delete connection._.reconnectTimeoutId;

      if (connection.pollXhr) {
        connection.pollXhr.abort();
        connection.pollXhr = null;
        delete connection.pollXhr;
      }
    },

    abort: function(connection, async) {
      transportLogic.ajaxAbort(connection, async);
    }
  };
})(jQueryShim);
/* jquery.signalR.hubs.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/// <reference path="jquery.signalR.core.js" />

(function($, undefined) {
  var eventNamespace = ".hubProxy",
    signalR = $.signalR;

  function makeEventName(event) {
    return event + eventNamespace;
  }

  // Equivalent to Array.prototype.map
  function map(arr, fun, thisp) {
    var i,
      length = arr.length,
      result = [];
    for (i = 0; i < length; i += 1) {
      if (arr.hasOwnProperty(i)) {
        result[i] = fun.call(thisp, arr[i], i, arr);
      }
    }
    return result;
  }

  function getArgValue(a) {
    return $.isFunction(a) ? null : $.type(a) === "undefined" ? null : a;
  }

  function hasMembers(obj) {
    for (var key in obj) {
      // If we have any properties in our callback map then we have callbacks and can exit the loop via return
      if (obj.hasOwnProperty(key)) {
        return true;
      }
    }

    return false;
  }

  function clearInvocationCallbacks(connection, error) {
    /// <param name="connection" type="hubConnection" />
    var callbacks = connection._.invocationCallbacks,
      callback;

    if (hasMembers(callbacks)) {
      connection.log(
        "Clearing hub invocation callbacks with error: " + error + "."
      );
    }

    // Reset the callback cache now as we have a local var referencing it
    connection._.invocationCallbackId = 0;
    delete connection._.invocationCallbacks;
    connection._.invocationCallbacks = {};

    // Loop over the callbacks and invoke them.
    // We do this using a local var reference and *after* we've cleared the cache
    // so that if a fail callback itself tries to invoke another method we don't
    // end up with its callback in the list we're looping over.
    for (var callbackId in callbacks) {
      callback = callbacks[callbackId];
      callback.method.call(callback.scope, { E: error });
    }
  }

  // hubProxy
  function hubProxy(hubConnection, hubName) {
    /// <summary>
    ///     Creates a new proxy object for the given hub connection that can be used to invoke
    ///     methods on server hubs and handle client method invocation requests from the server.
    /// </summary>
    return new hubProxy.fn.init(hubConnection, hubName);
  }

  hubProxy.fn = hubProxy.prototype = {
    init: function(connection, hubName) {
      this.state = {};
      this.connection = connection;
      this.hubName = hubName;
      this._ = {
        callbackMap: {}
      };
    },

    constructor: hubProxy,

    hasSubscriptions: function() {
      return hasMembers(this._.callbackMap);
    },

    on: function(eventName, callback) {
      /// <summary>Wires up a callback to be invoked when a invocation request is received from the server hub.</summary>
      /// <param name="eventName" type="String">The name of the hub event to register the callback for.</param>
      /// <param name="callback" type="Function">The callback to be invoked.</param>
      var that = this,
        callbackMap = that._.callbackMap;

      // Normalize the event name to lowercase
      eventName = eventName.toLowerCase();

      // If there is not an event registered for this callback yet we want to create its event space in the callback map.
      if (!callbackMap[eventName]) {
        callbackMap[eventName] = {};
      }

      // Map the callback to our encompassed function
      callbackMap[eventName][callback] = function(e, data) {
        callback.apply(that, data);
      };

      $(that).bind(makeEventName(eventName), callbackMap[eventName][callback]);

      return that;
    },

    off: function(eventName, callback) {
      /// <summary>Removes the callback invocation request from the server hub for the given event name.</summary>
      /// <param name="eventName" type="String">The name of the hub event to unregister the callback for.</param>
      /// <param name="callback" type="Function">The callback to be invoked.</param>
      var that = this,
        callbackMap = that._.callbackMap,
        callbackSpace;

      // Normalize the event name to lowercase
      eventName = eventName.toLowerCase();

      callbackSpace = callbackMap[eventName];

      // Verify that there is an event space to unbind
      if (callbackSpace) {
        // Only unbind if there's an event bound with eventName and a callback with the specified callback
        if (callbackSpace[callback]) {
          $(that).unbind(makeEventName(eventName), callbackSpace[callback]);

          // Remove the callback from the callback map
          delete callbackSpace[callback];

          // Check if there are any members left on the event, if not we need to destroy it.
          if (!hasMembers(callbackSpace)) {
            delete callbackMap[eventName];
          }
        } else if (!callback) {
          // Check if we're removing the whole event and we didn't error because of an invalid callback
          $(that).unbind(makeEventName(eventName));

          delete callbackMap[eventName];
        }
      }

      return that;
    },

    invoke: function(methodName) {
      /// <summary>Invokes a server hub method with the given arguments.</summary>
      /// <param name="methodName" type="String">The name of the server hub method.</param>

      var that = this,
        connection = that.connection,
        args = $.makeArray(arguments).slice(1),
        argValues = map(args, getArgValue),
        data = {
          H: that.hubName,
          M: methodName,
          A: argValues,
          I: connection._.invocationCallbackId
        },
        d = $.Deferred(),
        callback = function(minResult) {
          var result = that._maximizeHubResponse(minResult),
            source,
            error;

          // Update the hub state
          $.extend(that.state, result.State);

          if (result.Progress) {
            if (d.notifyWith) {
              // Progress is only supported in jQuery 1.7+
              d.notifyWith(that, [result.Progress.Data]);
            } else if (!connection._.progressjQueryVersionLogged) {
              connection.log(
                "A hub method invocation progress update was received but the version of jQuery in use (" +
                  $.prototype.jquery +
                  ") does not support progress updates. Upgrade to jQuery 1.7+ to receive progress notifications."
              );
              connection._.progressjQueryVersionLogged = true;
            }
          } else if (result.Error) {
            // Server hub method threw an exception, log it & reject the deferred
            if (result.StackTrace) {
              connection.log(result.Error + "\n" + result.StackTrace + ".");
            }

            // result.ErrorData is only set if a HubException was thrown
            source = result.IsHubException ? "HubException" : "Exception";
            error = signalR._.error(result.Error, source);
            error.data = result.ErrorData;

            connection.log(
              that.hubName +
                "." +
                methodName +
                " failed to execute. Error: " +
                error.message
            );
            d.rejectWith(that, [error]);
          } else {
            // Server invocation succeeded, resolve the deferred
            connection.log("Invoked " + that.hubName + "." + methodName);
            d.resolveWith(that, [result.Result]);
          }
        };

      connection._.invocationCallbacks[
        connection._.invocationCallbackId.toString()
      ] = { scope: that, method: callback };
      connection._.invocationCallbackId += 1;

      if (!$.isEmptyObject(that.state)) {
        data.S = that.state;
      }

      connection.log("Invoking " + that.hubName + "." + methodName);
      connection.send(data);

      return d.promise();
    },

    _maximizeHubResponse: function(minHubResponse) {
      return {
        State: minHubResponse.S,
        Result: minHubResponse.R,
        Progress: minHubResponse.P
          ? {
              Id: minHubResponse.P.I,
              Data: minHubResponse.P.D
            }
          : null,
        Id: minHubResponse.I,
        IsHubException: minHubResponse.H,
        Error: minHubResponse.E,
        StackTrace: minHubResponse.T,
        ErrorData: minHubResponse.D
      };
    }
  };

  hubProxy.fn.init.prototype = hubProxy.fn;

  // hubConnection
  function hubConnection(url, options) {
    /// <summary>Creates a new hub connection.</summary>
    /// <param name="url" type="String">[Optional] The hub route url, defaults to "/signalr".</param>
    /// <param name="options" type="Object">[Optional] Settings to use when creating the hubConnection.</param>
    var settings = {
      qs: null,
      logging: false,
      useDefaultPath: true
    };

    $.extend(settings, options);

    if (!url || settings.useDefaultPath) {
      url = (url || "") + "/signalr";
    }
    return new hubConnection.fn.init(url, settings);
  }

  hubConnection.fn = hubConnection.prototype = $.connection();

  hubConnection.fn.init = function(url, options) {
    var settings = {
        qs: null,
        logging: false,
        useDefaultPath: true
      },
      connection = this;

    $.extend(settings, options);

    // Call the base constructor
    $.signalR.fn.init.call(connection, url, settings.qs, settings.logging);

    // Object to store hub proxies for this connection
    connection.proxies = {};

    connection._.invocationCallbackId = 0;
    connection._.invocationCallbacks = {};

    // Wire up the received handler
    connection.received(function(minData) {
      var data, proxy, dataCallbackId, callback, hubName, eventName;
      if (!minData) {
        return;
      }

      // We have to handle progress updates first in order to ensure old clients that receive
      // progress updates enter the return value branch and then no-op when they can't find
      // the callback in the map (because the minData.I value will not be a valid callback ID)
      if (typeof minData.P !== "undefined") {
        // Process progress notification
        dataCallbackId = minData.P.I.toString();
        callback = connection._.invocationCallbacks[dataCallbackId];
        if (callback) {
          callback.method.call(callback.scope, minData);
        }
      } else if (typeof minData.I !== "undefined") {
        // We received the return value from a server method invocation, look up callback by id and call it
        dataCallbackId = minData.I.toString();
        callback = connection._.invocationCallbacks[dataCallbackId];
        if (callback) {
          // Delete the callback from the proxy
          connection._.invocationCallbacks[dataCallbackId] = null;
          delete connection._.invocationCallbacks[dataCallbackId];

          // Invoke the callback
          callback.method.call(callback.scope, minData);
        }
      } else {
        data = this._maximizeClientHubInvocation(minData);

        // We received a client invocation request, i.e. broadcast from server hub
        connection.log(
          "Triggering client hub event '" +
            data.Method +
            "' on hub '" +
            data.Hub +
            "'."
        );

        // Normalize the names to lowercase
        hubName = data.Hub.toLowerCase();
        eventName = data.Method.toLowerCase();

        // Trigger the local invocation event
        proxy = this.proxies[hubName];

        // Update the hub state
        $.extend(proxy.state, data.State);
        $(proxy).triggerHandler(makeEventName(eventName), [data.Args]);
      }
    });

    connection.error(function(errData, origData) {
      var callbackId, callback;

      if (!origData) {
        // No original data passed so this is not a send error
        return;
      }

      callbackId = origData.I;
      callback = connection._.invocationCallbacks[callbackId];

      // Verify that there is a callback bound (could have been cleared)
      if (callback) {
        // Delete the callback
        connection._.invocationCallbacks[callbackId] = null;
        delete connection._.invocationCallbacks[callbackId];

        // Invoke the callback with an error to reject the promise
        callback.method.call(callback.scope, { E: errData });
      }
    });

    connection.reconnecting(function() {
      if (connection.transport && connection.transport.name === "webSockets") {
        clearInvocationCallbacks(
          connection,
          "Connection started reconnecting before invocation result was received."
        );
      }
    });

    connection.disconnected(function() {
      clearInvocationCallbacks(
        connection,
        "Connection was disconnected before invocation result was received."
      );
    });
  };

  hubConnection.fn._maximizeClientHubInvocation = function(
    minClientHubInvocation
  ) {
    return {
      Hub: minClientHubInvocation.H,
      Method: minClientHubInvocation.M,
      Args: minClientHubInvocation.A,
      State: minClientHubInvocation.S
    };
  };

  hubConnection.fn._registerSubscribedHubs = function() {
    /// <summary>
    ///     Sets the starting event to loop through the known hubs and register any new hubs
    ///     that have been added to the proxy.
    /// </summary>
    var connection = this;

    if (!connection._subscribedToHubs) {
      connection._subscribedToHubs = true;
      connection.starting(function() {
        // Set the connection's data object with all the hub proxies with active subscriptions.
        // These proxies will receive notifications from the server.
        var subscribedHubs = [];

        $.each(connection.proxies, function(key) {
          if (this.hasSubscriptions()) {
            subscribedHubs.push({ name: key });
            connection.log("Client subscribed to hub '" + key + "'.");
          }
        });

        if (subscribedHubs.length === 0) {
          connection.log(
            "No hubs have been subscribed to.  The client will not receive data from hubs.  To fix, declare at least one client side function prior to connection start for each hub you wish to subscribe to."
          );
        }

        connection.data = connection.json.stringify(subscribedHubs);
      });
    }
  };

  hubConnection.fn.createHubProxy = function(hubName) {
    /// <summary>
    ///     Creates a new proxy object for the given hub connection that can be used to invoke
    ///     methods on server hubs and handle client method invocation requests from the server.
    /// </summary>
    /// <param name="hubName" type="String">
    ///     The name of the hub on the server to create the proxy for.
    /// </param>

    // Normalize the name to lowercase
    hubName = hubName.toLowerCase();

    var proxy = this.proxies[hubName];
    if (!proxy) {
      proxy = hubProxy(this, hubName);
      this.proxies[hubName] = proxy;
    }

    this._registerSubscribedHubs();

    return proxy;
  };

  hubConnection.fn.init.prototype = hubConnection.fn;

  $.hubConnection = hubConnection;
})(jQueryShim);
/* jquery.signalR.version.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/// <reference path="jquery.signalR.core.js" />
(function($) {
  $.signalR.version = "2.2.1";
})(jQueryShim);

module.exports.hubConnection = jQueryShim.hubConnection;
module.exports.signalR = jQueryShim.signalR;
