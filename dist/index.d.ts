/// <reference types="@types/signalr" />

declare module "signalr-webworker" {
  export const signalR: SignalR;
  export const hubConnection: SignalR.Hub.HubCreator;
}
