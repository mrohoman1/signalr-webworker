# signalr-webworker

## Original version
Original (https://github.com/trutoo/signalr-webworker)

## SignalR JS Client with shimmed jQuery not polluting global namespace

jQuery shim borrowed from [react-native-signalR](https://github.com/olofd/react-native-signalr)

This version of signalR client doesn't add jQuery to `window` object but imports jQueryShim locally to signalR and exports `hubConnection`.
jQueryShim file contains only bare-minimum of jQuery to make signalR client run.

This package is not meant to be used with ASP.NET Core version of SignalR

### Usage

npm i -D signalr-webworker


#### ES6 Loader


```javascript
import { hubConnection } from 'signalr-webworker';
```

#### HTML

Use just like regular signalR but without $ namespace

```javascript
const connection = hubConnection('http://[address]:[port]', options);
const hubProxy = connection.createHubProxy('hubNameString');

// set up event listeners i.e. for incoming "message" event
hubProxy.on('message', function(message) {
    console.log(message);
});

// connect
connection.start({ jsonp: true })
.done(function(){ console.log('Now connected, connection ID=' + connection.id); })
.fail(function(){ console.log('Could not connect'); });

```

### Problems

Feel free to create pull requests and raise issues https://github.com/trutoo/signalr-webworker/issues

### Credit

[![SignalR Team](https://avatars1.githubusercontent.com/u/931666?s=64)](https://github.com/SignalR)  
for the [original codebase](https://github.com/SignalR/SignalR)

[![DVLP](https://avatars2.githubusercontent.com/u/5261364?s=64)](https://github.com/DVLP)  
for [signalr without jquery](https://github.com/DVLP/signalr-no-jquery)